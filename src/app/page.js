"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { FileVideo, Upload, Download, Settings, Clock, Database } from "lucide-react";

// Small helpers
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState(null); // define the alert that was used

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/videos", { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const data = await res.json();
        // Optional: validate a little
        const safe = Array.isArray(data) ? data.filter(v => v?.name) : [];
        setVideos(safe);
      } catch (err) {
        if (err.name !== "AbortError") {
          setAlert({
            title: "Couldn’t load your videos",
            description: "Check that the local server is running, then retry.",
          });
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  const totalStorageUsed = useMemo(() => {
    const bytes = videos.reduce((acc, v) => acc + (Number(v?.size) || 0), 0);
    return formatBytes(bytes);
  }, [videos]);

  const mostRecentDate = useMemo(() => {
    if (videos.length === 0) return "N/A";
    const sorted = [...videos].sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0));
    const d = new Date(sorted[0]?.date);
    return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }, [videos]);

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Dashboard
        </h1>
        {/* Optional: prefetch navigation targets for snappier UX */}
        <div className="sr-only" aria-hidden="true">
          {/* next/navigation prefetch is automatic on Link, so keep links elsewhere if desired */}
        </div>
      </div>

      {/* Inline alert (non-blocking) */}
      {alert && (
        <div role="status" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <p className="font-medium">{alert.title}</p>
          <p className="text-muted-foreground">{alert.description}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </>
        ) : (
          <>
            <Card
              className="hover:shadow-lg transition-shadow bg-card text-card-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => router.push("/library")}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && router.push("/library")}
              aria-label="Open video library"
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-green-500/10 p-3 rounded-full">
                  <FileVideo className="h-6 w-6 text-green-500 dark:text-green-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Video Library</p>
                  <p className="text-lg font-bold text-green-500 dark:text-green-400">
                    {videos.length} Video{videos.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-card text-card-foreground">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-green-500/10 p-3 rounded-full">
                  <Database className="h-6 w-6 text-green-500 dark:text-green-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                  <p className="text-2xl font-bold text-green-500 dark:text-green-400">{totalStorageUsed}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-card text-card-foreground">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-blue-500 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Activity</p>
                  <p className="text-lg font-bold text-blue-500 dark:text-blue-400 truncate">{mostRecentDate}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </>
        ) : (
          <>
            <Card
              className="hover:shadow-lg transition-shadow bg-card text-card-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => router.push("/upload")}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && router.push("/upload")}
              aria-label="Upload and compress a new video"
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upload &amp; Compress</p>
                  <p className="text-lg font-bold text-primary">Start a New Compression</p>
                </div>
              </CardContent>
            </Card>

            {/* Ensure /settings route exists or adjust to /about if not */}
            <Card
              className="hover:shadow-lg transition-shadow bg-card text-card-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              onClick={() => router.push("/settings")}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && router.push("/settings")}
              aria-label="Open settings"
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-full">
                  <Settings className="h-6 w-6 text-blue-500 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Settings</p>
                  <p className="text-lg font-bold text-blue-500 dark:text-blue-400">Manage Preferences</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Activity */}
      <Card className="hover:shadow-lg transition-shadow bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            A summary of your recent video compressions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium mb-2">No recent activity</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Upload and compress your first video to see activity here.
              </p>
              <Button onClick={() => router.push("/upload")}>
                <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                Upload Video
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.slice(0, 3).map((video, idx) => (
                <div
                  key={video.id ?? `${video.name}-${idx}`}
                  className="flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <FileVideo className="h-6 w-6 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{video.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Compressed on{" "}
                        {(() => {
                          const d = new Date(video.date);
                          return Number.isNaN(d.getTime())
                            ? "unknown date"
                            : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
                        })()}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/download/${encodeURIComponent(video.name)}`} download>
                      <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                      Download
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
