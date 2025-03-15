import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const tempDir = path.join(process.cwd(), 'temp');

export async function GET() {
    try {
        const files = fs.readdirSync(tempDir);
        const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
        const videos = files
            .filter((file) => videoExtensions.includes(path.extname(file).toLowerCase()))
            .map((file) => {
                const sanitizedFilename = path.basename(file);
                const filePath = path.join(tempDir, sanitizedFilename);
                const stats = fs.statSync(filePath);
                return {
                    name: sanitizedFilename,
                    size: stats.size,
                    date: stats.mtime,
                    downloadUrl: `/api/download/${sanitizedFilename}`,
                };
            });

        return NextResponse.json(videos);
    } catch (error) {
        console.error('Error fetching videos:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}