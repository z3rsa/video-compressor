import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import os from "os";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const modelsDir = process.env.U2NET_HOME || path.join(os.homedir(), ".u2net");
    const candidates = [];
    if (process.env.REMBG_BIN && process.env.REMBG_BIN.trim()) candidates.push({ label: "REMBG_BIN", cmd: process.env.REMBG_BIN.trim(), shell: true });
    candidates.push({ label: "rembg", cmd: "rembg", shell: false });
    if (process.platform === "win32") {
        candidates.push({ label: "py -m rembg.cli", cmd: "py -m rembg.cli", shell: true });
        candidates.push({ label: "python -m rembg.cli", cmd: "python -m rembg.cli", shell: true });
    } else {
        candidates.push({ label: "python3 -m rembg.cli", cmd: "python3 -m rembg.cli", shell: true });
        candidates.push({ label: "python -m rembg.cli", cmd: "python -m rembg.cli", shell: true });
    }

    const tried = [];
    for (const c of candidates) {
        tried.push(c.label);
        const p = spawnSync(c.cmd, ["--version"], {
            shell: c.shell,
            env: { ...process.env, U2NET_HOME: modelsDir },
            encoding: "utf8",
        });
        if (p.status === 0) {
            return NextResponse.json({
                ok: true,
                launcher: c.label,
                version: (p.stdout || p.stderr || "").trim(),
                modelsDir,
            });
        }
    }
    return NextResponse.json({ ok: false, tried, message: "Could not run rembg. Check REMBG_BIN / PATH." }, { status: 500 });
}
