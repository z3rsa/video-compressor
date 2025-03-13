import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const tempDir = path.join(process.cwd(), 'temp');

export async function GET() {
    const files = fs.readdirSync(tempDir);
    const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
    const videos = files
        .filter((file) => videoExtensions.includes(path.extname(file).toLowerCase()))
        .map((file) => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                date: stats.mtime,
                downloadUrl: `/api/download/${file}`,
            };
        });

    return NextResponse.json(videos);
}