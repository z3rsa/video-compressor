import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import os from "os";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    // Use env vars set in Docker
    const rembgBin = (process.env.REMBG_BIN || "rembg").trim();
    const modelsDir = process.env.U2NET_HOME || path.join(os.homedir(), ".u2net");

    try {
        const result = spawnSync(rembgBin, ["--version"], {
            shell: false,
            env: { ...process.env, U2NET_HOME: modelsDir },
            encoding: "utf8",
        });

        if (result.error) {
            return NextResponse.json(
                {
                    ok: false,
                    message: `Failed to spawn rembg: ${result.error.message}`,
                    modelsDir,
                },
                { status: 500 }
            );
        }

        if (result.status === 0) {
            return NextResponse.json({
                ok: true,
                version: (result.stdout || result.stderr || "").trim(),
                binary: rembgBin,
                modelsDir,
            });
        }

        return NextResponse.json(
            {
                ok: false,
                message: `rembg exited with code ${result.status}`,
                stderr: result.stderr,
                modelsDir,
            },
            { status: 500 }
        );
    } catch (err) {
        return NextResponse.json(
            { ok: false, message: `Exception: ${err.message}`, modelsDir },
            { status: 500 }
        );
    }
}
