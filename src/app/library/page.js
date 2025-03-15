"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileVideo, Download, Upload, ArrowDown, ArrowUp, Search, Filter, PlayCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import VideoPlayer from "@/components/video-player";

export default function LibraryPage() {
    const [videos, setVideos] = useState([]);
    const [sortBy, setSortBy] = useState("date");
    const [sortOrder, setSortOrder] = useState("desc");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterFormat, setFilterFormat] = useState("all");

    // Fetch videos when the component mounts
    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await fetch("/api/videos");
                if (!response.ok) {
                    throw new Error("Failed to fetch videos");
                }
                const data = await response.json();
                setVideos(data);
            } catch (error) {
                console.error("Fetch videos error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVideos();
    }, []);

    // Sort videos based on the current sorting criteria and order
    const sortedVideos = [...videos].sort((a, b) => {
        if (sortBy === "date") {
            return sortOrder === "desc"
                ? new Date(b.date).getTime() - new Date(a.date).getTime()
                : new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortBy === "size") {
            return sortOrder === "desc" ? b.size - a.size : a.size - b.size;
        }
        return 0;
    });

    // Handle sorting by date or size
    const handleSort = (criteria) => {
        if (criteria === sortBy) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(criteria);
            setSortOrder("desc");
        }
    };

    // Handle video preview
    const handlePreview = (video) => {
        setSelectedVideo(video);
        setIsPreviewOpen(true);
    };

    // Handle download
    const handleDownload = (video) => {
        const savedHistory = localStorage.getItem("downloadHistory");
        let history = savedHistory ? JSON.parse(savedHistory) : [];

        const existingFile = history.find((item) => item.name === video.name);

        if (existingFile) {
            existingFile.date = new Date().toISOString();
        } else {
            history.push({
                name: video.name,
                size: video.size,
                date: new Date().toISOString(),
            });
        }

        localStorage.setItem("downloadHistory", JSON.stringify(history));
    };

    // Filter videos based on search query and format
    const filteredVideos = sortedVideos.filter((video) => {
        const matchesSearch = video.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFormat = filterFormat === "all" || video.name.endsWith(`.${filterFormat}`);
        return matchesSearch && matchesFormat;
    });

    // Get file icon based on format
    const getFileIcon = (fileName) => {
        const extension = fileName.split(".").pop();
        switch (extension) {
            case "mp4":
                return <FileVideo className="h-5 w-5 text-blue-500" />;
            case "avi":
                return <FileVideo className="h-5 w-5 text-purple-500" />;
            case "mkv":
                return <FileVideo className="h-5 w-5 text-green-500" />;
            case "mov":
                return <FileVideo className="h-5 w-5 text-red-500" />;
            default:
                return <FileVideo className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Video Library
                </h1>
                <Link href={"/upload"}>
                    <Button>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Video
                    </Button>
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={filterFormat === "all" ? "default" : "outline"}
                        onClick={() => setFilterFormat("all")}
                    >
                        All
                    </Button>
                    <Button
                        variant={filterFormat === "mp4" ? "default" : "outline"}
                        onClick={() => setFilterFormat("mp4")}
                    >
                        MP4
                    </Button>
                    <Button
                        variant={filterFormat === "mkv" ? "default" : "outline"}
                        onClick={() => setFilterFormat("mkv")}
                    >
                        MKV
                    </Button>
                    <Button
                        variant={filterFormat === "mov" ? "default" : "outline"}
                        onClick={() => setFilterFormat("mov")}
                    >
                        MOV
                    </Button>
                </div>
            </div>

            {/* Library Table */}
            <Card className="w-full hover:shadow-lg transition-shadow bg-card/50 backdrop-blur-md">
                <CardHeader>
                    <CardDescription className="text-muted-foreground">
                        All your compressed videos available for download.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        // Loading state for the table
                        <div className="space-y-4">
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-secondary hover:bg-secondary">
                                            <TableHead className="text-foreground font-medium">Name</TableHead>
                                            <TableHead className="text-foreground font-medium">Size (MB)</TableHead>
                                            <TableHead className="text-foreground font-medium">Date</TableHead>
                                            <TableHead className="text-foreground font-medium text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...Array(5)].map((_, index) => (
                                            <TableRow key={index} className="hover:bg-secondary/50">
                                                <TableCell className="text-foreground font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Skeleton className="h-4 w-4 rounded-full" />
                                                        <Skeleton className="h-4 w-48" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-foreground">
                                                    <Skeleton className="h-4 w-20" />
                                                </TableCell>
                                                <TableCell className="text-foreground">
                                                    <Skeleton className="h-4 w-32" />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Skeleton className="h-8 w-20 rounded-md" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : videos.length === 0 ? (
                        // No videos state
                        <div className="text-center py-12">
                            <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No videos yet</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Upload and compress your first video to see it here.
                            </p>
                            <Link href={"/upload"}>
                                <Button>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Video
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        // Actual content for the table
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-secondary hover:bg-secondary">
                                        <TableHead className="text-foreground font-medium">Name</TableHead>
                                        <TableHead
                                            className="text-foreground font-medium cursor-pointer"
                                            onClick={() => handleSort("size")}>
                                            <div className="flex items-center gap-1">
                                                Size (MB)
                                                {sortBy === "size" && (
                                                    <span>
                                                        {sortOrder === "desc" ? (
                                                            <ArrowDown className="h-4 w-4" />
                                                        ) : (
                                                            <ArrowUp className="h-4 w-4" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="text-foreground font-medium cursor-pointer"
                                            onClick={() => handleSort("date")}>
                                            <div className="flex items-center gap-1">
                                                Date
                                                {sortBy === "date" && (
                                                    <span>
                                                        {sortOrder === "desc" ? (
                                                            <ArrowDown className="h-4 w-4" />
                                                        ) : (
                                                            <ArrowUp className="h-4 w-4" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-foreground font-medium text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVideos.map((video) => (
                                        <TableRow
                                            key={video.name}
                                            className="hover:bg-secondary/50 cursor-pointer"
                                            onClick={() => handlePreview(video)}
                                        >
                                            <TableCell className="text-foreground font-medium">
                                                <div className="flex items-center gap-2">
                                                    {getFileIcon(video.name)}
                                                    <span className="max-w-[500px] truncate">{video.name}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {video.name.split(".").pop()}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        Preview Video
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-foreground">
                                                {(video.size / (1024 * 1024)).toFixed(2)} MB
                                            </TableCell>
                                            <TableCell className="text-foreground">
                                                {new Date(video.date).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownload(video);
                                                            }}
                                                            className="inline-flex items-center justify-center h-8 px-4 py-2 text-sm font-medium rounded-md">
                                                            <a
                                                                href={`/api/download/${video.name}?download=true`} // Add ?download=true
                                                                download={video.name} // Force download
                                                                className="inline-flex items-center justify-center">
                                                                <Download className="h-4 w-4 mr-1" />
                                                                Download
                                                            </a>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Download compressed video</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t p-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {filteredVideos.length} video{filteredVideos.length !== 1 ? "s" : ""}
                    </div>
                </CardFooter>
            </Card>

            {/* Video Preview Modal */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="sm:max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>Video Preview</DialogTitle>
                        <DialogDescription>
                            Preview of {selectedVideo?.name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedVideo && (
                        <div className="w-full">
                            <VideoPlayer src={`/api/download/${selectedVideo.name}`} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}