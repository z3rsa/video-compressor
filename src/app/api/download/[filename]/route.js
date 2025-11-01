import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/** Ensure Node runtime (fs) and avoid static caching */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const tempDir = path.join(process.cwd(), 'temp');

const mimeTypes = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    ogg: 'video/ogg',
};

function getContentType(filename) {
    const ext = path.extname(filename).slice(1).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

/** RFC5987 filename* encoding for UTF-8 safe download headers */
function encodeRFC5987(value) {
    return encodeURIComponent(value)
        .replace(/['()]/g, escape) // i.e., %27 %28 %29
        .replace(/\*/g, '%2A');
}

/** Common headers for all responses */
function baseHeaders({ contentType, length, etag, lastModified }) {
    const h = new Headers();
    if (length != null) h.set('Content-Length', String(length));
    if (contentType) h.set('Content-Type', contentType);
    h.set('Accept-Ranges', 'bytes');
    h.set('Cache-Control', 'no-store');
    if (etag) h.set('ETag', etag);
    if (lastModified) h.set('Last-Modified', lastModified);
    h.set('X-Content-Type-Options', 'nosniff');
    return h;
}

/** Resolve file path safely and stats */
function resolveFile(filename) {
    const sanitized = path.basename(filename);
    const filePath = path.join(tempDir, sanitized);
    if (!fs.existsSync(filePath)) return { ok: false };
    const stats = fs.statSync(filePath);
    return { ok: true, sanitized, filePath, stats };
}

/** HEAD handler (players/clients probe headers) */
export async function HEAD(request, { params }) {
    try {
        const { filename } = params || {};
        if (!filename) {
            return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
        }

        const resolved = resolveFile(filename);
        if (!resolved.ok) {
            return NextResponse.json({ message: 'File not found' }, { status: 404 });
        }

        const { sanitized, filePath, stats } = resolved;
        const contentType = getContentType(sanitized);
        const etag = `W/"${stats.mtimeMs}-${stats.size}"`;
        const lastModified = stats.mtime.toUTCString();

        const headers = baseHeaders({
            contentType,
            length: stats.size,
            etag,
            lastModified,
        });

        return new NextResponse(null, { status: 200, headers });
    } catch (err) {
        console.error('Download HEAD error:', err);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const { filename } = params || {};
        if (!filename) {
            return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
        }

        const url = new URL(request.url);
        const forceDownload = url.searchParams.get('download') === 'true';

        const resolved = resolveFile(filename);
        if (!resolved.ok) {
            return NextResponse.json({ message: 'File not found' }, { status: 404 });
        }

        const { sanitized, filePath, stats } = resolved;
        if (stats.size === 0) {
            return NextResponse.json({ message: 'File is empty' }, { status: 500 });
        }

        const contentType = getContentType(sanitized);
        const etag = `W/"${stats.mtimeMs}-${stats.size}"`;
        const lastModified = stats.mtime.toUTCString();

        // If download, force Content-Disposition: attachment; include RFC5987 filename*
        if (forceDownload) {
            const headers = baseHeaders({
                contentType,
                length: stats.size,
                etag,
                lastModified,
            });
            const asciiFallback = sanitized.replace(/[^\x20-\x7E]/g, '_');
            const encodedStar = encodeRFC5987(sanitized);

            headers.set(
                'Content-Disposition',
                `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedStar}`
            );

            const stream = fs.createReadStream(filePath);
            return new NextResponse(stream, { status: 200, headers });
        }

        // Handle range (streaming)
        const range = request.headers.get('range');
        if (range) {
            // Robust bytes parsing: "bytes=start-end"
            const match = /^bytes=(\d*)-(\d*)$/.exec(range);
            if (!match) {
                const h = new Headers();
                h.set('Content-Range', `bytes */${stats.size}`);
                return new NextResponse(null, { status: 416, headers: h });
            }

            let start = match[1] ? parseInt(match[1], 10) : 0;
            let end = match[2] ? parseInt(match[2], 10) : stats.size - 1;

            if (Number.isNaN(start) || start < 0) start = 0;
            if (Number.isNaN(end) || end >= stats.size) end = stats.size - 1;
            if (start > end || start >= stats.size) {
                const h = new Headers();
                h.set('Content-Range', `bytes */${stats.size}`);
                return new NextResponse(null, { status: 416, headers: h });
            }

            const chunkSize = end - start + 1;
            const stream = fs.createReadStream(filePath, { start, end });

            const headers = baseHeaders({
                contentType,
                length: chunkSize,
                etag,
                lastModified,
            });
            headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`);

            return new NextResponse(stream, {
                status: 206,
                headers,
            });
        }

        // No range: stream full file inline
        const headers = baseHeaders({
            contentType,
            length: stats.size,
            etag,
            lastModified,
        });

        const stream = fs.createReadStream(filePath);
        return new NextResponse(stream, { status: 200, headers });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
