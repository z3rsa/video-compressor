"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import {
    Download,
    FileVideo,
    RefreshCw,
    X,
    Search,
    Link as LinkIcon,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Filter,
} from "lucide-react";

/* ---------------- utils ---------------- */

const fmtDate = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? "Unknown"
        : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const fmtBytes = (bytes) => {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return "0 MB";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(n) / Math.log(1024));
    const v = n / Math.pow(1024, i);
    return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
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
    return <FileVideo className={`h-4 w-4 ${color}`} aria-hidden="true" />;
};

/* ---------------- page ---------------- */

export default function HistoryPage() {
    const router = useRouter();

    const [items, setItems] = useState([]);        // [{ name, size, date }]
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // controls
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterFormat, setFilterFormat] = useState("all");
    const [sortBy, setSortBy] = useState("date");   // date | size | name
    const [sortOrder, setSortOrder] = useState("desc"); // asc | desc

    // pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // load from localStorage
    const load = () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            if (typeof window === "undefined") return;
            const raw = localStorage.getItem("downloadHistory");
            const parsed = raw ? JSON.parse(raw) : [];
            setItems(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
            setItems([]);
            setFetchError("Unable to read history from local storage.");
        } finally {
            setIsLoading(false);
            setPage(1);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 200);
        return () => clearTimeout(t);
    }, [searchInput]);

    const sorted = useMemo(() => {
        const arr = [...items];
        if (sortBy === "date") {
            arr.sort((a, b) =>
                sortOrder === "desc"
                    ? new Date(b?.date || 0) - new Date(a?.date || 0)
                    : new Date(a?.date || 0) - new Date(b?.date || 0)
            );
        } else if (sortBy === "size") {
            arr.sort((a, b) =>
                sortOrder === "desc" ? (b?.size || 0) - (a?.size || 0) : (a?.size || 0) - (b?.size || 0)
            );
        } else if (sortBy === "name") {
            arr.sort((a, b) =>
                sortOrder === "desc"
                    ? String(b?.name || "").localeCompare(String(a?.name || ""))
                    : String(a?.name || "").localeCompare(String(b?.name || ""))
            );
        }
        return arr;
    }, [items, sortBy, sortOrder]);

    const filtered = useMemo(() => {
        return sorted.filter((v) => {
            const okSearch = searchQuery ? String(v?.name || "").toLowerCase().includes(searchQuery) : true;
            const ext = extOf(v?.name);
            const okFormat = filterFormat === "all" ? true : ext === filterFormat;
            return okSearch && okFormat;
        });
    }, [sorted, searchQuery, filterFormat]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageSlice = filtered.slice(startIdx, endIdx);

    const clearHistory = () => {
        // eslint-disable-next-line no-alert
        if (!confirm("Clear download history?")) return;
        localStorage.removeItem("downloadHistory");
        setItems([]);
        setPage(1);
    };

    const handleCopyLink = async (it) => {
        try {
            const url = `${location.origin}/api/download/${encodeURIComponent(it?.name || "")}`;
            await navigator.clipboard.writeText(url);
        } catch { }
    };

    const handleDownload = (it) => {
        // open the encoded URL in same tab; keeping UI consistent
        const url = `/api/download/${encodeURIComponent(it?.name || "")}?download=true`;
        window.location.href = url;
    };

    /* --------------- render --------------- */

    return (
        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background text-foreground">
            {/* header */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Download History
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        A local record of your recent downloads (stored in your browser).
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={load}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    {!isLoading && items.length > 0 && (
                        <Button variant="destructive" onClick={clearHistory}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear history
                        </Button>
                    )}
                </div>
            </div>

            {fetchError && (
                <Alert className="mb-4 border-destructive/30 bg-destructive/10">
                    <AlertTitle>Could not load history</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            )}

            {/* controls */}
            <Card className="mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Find items</CardTitle>
                    <CardDescription>Search, filter, and sort your history.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* search */}
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by filename…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        {searchInput && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSearchInput("")}
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* format */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={filterFormat} onValueChange={setFilterFormat}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="mp4">MP4</SelectItem>
                                <SelectItem value="webm">WEBM</SelectItem>
                                <SelectItem value="mkv">MKV</SelectItem>
                                <SelectItem value="mov">MOV</SelectItem>
                                <SelectItem value="avi">AVI</SelectItem>
                                <SelectItem value="m4v">M4V</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* sort by */}
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

                    {/* order */}
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

            {/* list */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">History</CardTitle>
                    <CardDescription>
                        {isLoading ? "Loading…" : `${filtered.length} item${filtered.length === 1 ? "" : "s"}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-4 w-4 rounded" />
                                        <Skeleton className="h-4 w-60" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-8 w-20 rounded" />
                                        <Skeleton className="h-8 w-24 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                            <h3 className="text-lg font-medium mb-2">No history yet</h3>
                            <p className="text-sm text-muted-foreground">
                                Start by compressing or downloading a video from your Library.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead className="w-[45%]">Name</TableHead>
                                            <TableHead className="w-[20%]">Format</TableHead>
                                            <TableHead className="w-[15%]">Size</TableHead>
                                            <TableHead className="w-[20%]">Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pageSlice.map((it, idx) => (
                                            <TableRow
                                                key={`${it?.name || "item"}-${it?.date || idx}`}
                                                tabIndex={0}
                                                className="hover:bg-secondary/50 focus:bg-secondary/50 outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {iconFor(it?.name)}
                                                        <span className="truncate" title={it?.name}>{it?.name || "Untitled"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="uppercase">
                                                        {extOf(it?.name) || "—"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{fmtBytes(it?.size)}</TableCell>
                                                <TableCell>{fmtDate(it?.date)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => handleDownload(it)}>
                                                            <Download className="h-4 w-4 mr-1" />
                                                            Download
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => handleCopyLink(it)}>
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

                            {/* pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing <span className="font-medium">{startIdx + 1}</span>–<span className="font-medium">{Math.min(endIdx, filtered.length)}</span> of{" "}
                                    <span className="font-medium">{filtered.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                                        <SelectTrigger className="w-[110px]">
                                            <SelectValue placeholder="Page size" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10 / page</SelectItem>
                                            <SelectItem value="25">25 / page</SelectItem>
                                            <SelectItem value="50">50 / page</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage <= 1}
                                            aria-label="Previous page"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm px-2">
                                            Page <span className="font-medium">{currentPage}</span> / {pageCount}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                            disabled={currentPage >= pageCount}
                                            aria-label="Next page"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
