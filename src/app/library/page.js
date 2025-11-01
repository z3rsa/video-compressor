"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { Download, FileVideo, Filter, Search, X, Link as LinkIcon, RefreshCw } from "lucide-react";
import VideoPlayer from "@/components/video-player";

/* ---------------- utils ---------------- */

const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

const formatDate = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? "Unknown"
        : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const extOf = (name = "") => name.split(".").pop()?.toLowerCase() || "";

const iconFor = (name) => {
    const ext = extOf(name);
    const color =
        {
            mp4: "text-blue-500",
            mkv: "text-green-500",
            mov: "text-red-500",
            avi: "text-purple-500",
            webm: "text-emerald-500",
            m4v: "text-cyan-500",
        }[ext] || "text-gray-500";
    return <FileVideo className={`h-5 w-5 ${color}`} aria-hidden="true" />;
};

/* ---------------- page ---------------- */

export default function LibraryPage() {
    const router = useRouter();

    // data
    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // controls
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterFormat, setFilterFormat] = useState("all"); // all | mp4 | webm | mkv | mov | avi | m4v
    const [sortBy, setSortBy] = useState("date"); // date | size | name
    const [sortOrder, setSortOrder] = useState("desc"); // asc | desc

    // preview dialog
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const abortRef = useRef(null);

    const load = async () => {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        setIsLoading(true);
        setFetchError(null);

        try {
            const res = await fetch("/api/videos", { signal: ctrl.signal, cache: "no-store" });
            if (!res.ok) throw new Error(`Failed to fetch videos (${res.status})`);
            const data = await res.json();
            setVideos(Array.isArray(data) ? data : []);
        } catch (e) {
            if (e.name !== "AbortError") {
                setFetchError(e.message || "Unable to load videos.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
        return () => abortRef.current?.abort();
    }, []);

    // debounce search input
    useEffect(() => {
        const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 200);
        return () => clearTimeout(t);
    }, [searchInput]);

    const sortedVideos = useMemo(() => {
        const arr = [...videos];
        if (sortBy === "date") {
            arr.sort((a, b) =>
                sortOrder === "desc"
                    ? new Date(b?.date || 0) - new Date(a?.date || 0)
                    : new Date(a?.date || 0) - new Date(b?.date || 0)
            );
        } else if (sortBy === "size") {
            arr.sort((a, b) => (sortOrder === "desc" ? (b?.size || 0) - (a?.size || 0) : (a?.size || 0) - (b?.size || 0)));
        } else if (sortBy === "name") {
            arr.sort((a, b) =>
                sortOrder === "desc"
                    ? String(b?.name || "").localeCompare(String(a?.name || ""))
                    : String(a?.name || "").localeCompare(String(b?.name || ""))
            );
        }
        return arr;
    }, [videos, sortBy, sortOrder]);

    const filteredVideos = useMemo(() => {
        return sortedVideos.filter((v) => {
            const okSearch = searchQuery ? String(v?.name || "").toLowerCase().includes(searchQuery) : true;
            const ext = extOf(v?.name);
            const okFormat = filterFormat === "all" ? true : ext === filterFormat;
            return okSearch && okFormat;
        });
    }, [sortedVideos, searchQuery, filterFormat]);

    const handlePreview = (video) => {
        setSelectedVideo(video);
        setPreviewOpen(true);
    };

    const handleCopyLink = async (video) => {
        try {
            const url = `${location.origin}/api/download/${encodeURIComponent(video.name)}`;
            await navigator.clipboard.writeText(url);
        } catch { }
    };

    // Persist a history entry (keeps max 500)
    function appendDownloadHistory(entry) {
        try {
            const raw = localStorage.getItem("downloadHistory");
            const arr = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(arr) ? arr : [];

            // avoid exact duplicates in a row
            const last = list[0];
            const sameAsLast = last && last.name === entry.name && last.size === entry.size;
            if (!sameAsLast) list.unshift(entry);

            // cap size
            if (list.length > 500) list.length = 500;

            localStorage.setItem("downloadHistory", JSON.stringify(list));
        } catch { }
    }

    function recordAndDownload(video) {
        // fallback size if API didn't return it
        const size = Number(video?.size) || 0;
        appendDownloadHistory({
            name: String(video?.name || "file"),
            size,
            date: new Date().toISOString(),
        });
        // then let the browser continue with the navigation/download
    }


    /* ---------------- render ---------------- */

    return (
        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background text-foreground">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Library
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Browse, preview, and download your compressed videos.
                    </p>
                </div>
                <Button variant="secondary" onClick={load}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {fetchError && (
                <Alert className="mb-4 border-destructive/30 bg-destructive/10">
                    <AlertTitle>Failed to load</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            )}

            {/* Controls */}
            <Card className="mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Filters & Sorting</CardTitle>
                    <CardDescription>Refine your view to find files quickly.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        {searchInput && (
                            <Button variant="ghost" size="icon" onClick={() => setSearchInput("")} aria-label="Clear search">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Format */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={filterFormat} onValueChange={setFilterFormat}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All formats</SelectItem>
                                <SelectItem value="mp4">MP4</SelectItem>
                                <SelectItem value="webm">WEBM</SelectItem>
                                <SelectItem value="mkv">MKV</SelectItem>
                                <SelectItem value="mov">MOV</SelectItem>
                                <SelectItem value="avi">AVI</SelectItem>
                                <SelectItem value="m4v">M4V</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort by */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date">Sort by Date</SelectItem>
                            <SelectItem value="size">Sort by Size</SelectItem>
                            <SelectItem value="name">Sort by Name</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Order */}
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Order" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Newest / Largest / Z→A</SelectItem>
                            <SelectItem value="asc">Oldest / Smallest / A→Z</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Your Videos</CardTitle>
                    <CardDescription>
                        {isLoading ? "Loading…" : `${filteredVideos.length} item${filteredVideos.length === 1 ? "" : "s"}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-5 w-5 rounded" />
                                        <Skeleton className="h-4 w-56" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-8 w-20 rounded" />
                                        <Skeleton className="h-8 w-24 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredVideos.length === 0 ? (
                        <div className="text-center py-12">
                            <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                            <h3 className="text-lg font-medium mb-2">No videos found</h3>
                            <p className="text-sm text-muted-foreground">
                                Try changing filters or refresh after a new compression.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card">
                                    <TableRow>
                                        <TableHead className="w-[40%]">Name</TableHead>
                                        <TableHead className="w-[15%]">Format</TableHead>
                                        <TableHead className="w-[15%]">Size</TableHead>
                                        <TableHead className="w-[20%]">Date</TableHead>
                                        <TableHead className="w-[10%]" align="right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVideos.map((video, idx) => (
                                        <TableRow
                                            key={`${video?.name || "video"}-${idx}-${video?.date || "d"}`}
                                            tabIndex={0}
                                            role="button"
                                            onKeyDown={(e) => e.key === "Enter" && handlePreview(video)}
                                            onClick={() => handlePreview(video)}
                                            className="hover:bg-secondary/50 focus:bg-secondary/50 outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                        >
                                            <TableCell className="flex items-center gap-2">
                                                {iconFor(video?.name)}
                                                <span className="truncate" title={video?.name}>{video?.name || "Untitled"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="uppercase">
                                                    {extOf(video?.name) || "—"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatBytes(Number(video?.size))}</TableCell>
                                            <TableCell>{formatDate(video?.date)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Button asChild size="sm" variant="outline">
                                                        <a
                                                            href={`/api/download/${encodeURIComponent(video?.name || "")}?download=true`}
                                                            download={video?.name || undefined}
                                                            rel="noopener"
                                                            onClick={() => recordAndDownload(video)}   // <-- add this
                                                        >
                                                            <Download className="h-4 w-4 mr-1" />
                                                            Download
                                                        </a>
                                                    </Button>

                                                    <Button size="sm" variant="ghost" onClick={() => handleCopyLink(video)}>
                                                        <LinkIcon className="h-4 w-4 mr-1" />
                                                        Copy link
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Preview dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="sm:max-w-[95vw] lg:max-w-[85vw] xl:max-w-[75vw] max-h-[90vh] p-4 overflow-hidden">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="truncate">{selectedVideo?.name || "Preview"}</DialogTitle>
                        <DialogDescription className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="uppercase">{extOf(selectedVideo?.name) || "—"}</Badge>
                            <Badge variant="secondary">{formatBytes(Number(selectedVideo?.size))}</Badge>
                            <span className="text-muted-foreground">{formatDate(selectedVideo?.date)}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {selectedVideo && (
                        <div className="mt-2 relative w-full aspect-video max-h-[70vh] overflow-hidden rounded-lg bg-black">
                            {/* The player will be instructed to fully fit this box */}
                            <VideoPlayer
                                src={`/api/download/${encodeURIComponent(selectedVideo.name)}`}
                                className="absolute inset-0"
                                videoClassName="w-full h-full object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </main>
    );
}
