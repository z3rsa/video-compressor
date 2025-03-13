import { FileVideo, Upload, Download, Settings, Zap, Clock, Database, Info } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function DocumentationPage() {
    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8 bg-background text-foreground">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold">Documentation</h1>
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
                            Welcome to the Video Compressor documentation! This application allows you to upload, compress, and manage video files efficiently. Below, you'll find detailed information about the features, API endpoints, and how to use the application.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </section>

            {/* Features */}
            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">Features</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Upload & Compress */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Upload className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Upload & Compress</CardTitle>
                            </div>
                            <CardDescription className="text-sm">
                                Upload video files and compress them to your desired size. Supports MP4, MOV, AVI, and other formats.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Video Library */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <FileVideo className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Video Library</CardTitle>
                            </div>
                            <CardDescription className="text-sm">
                                Manage all your compressed videos in one place. Download or delete files as needed.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Advanced Settings */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Advanced Settings</CardTitle>
                            </div>
                            <CardDescription className="text-sm">
                                Customize compression settings, including output format, metadata preservation, and video enhancement.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </section>

            {/* API Endpoints */}
            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">API Endpoints</h2>
                <div className="space-y-4">
                    {/* Upload & Compress */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Upload className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Upload & Compress</CardTitle>
                            </div>
                            <CardDescription className="text-sm mb-4">
                                <strong>Endpoint:</strong> <Badge variant="secondary">POST /api/compress</Badge>
                            </CardDescription>
                            <CardDescription className="text-sm mb-4">
                                <strong>Description:</strong> Upload a video file and compress it to the specified size.
                            </CardDescription>
                            <CardDescription className="text-sm">
                                <strong>Parameters:</strong>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li><code>videos</code>: The video file(s) to compress.</li>
                                    <li><code>size</code>: The target file size in MB.</li>
                                    <li><code>format</code>: The output format (e.g., MP4, MKV).</li>
                                    <li><code>preserveMetadata</code>: Whether to preserve metadata (true/false).</li>
                                    <li><code>preserveSubtitles</code>: Whether to preserve subtitles (true/false).</li>
                                    <li><code>enhancement</code>: Video enhancement options (e.g., noise reduction).</li>
                                </ul>
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Download Video */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Download className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">Download Video</CardTitle>
                            </div>
                            <CardDescription className="text-sm mb-4">
                                <strong>Endpoint:</strong> <Badge variant="secondary">GET /api/download/[filename]</Badge>
                            </CardDescription>
                            <CardDescription className="text-sm mb-4">
                                <strong>Description:</strong> Download a compressed video file by its filename.
                            </CardDescription>
                            <CardDescription className="text-sm">
                                <strong>Parameters:</strong>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li><code>filename</code>: The name of the file to download.</li>
                                </ul>
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* List Videos */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-4">
                                <Database className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg font-semibold">List Videos</CardTitle>
                            </div>
                            <CardDescription className="text-sm mb-4">
                                <strong>Endpoint:</strong> <Badge variant="secondary">GET /api/videos</Badge>
                            </CardDescription>
                            <CardDescription className="text-sm mb-4">
                                <strong>Description:</strong> Retrieve a list of all compressed videos.
                            </CardDescription>
                            <CardDescription className="text-sm">
                                <strong>Response:</strong>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li><code>name</code>: The name of the video file.</li>
                                    <li><code>size</code>: The size of the video file in bytes.</li>
                                    <li><code>date</code>: The date the video was compressed.</li>
                                </ul>
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </section>

            {/* Getting Started */}
            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">Getting Started</h2>
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardDescription className="text-sm">
                            To get started with the Video Compressor application, follow these steps:
                        </CardDescription>
                        <ol className="list-decimal pl-6 mt-4 space-y-2">
                            <li>
                                <strong>Upload a Video:</strong> Go to the <Link href="/upload" className="text-primary hover:underline">Upload & Compress</Link> page and upload a video file.
                            </li>
                            <li>
                                <strong>Set Compression Settings:</strong> Choose the desired file size, output format, and other options.
                            </li>
                            <li>
                                <strong>Compress the Video:</strong> Click the "Compress Video" button to start the compression process.
                            </li>
                            <li>
                                <strong>Manage Videos:</strong> View and download your compressed videos from the <Link href="/library" className="text-primary hover:underline">Video Library</Link>.
                            </li>
                        </ol>
                    </CardHeader>
                </Card>
            </section>

            {/* Support */}
            <section>
                <h2 className="text-xl font-bold mb-4">Support</h2>
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardDescription className="text-sm">
                            If you encounter any issues or have questions, please refer to the <Link href="https://github.com/z3rsa/video-compressor" className="text-primary hover:underline">GitHub repository</Link> or contact support.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </section>
        </div>
    );
}