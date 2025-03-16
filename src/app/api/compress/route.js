import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const tempDir = path.join(process.cwd(), 'temp');
const inputDir = path.join(process.cwd(), 'input');

[tempDir, inputDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ALLOWED_FORMATS = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

export async function POST(request) {
    try {
        const formData = await request.formData();
        const videos = formData.getAll('videos');
        const format = formData.get('format');
        const size = parseFloat(formData.get('size')) || 0;
        const preserveMetadata = formData.get('preserveMetadata') === 'true';
        const preserveSubtitles = formData.get('preserveSubtitles') === 'true';
        const enhancement = formData.get('enhancement');
        const preset = formData.get('preset');
        const trimStart = parseFloat(formData.get('trimStart')) || 0;
        const trimEnd = parseFloat(formData.get('trimEnd')) || 0;

        if (!videos.length) return NextResponse.json({ message: 'No files uploaded' }, { status: 400 });
        if (!ALLOWED_FORMATS.includes(format)) return NextResponse.json({ message: `Unsupported format: ${format}` }, { status: 400 });

        const compressedFiles = [];

        for (const video of videos) {
            if (video.size > MAX_FILE_SIZE) {
                return NextResponse.json({ message: `File size exceeds limit: ${(video.size / (1024 * 1024)).toFixed(2)} MB` }, { status: 400 });
            }

            const extension = path.extname(video.name).toLowerCase().slice(1);
            if (!ALLOWED_FORMATS.includes(extension)) {
                return NextResponse.json({ message: `Unsupported file type: ${extension}` }, { status: 400 });
            }

            const inputPath = path.join(inputDir, `${uuidv4()}.${extension}`);
            const outputPath = path.join(tempDir, `${uuidv4()}-output.${format}`);

            // Save the uploaded file using streams for better memory efficiency
            const buffer = await video.arrayBuffer(); // Move await outside the Promise
            await new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(inputPath);
                writeStream.write(Buffer.from(buffer)); // Use the buffer here
                writeStream.end();
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
            console.log(`File saved: ${inputPath}`);

            const durationInSeconds = await getVideoDuration(inputPath);
            if (!durationInSeconds) {
                return NextResponse.json({ message: 'Failed to get video duration. The file may be corrupted or unsupported.' }, { status: 400 });
            }

            if ((trimStart && !trimEnd) || (!trimStart && trimEnd)) {
                return NextResponse.json({ message: 'Both trimStart and trimEnd must be provided for trimming.' }, { status: 400 });
            }
            if (trimStart && trimEnd && (trimStart >= trimEnd || trimEnd > durationInSeconds)) {
                return NextResponse.json({ message: 'Invalid trim range. Ensure trimEnd is greater than trimStart and within the video duration.' }, { status: 400 });
            }

            const trimmedDuration = trimEnd ? trimEnd - trimStart : durationInSeconds;
            const targetSizeBytes = (preset === 'discord' ? 9 : size) * 1024 * 1024;
            const bitrate = calculateBitrate(targetSizeBytes, trimmedDuration);

            const ffmpegCommand = buildFFmpegCommand(inputPath, outputPath, bitrate, trimStart, trimEnd, preserveMetadata, preserveSubtitles, enhancement);
            console.log(`Executing: ${ffmpegCommand}`);

            await execPromise(ffmpegCommand);

            // Log output file size
            const outputFileSizeBytes = fs.statSync(outputPath).size;
            console.log(`Output file size: ${(outputFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

            fs.unlinkSync(inputPath);

            compressedFiles.push({
                name: path.basename(outputPath),
                downloadUrl: `/api/download/${path.basename(outputPath)}`,
            });
        }

        return NextResponse.json({ message: 'Videos compressed successfully!', files: compressedFiles });
    } catch (error) {
        console.error('Compression error:', error);
        return NextResponse.json({ message: 'Error during compression. Please try again.' }, { status: 500 });
    }
}

async function getVideoDuration(filePath) {
    return new Promise((resolve, reject) => {
        exec(`ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, (error, stdout) => {
            if (error) return reject(error);
            resolve(parseFloat(stdout.trim()));
        });
    });
}

function calculateBitrate(targetSizeBytes, duration) {
    const audioBitrate = 96 * 1000; // 96 kbps
    const videoSizeBits = (targetSizeBytes * 8) - (audioBitrate * duration);
    return Math.floor(videoSizeBits / duration / 1000); // Convert to kbps
}

function buildFFmpegCommand(inputPath, outputPath, bitrate, trimStart, trimEnd, preserveMetadata, preserveSubtitles, enhancement) {
    let command = `ffmpeg -y -i "${inputPath}"`;
    if (trimStart && trimEnd) command += ` -ss ${trimStart} -to ${trimEnd}`;
    command += ` -c:v libx264 -crf 23 -preset slow -maxrate ${bitrate}k -bufsize ${bitrate * 2}k -c:a aac -b:a 96k`;
    if (preserveMetadata) command += ' -map_metadata 0';
    if (preserveSubtitles) command += ' -c:s copy';
    if (enhancement === 'noise-reduction') command += ' -vf "hqdn3d"';
    if (enhancement === 'sharpness') command += ' -vf "unsharp"';
    return command + ` "${outputPath}"`;
}

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error) => (error ? reject(error) : resolve()));
    });
}