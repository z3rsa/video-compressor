import { NextResponse } from "next/server";
import { spawn } from "child_process";
import os from "os";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PY = process.env.PYTHON_BIN || "/opt/pyenv/bin/python";
const HELPER = process.env.REMBG_HELPER || "/opt/pyenv/bin/rembg_pipe.py";
const MODELS_DIR = process.env.U2NET_HOME || path.join(os.homedir(), ".u2net");

async function runHelper(args, inputBuffer) {
    return await new Promise((resolve) => {
        const child = spawn(PY, [HELPER, ...args], {
            stdio: ["pipe", "pipe", "pipe"],
            shell: false,
            env: { ...process.env, U2NET_HOME: MODELS_DIR },
        });

        const out = [];
        const err = [];
        child.stdout.on("data", (d) => out.push(d));
        child.stderr.on("data", (d) => err.push(d));
        child.on("error", (e) => resolve({ ok: false, error: new Error(`spawn error: ${e.message}`) }));
        child.on("close", (code) => {
            if (code === 0) resolve({ ok: true, buffer: Buffer.concat(out) });
            else resolve({ ok: false, error: new Error(Buffer.concat(err).toString() || `exit ${code}`) });
        });

        child.stdin.write(inputBuffer);
        child.stdin.end();
    });
}

export async function POST(req) {
    try {
        const form = await req.formData();
        const file = form.get("file");
        if (!file) {
            return NextResponse.json({ message: "Please attach an image file (field: file)." }, { status: 400 });
        }

        // Options from UI
        const model = (form.get("model") || "auto").toString().trim();
        const returnMask = (form.get("returnMask") || "").toString() === "true";
        const alphaMatting = (form.get("alphaMatting") || "").toString() === "true";

        const inputBuffer = Buffer.from(await file.arrayBuffer());

        const args = [];
        if (model && model !== "auto") args.push("--model", model);
        if (alphaMatting) args.push("--alpha-matting");
        if (returnMask) args.push("--only-mask");

        const res = await runHelper(args, inputBuffer);
        if (!res.ok) {
            return NextResponse.json({ message: `rembg failed: ${res.error.message}` }, { status: 500 });
        }

        return new NextResponse(res.buffer, {
            status: 200,
            headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
        });
    } catch (e) {
        console.error("remove-bg error:", e);
        return NextResponse.json({ message: "Internal error" }, { status: 500 });
    }
}
