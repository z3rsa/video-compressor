import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const tempDir = path.join(process.cwd(), 'temp');

// Mapping of file extensions to MIME types
const mimeTypes = {
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    // Add more MIME types as needed
};

export async function GET(request, { params }) {
    try {
        const { filename } = await params;
        const { searchParams } = new URL(request.url);
        const download = searchParams.get('download') === 'true'; // Check if download query param is true

        if (!filename) {
            return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
        }

        // Sanitize filename to prevent path traversal
        const sanitizedFilename = path.basename(filename);
        const filePath = path.join(tempDir, sanitizedFilename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ message: 'File not found' }, { status: 404 });
        }

        // Get file stats to determine the file size
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;

        // Determine the MIME type based on the file extension
        const ext = path.extname(sanitizedFilename).slice(1); // Get file extension without the dot
        const contentType = mimeTypes[ext] || 'application/octet-stream'; // Default to octet-stream if unknown

        // If download is requested, force the browser to download the file
        if (download) {
            return new NextResponse(fs.createReadStream(filePath), {
                headers: {
                    'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
                    'Content-Length': fileSize.toString(),
                    'Content-Type': contentType,
                },
            });
        }

        // Otherwise, handle range requests for streaming
        const range = request.headers.get('range');
        if (range) {
            // Parse the range header (e.g., "bytes=0-500")
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            // Validate the range
            if (start >= fileSize || end >= fileSize) {
                return new NextResponse(null, {
                    status: 416, // Range Not Satisfiable
                    headers: {
                        'Content-Range': `bytes */${fileSize}`,
                    },
                });
            }

            // Create a read stream for the requested range
            const chunkSize = end - start + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });

            // Respond with the partial content
            return new NextResponse(fileStream, {
                status: 206, // Partial Content
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize.toString(),
                    'Content-Type': contentType,
                },
            });
        } else {
            // If no range header, serve the entire file
            const fileStream = fs.createReadStream(filePath);
            return new NextResponse(fileStream, {
                headers: {
                    'Content-Length': fileSize.toString(),
                    'Content-Type': contentType,
                    'Accept-Ranges': 'bytes',
                },
            });
        }
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}