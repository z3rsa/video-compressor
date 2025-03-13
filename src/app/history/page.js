"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component

export default function HistoryPage() {
    const [downloadHistory, setDownloadHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Add loading state

    // Load history from localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem("downloadHistory");
        if (savedHistory) {
            setDownloadHistory(JSON.parse(savedHistory));
        }
        setIsLoading(false); // Set loading to false after fetching data
    }, []);

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8 bg-background text-foreground">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">Download History</h1>
            </div>

            {/* Download History Card */}
            <Card className="w-full hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Download History
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        View your download history for compressed videos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        // Loading state with Skeleton
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : downloadHistory.length === 0 ? (
                        // Empty state
                        <div className="text-center py-12">
                            <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No download history yet</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Compress and download videos to see them here.
                            </p>
                            <Button asChild>
                                <a href="/upload">Go to Upload</a>
                            </Button>
                        </div>
                    ) : (
                        // Table with download history
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Downloaded On</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {downloadHistory.map((item) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileVideo className="h-4 w-4 text-primary" />
                                                {item.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(item.date).toLocaleString()}</TableCell>
                                        <TableCell>{(item.size / (1024 * 1024)).toFixed(2)} MB</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={`/api/download/${item.name}`} download>
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}