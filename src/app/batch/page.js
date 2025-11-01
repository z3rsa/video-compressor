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

// icons
import {
    Upload,
    Info,
    CheckCircle2,
    XCircle,
    FileVideo,
    Trash2,
    Settings2,
} from "lucide-react";

/** Keep this aligned with your /api/batch limit */
const MAX_PER_FILE_MB = 500; // 500 MB per file

export default function BatchPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const submitAbortRef = useRef(null);

    // files
    const [files, setFiles] = useState([]);
    const [fileError, setFileError] = useState("");

    // options
    const [selectedPreset, setSelectedPreset] = useState(""); // "", "discord","twitter","whatsapp","custom"
    const [size, setSize] = useState(""); // MB
    const [format, setFormat] = useState("mp4");
    const [preserveMetadata, setPreserveMetadata] = useState(false);
    const [preserveSubtitles, setPreserveSubtitles] = useState(false);
    const [enhancement, setEnhancement] = useState("none");

    // ux
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [alert, setAlert] = useState(null); // {visible, title, description, type}

    const sizeLockedByPreset = useMemo(
        () => selectedPreset && selectedPreset !== "custom",
        [selectedPreset]
    );

    const openFilePicker = () => fileInputRef.current?.click();
    const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + " MB";

    const processFiles = (incoming) => {
        if (!incoming?.length) return;

        const valid = [];
        for (const f of Array.from(incoming)) {
            const mb = f.size / (1024 * 1024);
            if (!f.type.startsWith("video/")) {
                setFileError("Please upload valid video files.");
                continue;
            }
            if (mb > MAX_PER_FILE_MB) {
                setFileError(`Each file must be ≤ ${MAX_PER_FILE_MB} MB.`);
                continue;
            }
            valid.push(f);
        }

        setFiles(valid);
        setFileError(valid.length ? "" : "No valid files selected.");
    };

    const onDrop = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (isProcessing) return;
        processFiles(evt.dataTransfer?.files);
    };
    const onDragOver = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
    };

    const removeAt = (idx) => {
        const copy = files.slice();
        copy.splice(idx, 1);
        setFiles(copy);
    };

    const clearSelection = () => {
        setFiles([]);
        setFileError("");
    };

    const handlePresetSelect = (preset) => {
        setSelectedPreset(preset);
        switch (preset) {
            case "discord":
                setSize("10");
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isProcessing) return;

        if (!files.length) {
            return setAlert({
                visible: true,
                title: "No files selected",
                description: "Choose at least one video to process.",
                type: "error",
            });
        }

        const numericSize = Number(size);
        if (!Number.isFinite(numericSize) || numericSize <= 0) {
            return setAlert({
                visible: true,
                title: "Invalid size",
                description: "Enter a valid positive size in MB.",
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

        // Build FormData
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f, f.name)); // unified with /api/batch
        formData.append("size", String(numericSize));
        formData.append("format", format);
        formData.append("preset", selectedPreset || "custom");
        formData.append("preserveMetadata", preserveMetadata ? "true" : "false");
        formData.append("preserveSubtitles", preserveSubtitles ? "true" : "false");
        formData.append("enhancement", enhancement);

        // Abort + progress
        submitAbortRef.current?.abort();
        const ctrl = new AbortController();
        submitAbortRef.current = ctrl;

        setIsProcessing(true);
        setProgress(0);

        const interval = setInterval(() => {
            setProgress((p) => Math.min(p + 4, 95));
        }, 400);

        try {
            const res = await fetch("/api/batch", {
                method: "POST",
                body: formData,
                signal: ctrl.signal,
            });

            if (!res.ok) {
                let message = `Batch processing failed (${res.status})`;
                try {
                    const data = await res.json();
                    message = data?.message || message;
                } catch { }
                throw new Error(message);
            }

            await res.json().catch(() => ({}));
            setProgress(100);

            setAlert({
                visible: true,
                title: "Success",
                description: "Batch processing completed successfully!",
                type: "success",
            });

            setTimeout(() => router.push("/library"), 350);
        } catch (err) {
            if (err.name !== "AbortError") {
                setAlert({
                    visible: true,
                    title: "Error",
                    description: err?.message || "Error during batch processing. Please try again.",
                    type: "error",
                });
            }
        } finally {
            clearInterval(interval);
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        return () => {
            submitAbortRef.current?.abort();
        };
    }, []);

    return (
        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background text-foreground">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Batch Compress
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Drop multiple videos and choose a target size. We’ll process each one using your local server.
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
                {/* Left: picker + list */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className={`transition-shadow hover:shadow-lg ${isProcessing ? "pointer-events-none opacity-70" : ""}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5 text-primary" />
                                Select Videos
                            </CardTitle>
                            <CardDescription>
                                Max {MAX_PER_FILE_MB} MB per file
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
                                    id="videos"
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="video/*"
                                    multiple
                                    onChange={(e) => processFiles(e.target.files)}
                                />
                            </div>

                            {/* File error */}
                            {fileError && <p className="text-sm text-destructive mt-2">{fileError}</p>}

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

                            {/* Clear */}
                            {files.length > 0 && (
                                <div className="mt-3">
                                    <Button type="button" variant="secondary" onClick={clearSelection}>
                                        Clear selection
                                    </Button>
                                </div>
                            )}

                            {/* Batch note */}
                            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                                <Info className="h-4 w-4 mt-0.5" />
                                <p>Trimming is available on the single-file Upload page only.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: options + submit */}
                <div className="space-y-4">
                    <Card className="transition-shadow hover:shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-primary" />
                                Compression Options
                            </CardTitle>
                            <CardDescription>Pick a preset or customize your target.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                                        <SelectItem value="mkv">MKV (H.264/AAC)</SelectItem>
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

                            {/* Enhancement (optional) */}
                            <div className="space-y-2">
                                <Label htmlFor="enhancement">Enhancement (optional)</Label>
                                <Select value={enhancement} onValueChange={setEnhancement}>
                                    <SelectTrigger id="enhancement" className="w-full">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="noise-reduction">Noise Reduction</SelectItem>
                                        <SelectItem value="sharpness">Sharpness</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="transition-shadow hover:shadow-lg">
                        <CardHeader>
                            <CardTitle>Start Batch</CardTitle>
                            <CardDescription>Each file will be processed to the target size.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isProcessing || !files.length || !!fileError}
                            >
                                {isProcessing ? "Processing…" : "Start"}
                            </Button>

                            {/* Progress / Cancel */}
                            {isProcessing && (
                                <>
                                    <div className="space-y-2">
                                        <Progress value={progress} />
                                        <p className="text-xs text-muted-foreground">{progress}% — don’t close this tab.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => {
                                            submitAbortRef.current?.abort();
                                            setIsProcessing(false);
                                            setProgress(0);
                                            setAlert({
                                                visible: true,
                                                title: "Canceled",
                                                description: "Batch processing has been canceled.",
                                                type: "error",
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </form>
        </main>
    );
}
