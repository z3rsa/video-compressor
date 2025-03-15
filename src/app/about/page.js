'use client'; // Mark as a Client Component

import { FileVideo, Upload, Download, Settings, Zap, Clock, Database, Info } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

export default function AboutPage() {
    const [isLoading, setIsLoading] = useState(true); // Loading state

    // Simulate loading delay
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false); // Set loading to false after a delay
        }, 1000); // 1-second delay for demonstration

        return () => clearTimeout(timer); // Cleanup timer
    }, []);

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8 bg-background text-foreground">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">About Video Compressor</h1>
                <Button asChild>
                    <Link href="/upload" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Get Started
                    </Link>
                </Button>
            </div>

            {/* Introduction */}
            <section className="mb-8">
                <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Info className="h-6 w-6 text-primary" />
                            Introduction
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Video Compressor is a powerful tool designed to help you reduce the size of your video files without compromising on quality. Whether you're working with large video files for professional projects or simply trying to save storage space, our app makes it easy to compress videos quickly and efficiently.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </section>

            {/* Features */}
            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">Features</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Customizable Compression */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Customizable Compression</CardTitle>
                            </div>
                            <CardDescription className="text-sm">
                                Choose your desired file size and let the app handle the rest. Supports MP4, AVI, MKV, and more.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Fast Processing */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Fast Processing</CardTitle>
                            </div>
                            <CardDescription className="text-sm">
                                Compress videos in seconds using advanced algorithms for quick results.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* User-Friendly Interface */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <FileVideo className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">User-Friendly Interface</CardTitle>
                            </div>
                            <CardDescription className="text-sm">
                                Simple and intuitive design for seamless user experience.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </section>

            {/* What We Are Working On */}
            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">What We Are Working On</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Batch Processing */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Database className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Batch Processing</CardTitle>
                            </div>
                            <CardDescription className="text-sm">
                                Allow users to compress multiple videos at once for improved efficiency.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Cloud Integration */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Upload className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Cloud Integration</CardTitle>
                            </div>
                            <CardDescription className="text-sm">
                                Enable users to upload and compress videos directly from cloud storage services like Google Drive and Dropbox.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Mobile App */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Mobile App</CardTitle>
                            </div>
                            <CardDescription className="text-sm">
                                Develop a mobile version of Video Compressor for on-the-go compression.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </section>

            {/* Project Structure */}
            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">Project Structure</h2>
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardDescription className="text-sm">
                            Here’s an overview of the project structure to help you understand how the app is organized:
                        </CardDescription>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-900 dark:text-gray-300 mt-4">
                            {`video-compressor
├── components.json
├── Dockerfile
├── input
├── jsconfig.json
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── uploads
│   ├── vercel.svg
│   └── window.svg
├── src
│   ├── app
│   │   ├── about
│   │   │   └── page.js
│   │   ├── api
│   │   │   ├── batch
│   │   │   │   └── route.js
│   │   │   ├── compress
│   │   │   │   └── route.js
│   │   │   ├── download
│   │   │   │   └── [filename]
│   │   │   │       └── route.js
│   │   │   └── videos
│   │   │       └── route.js
│   │   ├── batch
│   │   │   └── page.js
│   │   ├── docs
│   │   │   └── page.js
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── history
│   │   │   └── page.js
│   │   ├── layout.js
│   │   ├── library
│   │   │   └── page.js
│   │   ├── page.js
│   │   └── upload
│   │       └── page.js
│   ├── components
│   │   ├── app-sidebar.jsx
│   │   ├── theme-provider.jsx
│   │   ├── theme-toggle.jsx
│   │   └── ui
│   │       ├── alert.jsx
│   │       ├── avatar.jsx
│   │       ├── badge.jsx
│   │       ├── breadcrumb.jsx
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── checkbox.jsx
│   │       ├── collapsible.jsx
│   │       ├── dropdown-menu.jsx
│   │       ├── input.jsx
│   │       ├── label.jsx
│   │       ├── navigation-menu.jsx
│   │       ├── progress.jsx
│   │       ├── select.jsx
│   │       ├── separator.jsx
│   │       ├── sheet.jsx
│   │       ├── sidebar.jsx
│   │       ├── skeleton.jsx
│   │       ├── switch.jsx
│   │       ├── table.jsx
│   │       ├── tabs.jsx
│   │       ├── textarea.jsx
│   │       └── tooltip.jsx
│   ├── hooks
│   │   └── use-mobile.js
│   └── lib
│       └── utils.js
└── tailwind.config.js`}
                        </pre>
                    </CardHeader>
                </Card>
            </section>

            {/* Get Started */}
            <section>
                <h2 className="text-xl font-bold mb-4">Get Started</h2>
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardDescription className="text-sm">
                            Ready to compress your videos? Head over to the{' '}
                            <Link href="/upload" className="text-primary hover:underline">
                                Upload & Compress
                            </Link>{' '}
                            page and start compressing today!
                        </CardDescription>
                    </CardHeader>
                </Card>
            </section>
        </div>
    );
}