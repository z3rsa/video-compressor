# Video Compressor

Video Compressor is a powerful tool designed to help you reduce the size of your video files without compromising on quality. Whether you're working with large video files for professional projects or simply trying to save storage space, our app makes it easy to compress videos quickly and efficiently.

## Features

### Upload & Compress

- Upload video files and compress them to your desired size.
- Supports MP4, MOV, AVI, and other formats.

### Video Library

- Manage all your compressed videos in one place.
- Download or delete files as needed.

### Advanced Settings

- Customize compression settings, including output format, metadata preservation, and video enhancement.

### Fast Processing

- Compress videos in seconds using advanced algorithms for quick results.

### User-Friendly Interface

- Simple and intuitive design for seamless user experience.

## What We Are Working On

### Batch Processing

- Allow users to compress multiple videos at once for improved efficiency.

### Cloud Integration

- Enable users to upload and compress videos directly from cloud storage services like Google Drive and Dropbox.

### Mobile App

- Develop a mobile version of Video Compressor for on-the-go compression.

## API Endpoints

### Upload & Compress

- **Endpoint:** `POST /api/compress`
- **Description:** Upload a video file and compress it to the specified size.
- **Parameters:**
  - `videos`: The video file(s) to compress.
  - `size`: The target file size in MB.
  - `format`: The output format (e.g., MP4, MKV).
  - `preserveMetadata`: Whether to preserve metadata (true/false).
  - `preserveSubtitles`: Whether to preserve subtitles (true/false).
  - `enhancement`: Video enhancement options (e.g., noise reduction).

### Download Video

- **Endpoint:** `GET /api/download/[filename]`
- **Description:** Download a compressed video file by its filename.
- **Parameters:**
  - `filename`: The name of the file to download.

### List Videos

- **Endpoint:** `GET /api/videos`
- **Description:** Retrieve a list of all compressed videos.
- **Response:**
  - `name`: The name of the video file.
  - `size`: The size of the video file in bytes.
  - `date`: The date the video was compressed.

## Getting Started

To get started with the Video Compressor application, follow these steps:

1. **Upload a Video:** Go to the [Upload & Compress](/upload) page and upload a video file.
2. **Set Compression Settings:** Choose the desired file size, output format, and other options.
3. **Compress the Video:** Click the "Compress Video" button to start the compression process.
4. **Manage Videos:** View and download your compressed videos from the [Video Library](/library).

## Project Structure

Here’s an overview of the project structure to help you understand how the app is organized:

## Support

If you encounter any issues or have questions, please refer to the [GitHub repository](https://github.com/z3rsa/video-compressor) or contact support.

```
video-compressor
├─ .dockerignore
├─ components.json
├─ Dockerfile
├─ ffmpeg2pass-0.log
├─ ffmpeg2pass-0.log.mbtree
├─ input
├─ jsconfig.json
├─ next.config.mjs
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ public
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ placeholder.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ src
│  ├─ app
│  │  ├─ about
│  │  │  └─ page.js
│  │  ├─ api
│  │  │  ├─ batch
│  │  │  │  └─ route.js
│  │  │  ├─ compress
│  │  │  │  └─ route.js
│  │  │  ├─ download
│  │  │  │  └─ [filename]
│  │  │  │     └─ route.js
│  │  │  └─ videos
│  │  │     └─ route.js
│  │  ├─ batch
│  │  │  └─ page.js
│  │  ├─ docs
│  │  │  └─ page.js
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ history
│  │  │  └─ page.js
│  │  ├─ layout.js
│  │  ├─ library
│  │  │  └─ page.js
│  │  ├─ page.js
│  │  └─ upload
│  │     └─ page.js
│  ├─ components
│  │  ├─ app-sidebar.jsx
│  │  ├─ custom-button.jsx
│  │  ├─ theme-provider.jsx
│  │  ├─ theme-toggle.jsx
│  │  ├─ ui
│  │  │  ├─ alert.jsx
│  │  │  ├─ avatar.jsx
│  │  │  ├─ badge.jsx
│  │  │  ├─ breadcrumb.jsx
│  │  │  ├─ button.jsx
│  │  │  ├─ card.jsx
│  │  │  ├─ checkbox.jsx
│  │  │  ├─ collapsible.jsx
│  │  │  ├─ dialog.jsx
│  │  │  ├─ dropdown-menu.jsx
│  │  │  ├─ input.jsx
│  │  │  ├─ label.jsx
│  │  │  ├─ progress.jsx
│  │  │  ├─ select.jsx
│  │  │  ├─ separator.jsx
│  │  │  ├─ sheet.jsx
│  │  │  ├─ sidebar.jsx
│  │  │  ├─ skeleton.jsx
│  │  │  ├─ slider.jsx
│  │  │  ├─ switch.jsx
│  │  │  ├─ table.jsx
│  │  │  ├─ tabs.jsx
│  │  │  ├─ textarea.jsx
│  │  │  └─ tooltip.jsx
│  │  ├─ video-player.jsx
│  │  └─ video-trimmer.jsx
│  ├─ hooks
│  │  └─ use-mobile.js
│  └─ lib
│     └─ utils.js
└─ tailwind.config.js

```