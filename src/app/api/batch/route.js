import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";

const tempDir = path.join(process.cwd(), "temp");
const inputDir = path.join(process.cwd(), "input");

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });

const allowedFormats = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
const maxFileSize = 500 * 1024 * 1024; // 500MB

export async function POST(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll("videos");
        const size = formData.get("size") || 10;
        const format = formData.get("format") || "mp4";
        const preserveMetadata = formData.get("preserveMetadata") === "true";
        const preserveSubtitles = formData.get("preserveSubtitles") === "true";
        const enhancement = formData.get("enhancement") || "none";
        const preset = formData.get("preset");

        if (!files || files.length === 0) {
            return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
        }

        if (!allowedFormats.includes(format)) {
            return NextResponse.json({ message: "Unsupported format" }, { status: 400 });
        }

        const processedFiles = [];
        for (const file of files) {
            try {
                if (file.size > maxFileSize) {
                    return NextResponse.json({ message: "File size exceeds limit" }, { status: 400 });
                }

                const fileExtension = path.extname(file.name).toLowerCase();
                if (!allowedFormats.includes(fileExtension.slice(1))) {
                    return NextResponse.json({ message: "Unsupported file type" }, { status: 400 });
                }

                const fileName = `${Date.now()}-${file.name}`;
                const filePath = path.join(inputDir, fileName);

                const writeStream = fs.createWriteStream(filePath);
                const buffer = await file.arrayBuffer();
                writeStream.write(Buffer.from(buffer));
                writeStream.end();

                const inputFileSizeBytes = fs.statSync(filePath).size;
                console.log(`Input file size: ${(inputFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

                const durationInSeconds = await new Promise((resolve, reject) => {
                    exec(
                        `ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
                        (error, stdout) => {
                            if (error) reject(error);
                            resolve(parseFloat(stdout.trim()));
                        }
                    );
                });
                console.log(`Video duration: ${durationInSeconds} seconds`);

                const targetFileSizeBytes = (preset === "discord" ? 10 : size) * 1024 * 1024;
                console.log(`Target file size: ${(targetFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

                const audioBitrate = 96;
                const audioSizeBits = (audioBitrate * 1000) * durationInSeconds;
                const videoSizeBits = (targetFileSizeBytes * 8) - audioSizeBits;
                const bitrate = Math.floor(videoSizeBits / durationInSeconds / 1000);
                console.log(`Calculated video bitrate: ${bitrate}k`);
                console.log(`Calculated audio bitrate: ${audioBitrate}k`);

                let ffmpegCommand = `ffmpeg -y -i "${filePath}" -c:v libx264 -b:v ${bitrate}k -pass 1 -an -f null /dev/null && `;
                ffmpegCommand += `ffmpeg -i "${filePath}" -c:v libx264 -b:v ${bitrate}k -pass 2 -c:a aac -b:a ${audioBitrate}k`;

                if (preserveMetadata) ffmpegCommand += " -map_metadata 0";
                if (preserveSubtitles) ffmpegCommand += " -c:s copy";
                if (enhancement === "noise-reduction") ffmpegCommand += ' -vf "hqdn3d"';
                else if (enhancement === "sharpness") ffmpegCommand += ' -vf "unsharp"';

                const outputFileName = `${uuidv4()}-output.${format}`;
                const outputFilePath = path.join(tempDir, outputFileName);
                ffmpegCommand += ` "${outputFilePath}"`;

                console.log(`FFmpeg command: ${ffmpegCommand}`);

                await new Promise((resolve, reject) => {
                    exec(ffmpegCommand, (error) => {
                        if (error) reject(error);
                        resolve();
                    });
                });

                const outputFileSizeBytes = fs.statSync(outputFilePath).size;
                console.log(`Output file size: ${(outputFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

                fs.unlinkSync(filePath);

                processedFiles.push({
                    name: outputFileName,
                    size: outputFileSizeBytes,
                    date: new Date().toISOString(),
                    downloadUrl: `/api/download/${outputFileName}`,
                });
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
            }
        }

        return NextResponse.json(
            { message: "Batch processing completed successfully!", files: processedFiles },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error during batch processing:", error);
        return NextResponse.json(
            { message: "Error during batch processing" },
            { status: 500 }
        );
    }
}