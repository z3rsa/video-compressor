import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import os from "os";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1x1 transparent PNG
const TINY = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAA" +
    "AAC0lEQVR42mP8z8AABQMBgZp6f1kAAAAASUVORK5CYII=", "base64"
);

export async function GET() {
    const py = process.env.PYTHON_BIN || "/opt/pyenv/bin/python";
    const helper = process.env.REMBG_HELPER || "/opt/pyenv/bin/rembg_pipe.py";
    const modelsDir = process.env.U2NET_HOME || path.join(os.homedir(), ".u2net");
    try {
        const res = spawnSync(py, [helper], {
            shell: false,
            env: { ...process.env, U2NET_HOME: modelsDir },
            input: TINY,
            encoding: "binary",
            timeout: 15000,
            maxBuffer: 10 * 1024 * 1024,
        });
        if (res.error) {
            return NextResponse.json({ ok: false, step: "spawn", message: res.error.message, modelsDir }, { status: 500 });
        }
        const ok = res.status === 0 && res.stdout && res.stdout.length > 0;
        if (ok) {
            const sig = Buffer.from(res.stdout, "binary").slice(0, 8).toString("hex");
            return NextResponse.json({
                ok: true,
                result: sig === "89504e470d0a1a0a" ? "PNG_OK" : "BYTES_OK",
                bytes: Buffer.byteLength(res.stdout, "binary"),
                modelsDir,
            });
        }
        return NextResponse.json({ ok: false, step: "exec", code: res.status, stderr: res.stderr?.toString?.() || "", modelsDir }, { status: 500 });
    } catch (e) {
        return NextResponse.json({ ok: false, step: "exception", message: e.message, modelsDir }, { status: 500 });
    }
}
