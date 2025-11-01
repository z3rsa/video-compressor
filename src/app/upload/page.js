"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// app components
import VideoTrimmer from "@/components/video-trimmer";

// icons
import {
    Upload,
    Info,
    CheckCircle2,
    XCircle,
    FileVideo,
    Trash2,
    Scissors,
} from "lucide-react";

/**
 * Copy-paste friendly constants.
 * Keep UI hint text and validation in sync with these numbers.
 */
const MAX_PER_FILE_MB = 5000; // 5 GB per file
const MAX_TOTAL_MB = 5000; // 5 GB total selection (adjust if you want true multi-file sums > one file)

export default function UploadPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);

    // files
    const [files, setFiles] = useState([]); // File[]
    const [file, setFile] = useState(null); // first file for trimming
    const [fileError, setFileError] = useState("");
    const [customName, setCustomName] = useState("");

    // encode options
    const [selectedPreset, setSelectedPreset] = useState(""); // "", "discord", "twitter", "whatsapp", "custom"
    const [size, setSize] = useState(""); // MB (string input)
    const [format, setFormat] = useState("mp4");
    const [preserveMetadata, setPreserveMetadata] = useState(true);
    const [preserveSubtitles, setPreserveSubtitles] = useState(true);
    const [enhancement, setEnhancement] = useState("none"); // "none" | "stabilize" | "denoise" etc (if supported later)

    // trimming
    const [trimRange, setTrimRange] = useState({ startTime: 0, endTime: 0 });

    // ux
    const [isCompressing, setIsCompressing] = useState(false);
    const [progress, setProgress] = useState(0);

    // alert
    const [alert, setAlert] = useState(null); // {visible, title, description, type: "success" | "error" }

    // abort controller for submit
    const submitAbortRef = useRef(null);

    // derived: whether a preset locks the size field
    const sizeLockedByPreset = useMemo(() => selectedPreset && selectedPreset !== "custom", [selectedPreset]);

    /** --- Helpers --- */

    const openFilePicker = () => fileInputRef.current?.click();

    const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + " MB";

    const processFiles = (incoming) => {
        if (!incoming?.length) return;

        const filesArr = Array.from(incoming);

        const totalMB = filesArr.reduce((sum, f) => sum + f.size / (1024 * 1024), 0);
        if (totalMB > MAX_TOTAL_MB) {
            setFileError(`Total file size must be ≤ ${MAX_TOTAL_MB} MB.`);
            setFiles([]);
            setFile(null);
            return;
        }

        const valid = [];
        for (const f of filesArr) {
            const mb = f.size / (1024 * 1024);
            if (!f.type.startsWith("video/")) {
                setFileError("Please upload a valid video file.");
                continue;
            }
            if (mb > MAX_PER_FILE_MB) {
                setFileError(`Each file must be ≤ ${MAX_PER_FILE_MB} MB.`);
                continue;
            }
            valid.push(f);
        }

        setFiles(valid);
        setFile(valid[0] ?? null);
        setFileError(valid.length ? "" : "No valid files selected.");
    };

    const onDrop = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (isCompressing) return;
        const dropped = evt.dataTransfer?.files;
        processFiles(dropped);
    };

    const onDragOver = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
    };

    const handlePresetSelect = (preset) => {
        setSelectedPreset(preset);
        switch (preset) {
            case "discord":
                setSize("10"); // Discord cap ~10MB
                setFormat("mp4");
                break;
            case "twitter":
                setSize("15");
                setFormat("mp4");
                break;
            case "whatsapp":
                setSize("16");
                setFormat("mp4");
                break;
            case "custom":
            default:
                setSize("");
                setFormat("mp4");
                break;
        }
    };

    const handleTrim = ({ startTime, endTime }) => {
        // integers prevent drift server-side
        setTrimRange({
            startTime: Math.max(0, Math.floor(startTime || 0)),
            endTime: Math.max(0, Math.floor(endTime || 0)),
        });
    };

    const clearSelection = () => {
        setFiles([]);
        setFile(null);
        setFileError("");
        setTrimRange({ startTime: 0, endTime: 0 });
    };

    const removeAt = (idx) => {
        const copy = files.slice();
        copy.splice(idx, 1);
        setFiles(copy);
        setFile(copy[0] ?? null);
    };

    /** --- Submit --- */

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isCompressing) return;

        if (!files.length) {
            return setAlert({
                visible: true,
                title: "No file selected",
                description: "Choose at least one video file to compress.",
                type: "error",
            });
        }

        // Numeric validation
        const numericSize = Number(size);
        if (sizeLockedByPreset) {
            if (!Number.isFinite(numericSize) || numericSize <= 0) {
                return setAlert({
                    visible: true,
                    title: "Invalid size",
                    description: "Preset requires a valid positive size in MB.",
                    type: "error",
                });
            }
            if (selectedPreset === "discord" && numericSize > 10) {
                return setAlert({
                    visible: true,
                    title: "Discord preset overflow",
                    description: "Discord preset max is 10 MB.",
                    type: "error",
                });
            }
            if (selectedPreset === "twitter" && numericSize > 15) {
                return setAlert({
                    visible: true,
                    title: "Twitter/X preset overflow",
                    description: "Twitter preset max is 15 MB.",
                    type: "error",
                });
            }
            if (selectedPreset === "whatsapp" && numericSize > 16) {
                return setAlert({
                    visible: true,
                    title: "WhatsApp preset overflow",
                    description: "WhatsApp preset max is 16 MB.",
                    type: "error",
                });
            }
        } else {
            // custom
            if (!Number.isFinite(numericSize) || numericSize <= 0) {
                return setAlert({
                    visible: true,
                    title: "Invalid size",
                    description: "Enter a valid positive size in MB.",
                    type: "error",
                });
            }
        }

        // Build form data
        const formData = new FormData();
        // NOTE: If your API expects "file" (singular), replace the loop with formData.append("file", files[0]).
        files.forEach((f) => formData.append("files", f, f.name));
        formData.append("mode", files.length > 1 ? "batch" : "single");
        formData.append("customName", customName || "");
        formData.append("size", String(numericSize)); // MB
        formData.append("format", format);
        formData.append("preset", selectedPreset || "custom");
        formData.append("preserveMetadata", preserveMetadata ? "true" : "false");
        formData.append("preserveSubtitles", preserveSubtitles ? "true" : "false");
        formData.append("enhancement", enhancement);
        formData.append("trimStart", String(Math.max(0, Math.floor(trimRange.startTime))));
        formData.append("trimEnd", String(Math.max(0, Math.floor(trimRange.endTime))));

        // Abort & progress
        submitAbortRef.current?.abort();
        const ctrl = new AbortController();
        submitAbortRef.current = ctrl;

        setIsCompressing(true);
        setProgress(0);

        // optimistic progress: never claim 100% until server responds OK
        const interval = setInterval(() => {
            setProgress((p) => Math.min(p + 4, 95));
        }, 400);

        try {
            const res = await fetch("/api/compress", {
                method: "POST",
                body: formData,
                signal: ctrl.signal,
            });

            if (!res.ok) {
                let message = `Compression failed (${res.status})`;
                try {
                    const data = await res.json();
                    message = data?.message || message;
                } catch { }
                throw new Error(message);
            }

            const result = await res.json().catch(() => ({}));
            setProgress(100);

            setAlert({
                visible: true,
                title: "Success",
                description: result?.message || "Video compressed successfully!",
                type: "success",
            });

            // small delay so users can see 100%
            setTimeout(() => router.push("/library"), 350);
        } catch (err) {
            if (err.name !== "AbortError") {
                setAlert({
                    visible: true,
                    title: "Error",
                    description: err?.message || "Error during compression. Please try again.",
                    type: "error",
                });
            }
        } finally {
            clearInterval(interval);
            setIsCompressing(false);
        }
    };

    useEffect(() => {
        return () => {
            submitAbortRef.current?.abort();
        };
    }, []);

    /** --- JSX --- */

    return (
        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background text-foreground">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Upload & Compress
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Drop a video (or a few) and choose a target size. Works offline with your local server.
                </p>
            </div>

            {alert?.visible && (
                <Alert
                    className={`mb-4 ${alert.type === "error" ? "border-destructive/30 bg-destructive/10" : "border-green-500/30 bg-green-500/10"}`}
                >
                    {alert.type === "error" ? (
                        <XCircle className="h-4 w-4" />
                    ) : (
                        <CheckCircle2 className="h-4 w-4" />
                    )}
                    <AlertTitle>{alert.title}</AlertTitle>
                    <AlertDescription>{alert.description}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left: File picker + file list */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Trimmer or batch note */}
                    {file && files.length === 1 ? (
                        <Card className="transition-shadow hover:shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Scissors className="h-5 w-5 text-primary" />
                                    Trim Video (optional)
                                </CardTitle>
                                <CardDescription>Select a portion of the video to compress.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <VideoTrimmer file={file} onTrim={handleTrim} />
                            </CardContent>
                        </Card>
                    ) : files.length > 1 ? (
                        <Alert className="border-blue-500/30 bg-blue-500/10">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Batch mode</AlertTitle>
                            <AlertDescription>
                                Trimming is available for single-file uploads only.
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    <Card className={`transition-shadow hover:shadow-lg ${isCompressing ? "pointer-events-none opacity-70" : ""}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5 text-primary" />
                                Select Video{files.length !== 1 ? "s" : ""}
                            </CardTitle>
                            <CardDescription>
                                Max {MAX_PER_FILE_MB} MB per file • Total ≤ {MAX_TOTAL_MB} MB
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Drop zone */}
                            <div
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onClick={openFilePicker}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") openFilePicker();
                                }}
                                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label="Click or drag video files to upload"
                            >
                                <FileVideo className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                                <p className="font-medium">Drop your video files here</p>
                                <p className="text-sm text-muted-foreground">
                                    or click to choose from your computer
                                </p>
                                <input
                                    id="video"
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="video/*"
                                    multiple
                                    onChange={(e) => processFiles(e.target.files)}
                                />
                            </div>

                            {/* File error */}
                            {fileError && (
                                <p className="text-sm text-destructive mt-2">{fileError}</p>
                            )}

                            {/* Selected files */}
                            {files.length > 0 && (
                                <ul className="mt-4 space-y-2">
                                    {files.map((f, i) => (
                                        <li
                                            key={`${f.name}-${i}`}
                                            className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">{f.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatMB(f.size)}</p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0"
                                                onClick={() => removeAt(i)}
                                                aria-label={`Remove ${f.name}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Clear button */}
                            {files.length > 0 && (
                                <div className="mt-3">
                                    <Button type="button" variant="secondary" onClick={clearSelection}>
                                        Clear selection
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Options + submit */}
                <div className="space-y-4">
                    <Card className="transition-shadow hover:shadow-lg">
                        <CardHeader>
                            <CardTitle>Compression Options</CardTitle>
                            <CardDescription>Pick a preset or customize your target.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Custom File Name */}
                            <div className="space-y-2">
                                <Label htmlFor="customName">Output File Name</Label>
                                <Input
                                    id="customName"
                                    placeholder="e.g. MyVacationClip"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value.trimStart())}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave empty to auto-name as <code>Vicom 1</code>, <code>Vicom {`metadata`}</code>, or a timestamp.
                                </p>
                            </div>

                            {/* Preset */}
                            <div className="space-y-2">
                                <Label>Preset</Label>
                                <Select value={selectedPreset} onValueChange={handlePresetSelect}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a preset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="discord">Discord (Max 10MB)</SelectItem>
                                        <SelectItem value="twitter">Twitter/X (Max 15MB)</SelectItem>
                                        <SelectItem value="whatsapp">WhatsApp (Max 16MB)</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Size */}
                            <div className="space-y-2">
                                <Label htmlFor="size">Target size (MB)</Label>
                                <Input
                                    id="size"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder={sizeLockedByPreset ? "Preset controlled" : "e.g. 25"}
                                    value={size}
                                    onChange={(e) => setSize(e.target.value.replace(/[^\d.]/g, ""))}
                                    disabled={sizeLockedByPreset}
                                />
                                {sizeLockedByPreset && (
                                    <p className="text-xs text-muted-foreground">
                                        Controlled by <span className="font-medium">{selectedPreset}</span> preset.
                                    </p>
                                )}
                            </div>

                            {/* Format */}
                            <div className="space-y-2">
                                <Label htmlFor="format">Format</Label>
                                <Select value={format} onValueChange={setFormat}>
                                    <SelectTrigger id="format" className="w-full">
                                        <SelectValue placeholder="Choose format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mp4">MP4 (H.264/AAC)</SelectItem>
                                        <SelectItem value="webm">WEBM (VP9/Opus)</SelectItem>
                                        <SelectItem value="av1">MP4 (AV1/AAC)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Toggles */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Preserve metadata</Label>
                                    <p className="text-xs text-muted-foreground">Keep title, creation date, etc.</p>
                                </div>
                                <Switch checked={preserveMetadata} onCheckedChange={setPreserveMetadata} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Preserve subtitles</Label>
                                    <p className="text-xs text-muted-foreground">Retain embedded subtitle tracks.</p>
                                </div>
                                <Switch checked={preserveSubtitles} onCheckedChange={setPreserveSubtitles} />
                            </div>

                            {/* Enhancement (future) */}
                            <div className="space-y-2">
                                <Label htmlFor="enhancement">Enhancement (optional)</Label>
                                <Select value={enhancement} onValueChange={setEnhancement}>
                                    <SelectTrigger id="enhancement" className="w-full">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="stabilize">Stabilize (if supported)</SelectItem>
                                        <SelectItem value="denoise">Denoise (if supported)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="transition-shadow hover:shadow-lg">
                        <CardHeader>
                            <CardTitle>Start Compression</CardTitle>
                            <CardDescription>We’ll process locally via your server.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isCompressing || !files.length || !!fileError}
                            >
                                {isCompressing ? "Compressing…" : "Compress"}
                            </Button>

                            {/* Progress */}
                            {isCompressing && (
                                <div className="space-y-2">
                                    <Progress value={progress} />
                                    <p className="text-xs text-muted-foreground">
                                        {progress}% — don’t close this tab until it completes.
                                    </p>
                                </div>
                            )}

                            {/* Cancel */}
                            {isCompressing && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => {
                                        submitAbortRef.current?.abort();
                                        setIsCompressing(false);
                                        setProgress(0);
                                        setAlert({
                                            visible: true,
                                            title: "Canceled",
                                            description: "Upload/compression has been canceled.",
                                            type: "error",
                                        });
                                    }}
                                >
                                    Cancel
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </form>
        </main>
    );
}
