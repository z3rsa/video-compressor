"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileVideo, Download, Upload, ArrowDown, ArrowUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton from shadcn/ui

export default function LibraryPage() {
    const [videos, setVideos] = useState([]);
    const [sortBy, setSortBy] = useState("date");
    const [sortOrder, setSortOrder] = useState("desc");
    const [isLoading, setIsLoading] = useState(true); // Add loading state

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
                setIsLoading(false); // Set loading to false after fetching
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

    const handleDownload = (video) => {
        const savedHistory = localStorage.getItem("downloadHistory");
        let history = savedHistory ? JSON.parse(savedHistory) : [];

        console.log(video);

        // Check if the file already exists in history
        const existingFile = history.find((item) => item.name === video.name);

        if (existingFile) {
            // Update the date of the existing file
            existingFile.date = new Date().toISOString();
        } else {
            // Add the new file to the history
            history.push({
                name: video.name,
                size: video.size,
                date: new Date().toISOString(),
            });
        }

        // Save the updated history back to localStorage
        localStorage.setItem("downloadHistory", JSON.stringify(history));
    };


    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8 bg-background text-foreground">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">Video Library</h1>
            </div>

            {/* Library Table */}
            <Card className="w-full hover:shadow-lg transition-shadow bg-card text-card-foreground">
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
                                    {sortedVideos.map((video) => (
                                        <TableRow key={video.name} className="hover:bg-secondary/50">
                                            <TableCell className="text-foreground font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileVideo className="h-4 w-4 text-primary" />
                                                    <span className="max-w-[200px]">{video.name}</span>
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
                                                        <Button onClick={() => handleDownload(video)} className="inline-flex items-center justify-center h-8 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                                                            <a href={`/api/download/${video.name}`} className="inline-flex items-center justify-center">
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
                        Showing {videos.length} video{videos.length !== 1 ? "s" : ""}
                    </div>
                    <Link href={"/upload"}>
                        <Button>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Video
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}