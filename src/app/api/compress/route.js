import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

/* ------------ dirs ------------ */

const tempDir = path.join(process.cwd(), 'temp');   // where outputs go
const inputDir = path.join(process.cwd(), 'input'); // where uploads are written
[tempDir, inputDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ------------ config ------------ */

const ACCEPTED_FORMATS = ['mp4', 'webm', 'av1'];     // client format options
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;       // 5 GB per file

/* ------------ http ------------ */

export async function POST(request) {
    try {
        const formData = await request.formData();

        // payload from client
        const files = formData.getAll('files'); // Array<File>
        const format = (formData.get('format') || 'mp4').toLowerCase();
        const preset = (formData.get('preset') || 'custom').toLowerCase();
        const sizeMb = parseFloat(formData.get('size')) || 0;

        const preserveMetadata = formData.get('preserveMetadata') === 'true';
        const preserveSubtitles = formData.get('preserveSubtitles') === 'true';
        const enhancement = (formData.get('enhancement') || 'none').toLowerCase();

        const trimStart = Math.max(0, Math.floor(parseFloat(formData.get('trimStart')) || 0));
        const trimEnd = Math.max(0, Math.floor(parseFloat(formData.get('trimEnd')) || 0));

        // NEW: optional custom output name from client
        const customNameRaw = (formData.get('customName') || '').trim();

        // validations
        if (!files.length) {
            return NextResponse.json({ message: 'No files uploaded.' }, { status: 400 });
        }
        if (!ACCEPTED_FORMATS.includes(format)) {
            return NextResponse.json({ message: `Unsupported format: ${format}` }, { status: 400 });
        }

        const { container, videoCodec, audioCodec, audioBitrateKbps, extraFlags } =
            resolveTranscodeProfile(format);

        const cappedSizeMb = applyPresetCap(preset, sizeMb);

        const results = [];

        for (const [index, file] of files.entries()) {
            if (!file || typeof file.name !== 'string') {
                return NextResponse.json({ message: 'Invalid file payload.' }, { status: 400 });
            }
            if (file.size > MAX_FILE_SIZE) {
                const lim = Math.floor(MAX_FILE_SIZE / (1024 * 1024));
                return NextResponse.json({ message: `File exceeds ${lim} MB limit.` }, { status: 400 });
            }

            // input validation
            const inputExt = path.extname(file.name).toLowerCase().replace('.', '');
            const allowedInput = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'wmv', 'flv', 'm4v'];
            if (!allowedInput.includes(inputExt)) {
                return NextResponse.json({ message: `Unsupported input type: .${inputExt}` }, { status: 400 });
            }

            // write upload to disk
            const inputPath = path.join(inputDir, `${uuidv4()}.${inputExt}`);
            const buffer = Buffer.from(await file.arrayBuffer());
            await writeFileStream(inputPath, buffer);

            // get duration (seconds)
            const durationSec = await probeDurationSeconds(inputPath);
            if (!Number.isFinite(durationSec) || durationSec <= 0) {
                safeUnlink(inputPath);
                return NextResponse.json(
                    { message: 'Failed to read video duration (file may be corrupted/unsupported).' },
                    { status: 400 }
                );
            }

            // trim validation
            if ((trimStart && !trimEnd) || (!trimStart && trimEnd)) {
                safeUnlink(inputPath);
                return NextResponse.json(
                    { message: 'Both trimStart and trimEnd must be provided to trim.' },
                    { status: 400 }
                );
            }
            if (trimStart && trimEnd && (trimStart >= trimEnd || trimEnd > durationSec)) {
                safeUnlink(inputPath);
                return NextResponse.json(
                    { message: 'Invalid trim range. Ensure trimEnd > trimStart and within duration.' },
                    { status: 400 }
                );
            }

            const effectiveDuration = trimEnd ? (trimEnd - trimStart) : durationSec;

            // bitrate targeting for requested size
            const targetBytes = Math.max(1, Math.floor(cappedSizeMb * 1024 * 1024));
            const videoBitrateKbps = calculateBitrateKbps(targetBytes, effectiveDuration, audioBitrateKbps);

            // ---- output naming ----
            const originalBase = baseName(file.name);
            const ts = new Date().toISOString().replace(/[:.]/g, '-');

            // sanitize user-provided name; if multiple files and one custom name is supplied, suffix with index
            const safeCustom = sanitizeBase(customNameRaw);
            const proposedBase =
                safeCustom
                    ? (files.length > 1 ? `${safeCustom}_${index + 1}` : safeCustom)
                    : // fallback: Vicom {index} OR Vicom {metadata}
                    (files.length > 1
                        ? `Vicom_${index + 1}`
                        : `Vicom_${sanitizeBase(originalBase) || 'file'}_${ts}`);

            const outFileName = await uniqueFileName(tempDir, `${proposedBase}.${container}`);
            const outputPath = path.join(tempDir, outFileName);

            // build & exec ffmpeg
            const ffmpegCmd = buildFFmpegCommand({
                inputPath,
                outputPath,
                trimStart,
                trimEnd,
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

            await execPromise(ffmpegCmd);

            // cleanup input
            safeUnlink(inputPath);

            results.push({
                name: path.basename(outputPath),
                downloadUrl: `/api/download/${encodeURIComponent(path.basename(outputPath))}`,
            });
        }

        return NextResponse.json({
            message: files.length > 1 ? 'Videos compressed successfully!' : 'Video compressed successfully!',
            files: results,
        });
    } catch (error) {
        console.error('Compression error:', error);
        return NextResponse.json(
            { message: 'Error during compression. Please try again.' },
            { status: 500 }
        );
    }
}

/* ------------ helpers: naming ------------ */

function baseName(filename) {
    return String(filename || '')
        .replace(/[/\\]+/g, ' ')
        .replace(/\.[^/.]+$/, ''); // strip extension
}

function sanitizeBase(name) {
    return String(name || '')
        .normalize('NFKD')
        .replace(/[^\w\s.-]+/g, '') // allow letters/digits/space/dot/hyphen
        .replace(/\s{2,}/g, ' ')    // collapse multiple spaces to single
        .trim()
        .slice(0, 180);
}

async function uniqueFileName(dir, fileName) {
    const ext = path.extname(fileName);
    const base = fileName.slice(0, -ext.length);
    let candidate = fileName;
    let counter = 2;
    while (fs.existsSync(path.join(dir, candidate))) {
        candidate = `${base}-${counter}${ext}`;
        counter += 1;
    }
    return candidate;
}

/* ------------ helpers: ffmpeg ------------ */

function resolveTranscodeProfile(format) {
    switch (format) {
        case 'webm':
            return {
                container: 'webm',
                videoCodec: 'libvpx-vp9',
                audioCodec: 'libopus',
                audioBitrateKbps: 96,
                extraFlags: ['-row-mt', '1'], // multi-thread VP9
            };
        case 'av1':
            // AV1 in MP4 for broad compatibility
            return {
                container: 'mp4',
                videoCodec: 'libsvtav1',
                audioCodec: 'aac',
                audioBitrateKbps: 96,
                extraFlags: [],
            };
        case 'mp4':
        default:
            return {
                container: 'mp4',
                videoCodec: 'libx264',
                audioCodec: 'aac',
                audioBitrateKbps: 96,
                extraFlags: [],
            };
    }
}

function applyPresetCap(preset, sizeMb) {
    if (preset === 'discord') return Math.min(10, sizeMb || 10);
    if (preset === 'twitter') return Math.min(15, sizeMb || 15);
    if (preset === 'whatsapp') return Math.min(16, sizeMb || 16);
    return Math.max(1, sizeMb || 25); // default for custom
}

async function writeFileStream(destPath, buffer) {
    await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(destPath);
        ws.on('error', reject);
        ws.on('finish', resolve);
        ws.end(buffer);
    });
}

function safeUnlink(p) {
    try { fs.unlinkSync(p); } catch { }
}

async function probeDurationSeconds(filePath) {
    // Prefer container format duration
    const cmd1 = `ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${filePath}"`;
    const out1 = await execCapture(cmd1);
    const v1 = parseFloat(String(out1).trim());
    if (Number.isFinite(v1)) return v1;

    // Fallback to first video stream
    const cmd2 = `ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nk=1:nw=1 "${filePath}"`;
    const out2 = await execCapture(cmd2);
    const v2 = parseFloat(String(out2).trim());
    return Number.isFinite(v2) ? v2 : 0;
}

function calculateBitrateKbps(targetSizeBytes, durationSec, audioBitrateKbps) {
    const audioBits = Math.max(0, Math.floor(audioBitrateKbps * 1000 * durationSec));
    const totalBits = Math.max(8, targetSizeBytes * 8);
    const videoBits = Math.max(0, totalBits - audioBits);
    const kbps = Math.floor(videoBits / durationSec / 1000);
    return Math.max(100, Math.min(kbps, 50000)); // sane bounds
}

function buildFFmpegCommand({
    inputPath,
    outputPath,
    trimStart,
    trimEnd,
    videoCodec,
    audioCodec,
    videoBitrateKbps,
    audioBitrateKbps,
    preserveMetadata,
    preserveSubtitles,
    enhancement,
    extraFlags,
    container,
}) {
    const args = ['-y'];

    // input
    args.push('-i', `"${inputPath}"`);

    // optional trim (accurate)
    if (trimStart && trimEnd) {
        args.push('-ss', String(trimStart), '-to', String(trimEnd));
    }

    // video
    args.push('-c:v', videoCodec);

    // rate control + quality
    if (videoCodec === 'libx264') {
        args.push('-crf', '23', '-preset', 'slow', '-maxrate', `${videoBitrateKbps}k`, '-bufsize', `${videoBitrateKbps * 2}k`);
        args.push('-pix_fmt', 'yuv420p');
        if (container === 'mp4') args.push('-movflags', '+faststart');
    } else if (videoCodec === 'libvpx-vp9') {
        args.push('-b:v', `${videoBitrateKbps}k`, '-maxrate', `${videoBitrateKbps}k`, '-bufsize', `${videoBitrateKbps * 2}k`);
        args.push('-row-mt', '1', '-pix_fmt', 'yuv420p');
    } else if (videoCodec === 'libsvtav1') {
        args.push('-crf', '35', '-preset', '6', '-maxrate', `${videoBitrateKbps}k`, '-bufsize', `${videoBitrateKbps * 2}k`);
        args.push('-pix_fmt', 'yuv420p');
        if (container === 'mp4') args.push('-movflags', '+faststart');
    }

    // audio
    args.push('-c:a', audioCodec, '-b:a', `${audioBitrateKbps}k`);

    // metadata/subtitles
    if (preserveMetadata) args.push('-map_metadata', '0');
    if (preserveSubtitles) args.push('-c:s', 'copy');

    // optional enhancements
    const vf = [];
    if (enhancement === 'denoise' || enhancement === 'noise-reduction') vf.push('hqdn3d');
    if (enhancement === 'sharpness' || enhancement === 'sharpen') vf.push('unsharp');
    if (vf.length) args.push('-vf', `"${vf.join(',')}"`);

    // extra codec flags
    if (Array.isArray(extraFlags) && extraFlags.length) args.push(...extraFlags);

    // output
    args.push(`"${outputPath}"`);

    return `ffmpeg ${args.join(' ')}`;
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
