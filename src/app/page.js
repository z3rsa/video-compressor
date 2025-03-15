"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Moon,
  Sun,
  Upload,
  Download,
  FileVideo,
  Settings,
  Clock,
  Database,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton from shadcn/ui

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const router = useRouter();

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
        setAlert({
          visible: true,
          title: "Error",
          description: "Failed to fetch videos. Please try again later.",
          type: "error",
        });
      } finally {
        setIsLoading(false); // Set loading to false after fetching
      }
    };

    fetchVideos();
  }, []);

  // Calculate total storage used
  const totalStorageUsed = videos.reduce((acc, video) => acc + video.size, 0) / (1024 * 1024);

  // Get the most recent video date
  const mostRecentDate =
    videos.length > 0
      ? new Date(videos.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date).toLocaleString()
      : "N/A";

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Dashboard</h1>
      </div>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {isLoading ? (
          // Loading state for statistics cards
          <>
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </>
        ) : (
          // Actual content for statistics cards
          <>
            <Card
              className="hover:shadow-lg transition-shadow bg-card text-card-foreground cursor-pointer"
              onClick={() => router.push("/library")}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-green-500/10 p-3 rounded-full">
                  <FileVideo className="h-6 w-6 text-green-500 dark:text-green-400" />
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
                  <Database className="h-6 w-6 text-green-500 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                  <p className="text-2xl font-bold text-green-500 dark:text-green-400">
                    {totalStorageUsed.toFixed(2)} MB
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-card text-card-foreground">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-blue-500 dark:text-blue-400" />
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
          // Loading state for quick actions
          <>
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </>
        ) : (
          // Actual content for quick actions
          <>
            <Card
              className="hover:shadow-lg transition-shadow bg-card text-card-foreground cursor-pointer"
              onClick={() => router.push("/upload")}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upload & Compress</p>
                  <p className="text-lg font-bold text-primary">Start a New Compression</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-lg transition-shadow bg-card text-card-foreground cursor-pointer"
              onClick={() => router.push("/settings")}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-full">
                  <Settings className="h-6 w-6 text-blue-500 dark:text-blue-400" />
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
            <Clock className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            A summary of your recent video compressions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            // Loading state for recent activity
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex items-center justify-between p-4">
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
            // No videos state
            <div className="text-center py-12">
              <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No recent activity</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Upload and compress your first video to see activity here.
              </p>
              <Button onClick={() => router.push("/upload")}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </div>
          ) : (
            // Actual content for recent activity
            <div className="space-y-4">
              {videos.slice(0, 3).map((video) => (
                <div key={video.name} className="flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileVideo className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{video.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Compressed on {new Date(video.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/download/${video.name}`} download>
                      <Download className="h-4 w-4 mr-2" />
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