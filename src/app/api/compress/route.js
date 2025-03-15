import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const tempDir = path.join(process.cwd(), 'temp');
const inputDir = path.join(process.cwd(), 'input');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });

const allowedFormats = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'];
const maxFileSize = 5000 * 1024 * 1024; // 500MB

export async function POST(request) {
    const formData = await request.formData();
    const videos = formData.getAll('videos');
    const size = formData.get('size');
    const format = formData.get('format');
    const preserveMetadata = formData.get('preserveMetadata') === 'true';
    const preserveSubtitles = formData.get('preserveSubtitles') === 'true';
    const enhancement = formData.get('enhancement');
    const preset = formData.get('preset');
    const trimStart = parseFloat(formData.get('trimStart')) || 0;
    const trimEnd = parseFloat(formData.get('trimEnd')) || 0;

    if (!videos || videos.length === 0) {
        return NextResponse.json({ message: 'Missing files' }, { status: 400 });
    }

    if (!allowedFormats.includes(format)) {
        return NextResponse.json({ message: 'Unsupported format' }, { status: 400 });
    }

    const compressedFiles = [];

    try {
        for (const video of videos) {
            if (video.size > maxFileSize) {
                return NextResponse.json({ message: 'File size exceeds limit' }, { status: 400 });
            }

            const videoExtension = path.extname(video.name).toLowerCase();
            if (!allowedFormats.includes(videoExtension.slice(1))) {
                return NextResponse.json({ message: 'Unsupported file type' }, { status: 400 });
            }

            const videoPath = path.join(inputDir, `${uuidv4()}${videoExtension}`);
            const outputVideoPath = path.join(tempDir, `${uuidv4()}-output.${format}`);

            // Save the uploaded file using streams
            const writeStream = fs.createWriteStream(videoPath);
            const buffer = await video.arrayBuffer();
            writeStream.write(Buffer.from(buffer));
            writeStream.end();

            // Log input file size
            const inputFileSizeBytes = fs.statSync(videoPath).size;
            console.log(`Input file size: ${(inputFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

            // Get video duration
            const durationInSeconds = await new Promise((resolve, reject) => {
                exec(`ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`, (error, stdout) => {
                    if (error) reject(error);
                    resolve(parseFloat(stdout.trim()));
                });
            });
            console.log(`Video duration: ${durationInSeconds} seconds`);

            // Validate trim range (if provided)
            let useTrim = false;
            if (trimStart !== 0 && trimEnd !== 0) {
                if (trimStart >= trimEnd || trimEnd > durationInSeconds) {
                    console.error("Invalid trim range");
                    return NextResponse.json({ message: 'Invalid trim range' }, { status: 400 });
                }
                useTrim = true;
            }

            // Calculate target bitrate based on file size
            const targetFileSizeBytes = (preset === 'discord' ? 9 : size) * 1024 * 1024;
            console.log(`Target file size: ${(targetFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

            const audioBitrate = 96;
            const audioSizeBits = (audioBitrate * 1000) * durationInSeconds;
            const videoSizeBits = (targetFileSizeBytes * 8) - audioSizeBits;
            const bitrate = Math.floor(videoSizeBits / durationInSeconds / 1000);
            console.log(`Calculated video bitrate: ${bitrate}k`);
            console.log(`Calculated audio bitrate: ${audioBitrate}k`);

            let ffmpegCommand = `ffmpeg -y -i "${videoPath}"`;
            if (useTrim) {
                ffmpegCommand += ` -ss ${trimStart} -to ${trimEnd}`;
            }

            // Adjusted encoding settings for quality + target size
            ffmpegCommand += ` -c:v libx264 -crf 23 -preset slow -maxrate ${bitrate}k -bufsize ${bitrate * 2}k -c:a aac -b:a ${audioBitrate}k`;

            if (preserveMetadata) ffmpegCommand += ' -map_metadata 0';
            if (preserveSubtitles) ffmpegCommand += ' -c:s copy';
            if (enhancement === 'noise-reduction') ffmpegCommand += ' -vf "hqdn3d"';
            else if (enhancement === 'sharpness') ffmpegCommand += ' -vf "unsharp"';

            ffmpegCommand += ` "${outputVideoPath}"`;

            console.log(`FFmpeg command: ${ffmpegCommand}`);

            await new Promise((resolve, reject) => {
                exec(ffmpegCommand, (error) => {
                    if (error) reject(error);
                    resolve();
                });
            });

            const outputFileSizeBytes = fs.statSync(outputVideoPath).size;
            console.log(`Output file size: ${(outputFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

            fs.unlinkSync(videoPath);

            compressedFiles.push({
                name: path.basename(outputVideoPath),
                downloadUrl: `/api/download/${path.basename(outputVideoPath)}`,
            });
        }

        return NextResponse.json({
            message: 'Videos compressed successfully!',
            files: compressedFiles,
        });
    } catch (error) {
        console.error('Compression error:', error);
        return NextResponse.json({ message: 'Error during compression' }, { status: 500 });
    }
}