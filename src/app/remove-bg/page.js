"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";

export default function RemoveBgPage() {
    const [file, setFile] = useState(null);
    const [model, setModel] = useState("auto"); // default to "auto"
    const [alphaMatting, setAlphaMatting] = useState(false);
    const [returnMask, setReturnMask] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");
    const [resultUrl, setResultUrl] = useState("");

    const onChoose = (e) => {
        const f = e.target.files?.[0];
        setFile(f || null);
        setResultUrl("");
        setError("");
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setResultUrl("");
        if (!file) return setError("Please select an image.");

        const fd = new FormData();
        fd.append("file", file, file.name);
        if (model && model !== "auto") fd.append("model", model);
        if (alphaMatting) fd.append("alphaMatting", "true");
        if (returnMask) fd.append("returnMask", "true");

        setIsProcessing(true);
        try {
            const res = await fetch("/api/remove-bg", { method: "POST", body: fd });
            if (!res.ok) {
                let msg = `Failed (${res.status})`;
                try { const j = await res.json(); msg = j?.message || msg; } catch { }
                throw new Error(msg);
            }
            const blob = await res.blob();
            setResultUrl(URL.createObjectURL(blob));
        } catch (err) {
            setError(err.message || "Unexpected error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background text-foreground">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Remove Background
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Upload an image to remove its background locally using rembg.
                </p>
            </div>

            {error && (
                <Alert className="mb-4 border-destructive/30 bg-destructive/10">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: picker & preview */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            Select Image
                        </CardTitle>
                        <CardDescription>PNG/JPG/WebP recommended for best results.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed rounded-xl p-6 text-center">
                            <input type="file" accept="image/*" id="image" className="hidden" onChange={onChoose} />
                            <label htmlFor="image" className="cursor-pointer inline-flex flex-col items-center gap-2">
                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                                <span className="font-medium">Click to choose an image</span>
                                <span className="text-sm text-muted-foreground">or drag & drop into this area</span>
                            </label>
                        </div>

                        {/* Previews */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Original</Label>
                                <div className="bg-secondary/50 rounded-lg p-2 min-h-[200px] flex items-center justify-center">
                                    {file ? <img src={URL.createObjectURL(file)} alt="original" className="max-h-80 rounded-md" /> : <span className="text-sm text-muted-foreground">No file selected</span>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Result</Label>
                                <div className="bg-secondary/50 rounded-lg p-2 min-h-[200px] flex items-center justify-center">
                                    {resultUrl ? <img src={resultUrl} alt="result" className="max-h-80 rounded-md" /> : <span className="text-sm text-muted-foreground">Process to see output</span>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right: options & submit */}
                <Card>
                    <CardHeader>
                        <CardTitle>Options</CardTitle>
                        <CardDescription>Models & output controls</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Model</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger><SelectValue placeholder="Auto (default)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto</SelectItem>
                                    <SelectItem value="u2net">u2net</SelectItem>
                                    <SelectItem value="isnet-general-use">isnet-general-use</SelectItem>
                                    <SelectItem value="birefnet-general">birefnet-general</SelectItem>
                                    <SelectItem value="sam">sam</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Alpha matting</Label>
                                <p className="text-xs text-muted-foreground">Smoother edges</p>
                            </div>
                            <Switch checked={alphaMatting} onCheckedChange={setAlphaMatting} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Return mask only</Label>
                                <p className="text-xs text-muted-foreground">Grayscale mask instead of RGBA</p>
                            </div>
                            <Switch checked={returnMask} onCheckedChange={setReturnMask} />
                        </div>

                        <Button type="submit" className="w-full" disabled={isProcessing || !file}>
                            {isProcessing ? "Processing…" : "Remove Background"}
                        </Button>

                        {resultUrl && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={async () => {
                                    const a = document.createElement("a");
                                    a.href = resultUrl;
                                    a.download = (file?.name?.replace(/\.[^.]+$/, "") || "output") + (returnMask ? ".mask.png" : ".png");
                                    a.click();
                                }}
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Download Result
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </form>
        </main>
    );
}
