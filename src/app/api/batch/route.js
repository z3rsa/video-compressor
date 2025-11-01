import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";

/* Dirs */
const tempDir = path.join(process.cwd(), "temp");
const inputDir = path.join(process.cwd(), "input");
[tempDir, inputDir].forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

/* Policy */
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB per file
const ACCEPTED_OUTPUTS = ["mp4", "webm", "mkv"];
const ACCEPTED_INPUTS = ["mp4", "mov", "mkv", "webm", "avi", "wmv", "flv", "m4v"];

export async function POST(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll("files"); // unified name
        const format = (formData.get("format") || "mp4").toLowerCase();
        const preset = (formData.get("preset") || "custom").toLowerCase();
        const sizeMb = parseFloat(formData.get("size")) || 0;

        const preserveMetadata = (formData.get("preserveMetadata") || "").toString() === "true";
        const preserveSubtitles = (formData.get("preserveSubtitles") || "").toString() === "true";
        const enhancement = (formData.get("enhancement") || "none").toLowerCase();

        if (!files?.length) return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
        if (!ACCEPTED_OUTPUTS.includes(format)) return NextResponse.json({ message: `Unsupported format: ${format}` }, { status: 400 });

        const { container, videoCodec, audioCodec, audioBitrateKbps, extraFlags } = resolveTranscodeProfile(format);
        const cappedSizeMb = applyPresetCap(preset, sizeMb);

        const processed = [];
        for (const file of files) {
            if (!file || typeof file.name !== "string") return NextResponse.json({ message: "Invalid file payload" }, { status: 400 });
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ message: `File size exceeds ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))} MB` }, { status: 400 });
            }

            const inputExt = path.extname(file.name).toLowerCase().replace(".", "");
            if (!ACCEPTED_INPUTS.includes(inputExt)) {
                return NextResponse.json({ message: `Unsupported input type: .${inputExt}` }, { status: 400 });
            }

            // Save upload
            const inputPath = path.join(inputDir, `${uuidv4()}.${inputExt}`);
            const buffer = Buffer.from(await file.arrayBuffer());
            await writeFile(inputPath, buffer);

            // Probe duration
            const durationSec = await probeDurationSeconds(inputPath);
            if (!Number.isFinite(durationSec) || durationSec <= 0) {
                safeUnlink(inputPath);
                return NextResponse.json({ message: "Failed to read video duration." }, { status: 400 });
            }

            // Size targeting
            const targetBytes = Math.max(1, Math.floor(cappedSizeMb * 1024 * 1024));
            const videoBitrateKbps = calcVideoBitrateKbps(targetBytes, durationSec, audioBitrateKbps);

            // Output path
            const outputName = `${uuidv4()}-output.${container}`;
            const outputPath = path.join(tempDir, outputName);

            const cmd = buildFFmpeg({
                inputPath,
                outputPath,
                videoCodec,
                audioCodec,
                videoBitrateKbps,
                audioBitrateKbps,
                preserveMetadata,
                preserveSubtitles,
                enhancement,
                extraFlags,
                container,
            });

            await execPromise(cmd);

            const outSize = fs.statSync(outputPath).size;
            safeUnlink(inputPath);

            processed.push({
                name: outputName,
                size: outSize,
                date: new Date().toISOString(),
                downloadUrl: `/api/download/${encodeURIComponent(outputName)}`,
            });
        }

        return NextResponse.json({ message: "Batch processing completed successfully!", files: processed }, { status: 200 });
    } catch (err) {
        console.error("Error during batch processing:", err);
        return NextResponse.json({ message: "Error during batch processing" }, { status: 500 });
    }
}

/* ---------- helpers ---------- */

function resolveTranscodeProfile(format) {
    switch (format) {
        case "webm":
            return { container: "webm", videoCodec: "libvpx-vp9", audioCodec: "libopus", audioBitrateKbps: 96, extraFlags: ["-row-mt", "1"] };
        case "mkv":
            return { container: "mkv", videoCodec: "libx264", audioCodec: "aac", audioBitrateKbps: 96, extraFlags: [] };
        case "mp4":
        default:
            return { container: "mp4", videoCodec: "libx264", audioCodec: "aac", audioBitrateKbps: 96, extraFlags: [] };
    }
}

function applyPresetCap(preset, sizeMb) {
    if (preset === "discord") return Math.min(10, sizeMb || 10);
    if (preset === "twitter") return Math.min(15, sizeMb || 15);
    if (preset === "whatsapp") return Math.min(16, sizeMb || 16);
    return Math.max(1, sizeMb || 25);
}

async function writeFile(dest, buffer) {
    await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(dest);
        ws.on("error", reject);
        ws.on("finish", resolve);
        ws.end(buffer);
    });
}

function safeUnlink(p) { try { fs.unlinkSync(p); } catch { } }

async function probeDurationSeconds(filePath) {
    const cmd1 = `ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${filePath}"`;
    const out1 = await execCapture(cmd1);
    const v1 = parseFloat(String(out1).trim());
    if (Number.isFinite(v1)) return v1;
    const cmd2 = `ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nk=1:nw=1 "${filePath}"`;
    const out2 = await execCapture(cmd2);
    const v2 = parseFloat(String(out2).trim());
    return Number.isFinite(v2) ? v2 : 0;
}

function calcVideoBitrateKbps(targetBytes, durationSec, audioKbps) {
    const audioBits = Math.max(0, Math.floor(audioKbps * 1000 * durationSec));
    const totalBits = Math.max(8, targetBytes * 8);
    const videoBits = Math.max(0, totalBits - audioBits);
    const kbps = Math.floor(videoBits / durationSec / 1000);
    return Math.max(100, Math.min(kbps, 50000));
}

function buildFFmpeg({
    inputPath, outputPath,
    videoCodec, audioCodec,
    videoBitrateKbps, audioBitrateKbps,
    preserveMetadata, preserveSubtitles,
    enhancement, extraFlags, container,
}) {
    const args = ["-y", "-i", `"${inputPath}"`];

    // Video codec + portable, size-targeted RC (single-pass with VBV)
    args.push("-c:v", videoCodec);
    if (videoCodec === "libx264") {
        args.push("-crf", "23", "-preset", "slow", "-maxrate", `${videoBitrateKbps}k`, "-bufsize", `${videoBitrateKbps * 2}k`, "-pix_fmt", "yuv420p");
        if (container === "mp4") args.push("-movflags", "+faststart");
    } else if (videoCodec === "libvpx-vp9") {
        args.push("-b:v", `${videoBitrateKbps}k`, "-maxrate", `${videoBitrateKbps}k`, "-bufsize", `${videoBitrateKbps * 2}k`, "-row-mt", "1", "-pix_fmt", "yuv420p");
    }

    // Audio
    args.push("-c:a", audioCodec, "-b:a", `${audioBitrateKbps}k`);

    // Preserve
    if (preserveMetadata) args.push("-map_metadata", "0");
    if (preserveSubtitles) args.push("-c:s", "copy");

    // Enhancement
    const vf = [];
    if (enhancement === "noise-reduction") vf.push("hqdn3d");
    if (enhancement === "sharpness") vf.push("unsharp");
    if (vf.length) args.push("-vf", `"${vf.join(",")}"`);

    // Extra
    if (Array.isArray(extraFlags) && extraFlags.length) args.push(...extraFlags);

    args.push(`"${outputPath}"`);
    return `ffmpeg ${args.join(" ")}`;
}

function execPromise(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err) => (err ? reject(err) : resolve()));
    });
}
function execCapture(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout) => (err ? reject(err) : resolve(stdout)));
    });
}
