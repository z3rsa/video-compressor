import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RBG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";

export async function POST(req) {
    try {
        const apiKey = process.env.REMOVEBG_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { message: "Server misconfiguration: REMOVEBG_API_KEY is missing." },
                { status: 500 }
            );
        }

        const form = await req.formData();

        // We accept either an uploaded file or an image URL.
        const file = form.get("file");
        const imageUrl = (form.get("imageUrl") || "").toString().trim();

        if (!file && !imageUrl) {
            return NextResponse.json(
                { message: "Provide either a file (field: file) or an imageUrl." },
                { status: 400 }
            );
        }

        // Optional params from UI
        const size = (form.get("size") || "auto").toString(); // "auto", "preview", "full"
        const bgColor = (form.get("bgColor") || "").toString().trim(); // e.g. "transparent" or hex "ffffff"
        const bgImageUrl = (form.get("bgImageUrl") || "").toString().trim(); // replace background with image
        const crop = (form.get("crop") || "").toString() === "true";
        const scale = (form.get("scale") || "").toString().trim(); // e.g. "2x"

        // Build FormData for remove.bg
        const upstream = new FormData();
        upstream.append("size", size); // required by API examples
        if (imageUrl) upstream.append("image_url", imageUrl);
        if (file) upstream.append("image_file", file, file.name || "upload");
        if (bgColor) upstream.append("bg_color", bgColor);
        if (bgImageUrl) upstream.append("bg_image_url", bgImageUrl);
        if (crop) upstream.append("crop", "true");
        if (scale) upstream.append("scale", scale);

        const res = await fetch(RBG_ENDPOINT, {
            method: "POST",
            headers: { "X-Api-Key": apiKey },
            body: upstream,
        });

        if (!res.ok) {
            // remove.bg returns text or JSON on errors — surface it back
            let payload = await res.text().catch(() => "");
            try { payload = JSON.parse(payload); } catch { }
            const message =
                (typeof payload === "string" && payload) ||
                payload?.errors?.[0]?.title ||
                payload?.error?.title ||
                res.statusText;
            return NextResponse.json(
                { message: `remove.bg error: ${message}`, status: res.status },
                { status: 502 }
            );
        }

        // Success: forward image bytes & content-type
        const ct = res.headers.get("content-type") || "image/png";
        const buf = Buffer.from(await res.arrayBuffer());
        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": ct,
                "Cache-Control": "no-store",
            },
        });
    } catch (e) {
        console.error("remove-bg proxy error:", e);
        return NextResponse.json({ message: "Internal error" }, { status: 500 });
    }
}
