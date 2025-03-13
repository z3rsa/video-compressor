import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";

const tempDir = path.join(process.cwd(), "temp");
const inputDir = path.join(process.cwd(), "input");

// Ensure directories exist
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });

export async function POST(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll("videos");
        const size = formData.get("size") || 10; // Default to 10MB
        const format = formData.get("format") || "mp4";
        const preserveMetadata = formData.get("preserveMetadata") === "true";
        const preserveSubtitles = formData.get("preserveSubtitles") === "true";
        const enhancement = formData.get("enhancement") || "none";
        const preset = formData.get("preset"); // Get the selected preset

        // Validate files
        if (!files || files.length === 0) {
            return NextResponse.json(
                { message: "No files uploaded" },
                { status: 400 }
            );
        }

        const processedFiles = [];
        for (const file of files) {
            try {
                const buffer = await file.arrayBuffer();
                const fileName = `${Date.now()}-${file.name}`;
                const filePath = path.join(inputDir, fileName);

                // Save the file to the input directory
                fs.writeFileSync(filePath, Buffer.from(buffer));

                // Log input file size
                const inputFileSizeBytes = fs.statSync(filePath).size;
                console.log(`Input file size: ${(inputFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

                // Get video duration
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

                // Calculate target bitrate based on file size
                const targetFileSizeBytes = (preset === "discord" ? 10 : size) * 1024 * 1024; // 10MB for Discord, otherwise use user input
                console.log(`Target file size: ${(targetFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

                // Adjust bitrate to account for audio and other streams
                const audioBitrate = 96; // 96kbps for audio
                const audioSizeBits = (audioBitrate * 1000) * durationInSeconds; // Audio size in bits
                const videoSizeBits = (targetFileSizeBytes * 8) - audioSizeBits; // Remaining size for video in bits
                const bitrate = Math.floor(videoSizeBits / durationInSeconds / 1000); // Video bitrate in kbps
                console.log(`Calculated video bitrate: ${bitrate}k`);
                console.log(`Calculated audio bitrate: ${audioBitrate}k`);

                // Build FFmpeg command for two-pass encoding
                let ffmpegCommand = `ffmpeg -y -i "${filePath}" -c:v libx264 -b:v ${bitrate}k -pass 1 -an -f null /dev/null && `;
                ffmpegCommand += `ffmpeg -i "${filePath}" -c:v libx264 -b:v ${bitrate}k -pass 2 -c:a aac -b:a ${audioBitrate}k`;

                // Add metadata preservation if enabled
                if (preserveMetadata) {
                    ffmpegCommand += " -map_metadata 0";
                    console.log("Metadata preservation enabled");
                }

                // Add subtitle preservation if enabled
                if (preserveSubtitles) {
                    ffmpegCommand += " -c:s copy";
                    console.log("Subtitle preservation enabled");
                }

                // Add enhancement filters (only if explicitly enabled)
                if (enhancement === "noise-reduction") {
                    ffmpegCommand += ' -vf "hqdn3d"';
                    console.log("Noise reduction filter enabled");
                } else if (enhancement === "sharpness") {
                    ffmpegCommand += ' -vf "unsharp"';
                    console.log("Sharpness filter enabled");
                }

                // Add output format
                const outputFileName = `${uuidv4()}-output.${format}`;
                const outputFilePath = path.join(tempDir, outputFileName);
                ffmpegCommand += ` "${outputFilePath}"`;

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
                const outputFileSizeBytes = fs.statSync(outputFilePath).size;
                console.log(`Output file size: ${(outputFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

                // Clean up input file
                fs.unlinkSync(filePath);

                // Add compressed file to the list
                processedFiles.push({
                    name: outputFileName,
                    size: outputFileSizeBytes,
                    date: new Date().toISOString(),
                    downloadUrl: `/api/download/${outputFileName}`,
                });
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
                // Log the error but continue processing other files
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