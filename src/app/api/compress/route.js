import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const tempDir = path.join(process.cwd(), 'temp');
const inputDir = path.join(process.cwd(), 'input');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir);

export async function POST(request) {
    const formData = await request.formData();
    const videos = formData.getAll('videos'); // For batch processing
    const size = formData.get('size');
    const format = formData.get('format');
    const preserveMetadata = formData.get('preserveMetadata') === 'true';
    const preserveSubtitles = formData.get('preserveSubtitles') === 'true';
    const enhancement = formData.get('enhancement');
    const preset = formData.get('preset'); // Get the selected preset

    if (!videos || videos.length === 0) {
        return NextResponse.json({ message: 'Missing files' }, { status: 400 });
    }

    const compressedFiles = [];

    try {
        for (const video of videos) {
            const videoExtension = path.extname(video.name);
            const videoPath = path.join(inputDir, `${uuidv4()}${videoExtension}`);
            const outputVideoPath = path.join(tempDir, `${uuidv4()}-output.${format}`);

            // Save the uploaded file
            const buffer = await video.arrayBuffer();
            fs.writeFileSync(videoPath, Buffer.from(buffer));

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

            // Calculate target bitrate based on file size
            const targetFileSizeBytes = (preset === 'discord' ? 10 : size) * 1024 * 1024; // 10MB for Discord, otherwise use user input
            console.log(`Target file size: ${(targetFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

            // Adjust bitrate to account for audio and other streams
            const audioBitrate = 96; // 96kbps for audio
            const audioSizeBits = (audioBitrate * 1000) * durationInSeconds; // Audio size in bits
            const videoSizeBits = (targetFileSizeBytes * 8) - audioSizeBits; // Remaining size for video in bits
            const bitrate = Math.floor(videoSizeBits / durationInSeconds / 1000); // Video bitrate in kbps
            console.log(`Calculated video bitrate: ${bitrate}k`);
            console.log(`Calculated audio bitrate: ${audioBitrate}k`);

            // Build FFmpeg command for two-pass encoding
            let ffmpegCommand = `ffmpeg -y -i "${videoPath}" -c:v libx264 -b:v ${bitrate}k -pass 1 -an -f null /dev/null && `;
            ffmpegCommand += `ffmpeg -i "${videoPath}" -c:v libx264 -b:v ${bitrate}k -pass 2 -c:a aac -b:a ${audioBitrate}k`;

            // Add metadata preservation if enabled
            if (preserveMetadata) {
                ffmpegCommand += ' -map_metadata 0';
                console.log('Metadata preservation enabled');
            }

            // Add subtitle preservation if enabled
            if (preserveSubtitles) {
                ffmpegCommand += ' -c:s copy';
                console.log('Subtitle preservation enabled');
            }

            // Add enhancement filters (only if explicitly enabled)
            if (enhancement === 'noise-reduction') {
                ffmpegCommand += ' -vf "hqdn3d"';
                console.log('Noise reduction filter enabled');
            } else if (enhancement === 'sharpness') {
                ffmpegCommand += ' -vf "unsharp"';
                console.log('Sharpness filter enabled');
            }

            // Add output format
            ffmpegCommand += ` "${outputVideoPath}"`;

            // Log FFmpeg command
            console.log(`FFmpeg command: ${ffmpegCommand}`);

            // Execute FFmpeg command
            await new Promise((resolve, reject) => {
                exec(ffmpegCommand, (error) => {
                    if (error) reject(error);
                    resolve();
                });
            });

            // Log output file size
            const outputFileSizeBytes = fs.statSync(outputVideoPath).size;
            console.log(`Output file size: ${(outputFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

            // Clean up input file
            fs.unlinkSync(videoPath);

            // Add compressed file to the list
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