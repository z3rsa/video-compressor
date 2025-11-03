import { NextResponse } from "next/server";
import { spawn } from "child_process";
import os from "os";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use a predictable, writable models dir (mounted in Docker: /data/u2net)
const MODELS_DIR = process.env.U2NET_HOME || path.join(os.homedir(), ".u2net");

// Prefer explicit REMBG_BIN (e.g., "rembg"), then fallbacks.
// In Docker we set REMBG_BIN=rembg and PATH includes /opt/pyenv/bin.
function candidateCommands() {
    const list = [];
    if (process.env.REMBG_BIN && process.env.REMBG_BIN.trim()) {
        list.push({ label: "REMBG_BIN", cmd: process.env.REMBG_BIN.trim(), shell: true });
    }
    list.push({ label: "rembg", cmd: "rembg", shell: false });
    if (process.platform === "win32") {
        list.push({ label: "py -m rembg.cli", cmd: "py -m rembg.cli", shell: true });
        list.push({ label: "python -m rembg.cli", cmd: "python -m rembg.cli", shell: true });
    } else {
        list.push({ label: "python3 -m rembg.cli", cmd: "python3 -m rembg.cli", shell: true });
        list.push({ label: "python -m rembg.cli", cmd: "python -m rembg.cli", shell: true });
    }
    return list;
}

async function runRembg(args, inputBuffer) {
    const tries = candidateCommands();
    let lastErr = null;
    const tried = [];

    for (const c of tries) {
        tried.push(c.label);
        try {
            const child = spawn(c.cmd, args, {
                stdio: ["pipe", "pipe", "pipe"],
                shell: c.shell,
                env: { ...process.env, U2NET_HOME: MODELS_DIR },
            });
            if (inputBuffer) {
                child.stdin.write(inputBuffer);
                child.stdin.end();
            }
            const outChunks = [];
            const errChunks = [];
            child.stdout.on("data", d => outChunks.push(d));
            child.stderr.on("data", d => errChunks.push(d));
            const code = await new Promise(res => child.on("close", res));
            if (code === 0) return { ok: true, buffer: Buffer.concat(outChunks) };
            lastErr = new Error(Buffer.concat(errChunks).toString() || `exit ${code}`);
        } catch (e) {
            lastErr = e;
        }
    }
    return {
        ok: false,
        error: new Error(`${lastErr?.message || lastErr} (Tried: ${tried.join(" | ")})`),
    };
}

export async function POST(req) {
    try {
        const form = await req.formData();
        const file = form.get("file");
        if (!file) {
            return NextResponse.json({ message: "Please attach an image file (field: file)." }, { status: 400 });
        }

        // Optional params coming from your page
        const model = (form.get("model") || "auto").toString().trim();   // "auto" means don't pass -m
        const returnMask = (form.get("returnMask") || "").toString() === "true";
        const alphaMatting = (form.get("alphaMatting") || "").toString() === "true";

        const inputBuffer = Buffer.from(await file.arrayBuffer());

        // Build rembg CLI args: stdin -> stdout
        const args = ["i"];
        if (model && model !== "auto") args.push("-m", model);
        if (returnMask) args.push("-om");
        if (alphaMatting) args.push("-a");
        args.push("-", "-");

        const res = await runRembg(args, inputBuffer);
        if (!res.ok) {
            return NextResponse.json({ message: `rembg failed: ${res.error.message}` }, { status: 500 });
        }

        return new NextResponse(res.buffer, {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store",
            },
        });
    } catch (e) {
        console.error("remove-bg error:", e);
        return NextResponse.json({ message: "Internal error" }, { status: 500 });
    }
}
