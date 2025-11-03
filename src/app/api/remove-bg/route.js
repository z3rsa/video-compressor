import { NextResponse } from "next/server";
import { spawn } from "child_process";
import os from "os";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use the working rembg binary *only*
const REMBG = (process.env.REMBG_BIN || "rembg").trim();
// Where models are cached (make sure this is writable in Docker)
const MODELS_DIR = process.env.U2NET_HOME || path.join(os.homedir(), ".u2net");

// Run rembg with bytes on stdin and PNG on stdout
async function runRembgDirect(args, inputBuffer) {
    return await new Promise((resolve) => {
        const child = spawn(REMBG, args, {
            stdio: ["pipe", "pipe", "pipe"],
            shell: false, // IMPORTANT: call the binary directly
            env: { ...process.env, U2NET_HOME: MODELS_DIR },
        });

        const out = [];
        const err = [];
        child.stdout.on("data", (d) => out.push(d));
        child.stderr.on("data", (d) => err.push(d));

        child.on("error", (e) => {
            resolve({ ok: false, error: new Error(`spawn error: ${e.message}`) });
        });

        child.on("close", (code) => {
            if (code === 0) {
                resolve({ ok: true, buffer: Buffer.concat(out) });
            } else {
                resolve({
                    ok: false,
                    error: new Error(Buffer.concat(err).toString() || `exit ${code}`),
                });
            }
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
            return NextResponse.json(
                { message: "Please attach an image file (field: file)." },
                { status: 400 }
            );
        }

        // Options from UI (keep defaults simple)
        const model = (form.get("model") || "auto").toString().trim(); // "auto" means don't pass -m
        const returnMask = (form.get("returnMask") || "").toString() === "true";
        const alphaMatting = (form.get("alphaMatting") || "").toString() === "true";

        const inputBuffer = Buffer.from(await file.arrayBuffer());

        // Build rembg CLI args: stdin -> stdout
        const args = ["i"];
        if (model && model !== "auto") args.push("-m", model);
        if (returnMask) args.push("-om");
        if (alphaMatting) args.push("-a");
        args.push("-", "-");

        const res = await runRembgDirect(args, inputBuffer);
        if (!res.ok) {
            return NextResponse.json(
                { message: `rembg failed: ${res.error.message}` },
                { status: 500 }
            );
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
