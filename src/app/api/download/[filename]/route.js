import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const tempDir = path.join(process.cwd(), 'temp');

export async function GET(request, { params }) {
    try {
        // Ensure params.filename is accessed properly
        const { filename } = await params;

        if (!filename) {
            return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
        }

        const filePath = path.join(tempDir, filename);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ message: 'File not found' }, { status: 404 });
        }

        // Stream the file as a response
        const fileStream = fs.createReadStream(filePath);
        return new NextResponse(fileStream, {
            headers: {
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}