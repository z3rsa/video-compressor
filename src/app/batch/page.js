"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileVideo, Upload, Zap, Info, X, AlertCircle, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

export default function BatchPage() {
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [alert, setAlert] = useState({ visible: false, title: "", description: "", type: "default" });
    const [size, setSize] = useState("");
    const [format, setFormat] = useState("mp4");
    const [preserveMetadata, setPreserveMetadata] = useState(false);
    const [preserveSubtitles, setPreserveSubtitles] = useState(false);
    const [enhancement, setEnhancement] = useState("none");
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Simulate initial loading
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Handle file selection for batch upload
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        processFiles(selectedFiles);
    };

    // Handle drag-and-drop
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        processFiles(droppedFiles);
    };

    // Process files (validation and state update)
    const processFiles = (files) => {
        if (files.length > 0) {
            const validFiles = files.filter((file) => {
                const fileSizeMB = file.size / (1024 * 1024);
                if (fileSizeMB > 100) {
                    setAlert({
                        visible: true,
                        title: "Error",
                        description: "File size must be less than 100MB.",
                        type: "error",
                    });
                    return false;
                } else if (!file.type.startsWith("video/")) {
                    setAlert({
                        visible: true,
                        title: "Error",
                        description: "Please upload a valid video file.",
                        type: "error",
                    });
                    return false;
                }
                return true;
            });
            setFiles(validFiles);
            setAlert({ visible: false, title: "", description: "", type: "default" });
        }
    };

    // Handle preset selection
    const handlePresetSelect = (preset) => {
        setSelectedPreset(preset);
        if (preset === "discord") {
            setSize("10");
            setFormat("mp4");
        } else if (preset === "twitter") {
            setSize("15");
            setFormat("mp4");
        } else if (preset === "whatsapp") {
            setSize("16");
            setFormat("mp4");
        } else {
            setSize("");
            setFormat("mp4");
        }
    };

    // Handle batch processing
    const handleBatchProcess = async () => {
        if (files.length === 0) {
            setAlert({
                visible: true,
                title: "Error",
                description: "Please select at least one file to process.",
                type: "error",
            });
            return;
        }

        if (!size) {
            setAlert({
                visible: true,
                title: "Error",
                description: "Please specify the desired file size.",
                type: "error",
            });
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        const formData = new FormData();
        files.forEach((file) => formData.append("videos", file));
        formData.append("size", size);
        formData.append("format", format);
        formData.append("preserveMetadata", preserveMetadata);
        formData.append("preserveSubtitles", preserveSubtitles);
        formData.append("enhancement", enhancement);

        try {
            const response = await fetch("/api/batch", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Batch processing failed");
            }

            const result = await response.json();
            setAlert({
                visible: true,
                title: "Success",
                description: result.message || "Batch processing completed successfully!",
                type: "success",
            });
            router.push("/library");
        } catch (error) {
            console.error("Batch processing error:", error);
            setAlert({
                visible: true,
                title: "Error",
                description: "Error during batch processing. Please try again.",
                type: "error",
            });
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8 bg-background text-foreground">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">Batch Processing</h1>
            </div>

            {/* Alert */}
            {alert.visible && (
                <Alert
                    className={`mb-6 ${alert.type === "error"
                        ? "border-destructive"
                        : alert.type === "success"
                            ? "border-green-500 dark:border-green-400"
                            : ""
                        }`}
                >
                    <AlertCircle
                        className={`h-4 w-4 ${alert.type === "error"
                            ? "text-destructive"
                            : alert.type === "success"
                                ? "text-green-500 dark:text-green-400"
                                : ""
                            }`}
                    />
                    <AlertTitle
                        className={`${alert.type === "error"
                            ? "text-destructive"
                            : alert.type === "success"
                                ? "text-green-500 dark:text-green-400"
                                : ""
                            }`}
                    >
                        {alert.title}
                    </AlertTitle>
                    <AlertDescription>{alert.description}</AlertDescription>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAlert({ visible: false, title: "", description: "", type: "default" })}
                        className="absolute top-2 right-2"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </Alert>
            )}

            {/* Batch Processing Card */}
            <Card className="w-full hover:shadow-lg transition-shadow bg-card text-card-foreground">
                <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Batch Processing
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Upload multiple video files and process them in a batch.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        // Loading state for the form
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-32 rounded-lg" />
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <div className="space-y-4 bg-secondary/50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-5 rounded-full" />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                </div>
                            </div>
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            {/* File Upload */}
                            <div className="space-y-2">
                                <Label htmlFor="batch-upload" className="text-sm font-medium text-foreground">
                                    Video Files
                                </Label>
                                <div
                                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${files.length > 0 ? "border-primary bg-primary/5" : isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-secondary/50"
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        id="batch-upload"
                                        name="batch-upload"
                                        accept="video/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        multiple
                                    />
                                    <label htmlFor="batch-upload" className="text-center cursor-pointer">
                                        {files.length > 0 ? (
                                            <div className="space-y-2">
                                                <div className="bg-primary/10 p-3 rounded-full mx-auto flex gap-2 items-center">
                                                    <FileVideo className="h-6 w-6 text-primary" />
                                                    {files.length} file(s) selected
                                                </div>
                                                <p className="text-xs text-primary">Click to change</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="bg-secondary p-3 rounded-full mx-auto flex items-center justify-center gap-2">
                                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                                    <span>{isDragging ? "Drop the files here" : "Upload Files"}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Drag and drop files here or click to browse
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Supports MP4, MOV, AVI, and other video formats (max 100MB per file)
                                                </p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <Separator />

                            {/* Preset and Size Selection */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-primary" />
                                    <h3 className="text-lg font-medium">Compression Settings</h3>
                                </div>

                                {/* Preset Selector */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="preset"
                                        className="text-sm font-medium text-foreground flex items-center gap-1"
                                    >
                                        Preset
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Choose a preset for common platforms or customize your own settings</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </Label>
                                    <Select onValueChange={handlePresetSelect}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a preset" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="discord">Discord (Max 10MB)</SelectItem>
                                            <SelectItem value="twitter">Twitter (Max 15MB)</SelectItem>
                                            <SelectItem value="whatsapp">WhatsApp (Max 16MB)</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Size Input */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="size"
                                        className="text-sm font-medium text-foreground flex items-center gap-1"
                                    >
                                        Target File Size (MB)
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>The maximum size your compressed video will be</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </Label>
                                    <Input
                                        type="number"
                                        id="size"
                                        name="size"
                                        placeholder="Enter size in MB"
                                        value={size}
                                        disabled={selectedPreset && selectedPreset !== "custom"}
                                        onChange={(e) => setSize(e.target.value)}
                                        className="w-full bg-background text-foreground"
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Advanced Options */}
                            <div className="space-y-4 bg-secondary/50 p-4 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-primary" />
                                    <h3 className="text-md font-medium">Advanced Options</h3>
                                </div>

                                {/* Output Format */}
                                <div className="space-y-2">
                                    <Label htmlFor="format" className="text-sm font-medium text-foreground">
                                        Output Format
                                    </Label>
                                    <Select
                                        onValueChange={(value) => setFormat(value)}
                                        value={format}
                                        disabled={
                                            selectedPreset === "discord" ||
                                            selectedPreset === "twitter" ||
                                            selectedPreset === "whatsapp"
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select format" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mp4">MP4</SelectItem>
                                            <SelectItem value="mkv">MKV</SelectItem>
                                            <SelectItem value="webm">WebM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Metadata & Subtitle Preservation */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground">Preservation Options</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="flex items-center space-x-2 bg-background p-3 rounded-md">
                                            <Checkbox
                                                id="metadata"
                                                checked={preserveMetadata}
                                                onCheckedChange={setPreserveMetadata}
                                            />
                                            <Label htmlFor="metadata" className="text-sm cursor-pointer">
                                                Preserve Metadata
                                            </Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Preserve metadata such as title, author, and creation date from the original video file.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="flex items-center space-x-2 bg-background p-3 rounded-md">
                                            <Checkbox
                                                id="subtitles"
                                                checked={preserveSubtitles}
                                                onCheckedChange={setPreserveSubtitles}
                                            />
                                            <Label htmlFor="subtitles" className="text-sm cursor-pointer">
                                                Preserve Subtitles
                                            </Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Keep subtitles from the original video file in the compressed output.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>

                                {/* Enhancement */}
                                <div className="space-y-2">
                                    <Label htmlFor="enhancement" className="text-sm font-medium text-foreground">
                                        Video Enhancement
                                    </Label>
                                    <Select onValueChange={(value) => setEnhancement(value)} value={enhancement}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select enhancement" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="noise-reduction">Noise Reduction</SelectItem>
                                            <SelectItem value="sharpness">Sharpness</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {isProcessing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Processing...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            )}

                            {/* Compress Button */}
                            <Button
                                type="submit"
                                onClick={handleBatchProcess}
                                disabled={isProcessing || files.length === 0}
                                className="w-full"
                                size="lg"
                            >
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                        Processing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Zap className="h-5 w-5" />
                                        Start Batch Processing
                                    </span>
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}