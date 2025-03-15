"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/custom-button"; // Use custom button
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, Volume1, VolumeX, Scissors } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const VideoTrimmer = ({ file, onTrim }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showControls, setShowControls] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isTrimming, setIsTrimming] = useState(false);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(100);
    const [isTrimApplied, setIsTrimApplied] = useState(false);

    const togglePlay = (e) => {
        e.preventDefault(); // Prevent form submission
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleVolumeChange = (value) => {
        if (videoRef.current) {
            const newVolume = value / 100;
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(newVolume === 0);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const progress =
                (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(isFinite(progress) ? progress : 0);
            setCurrentTime(videoRef.current.currentTime);
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (value) => {
        if (videoRef.current && videoRef.current.duration) {
            const time = (value / 100) * videoRef.current.duration;
            if (isFinite(time)) {
                videoRef.current.currentTime = time;
                setProgress(value);
                setCurrentTime(time);
            }
        }
    };

    const toggleMute = (e) => {
        e.preventDefault(); // Prevent form submission
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
            if (!isMuted) {
                setVolume(0);
            } else {
                setVolume(1);
                videoRef.current.volume = 1;
            }
        }
    };

    const setSpeed = (speed, e) => {
        e.preventDefault(); // Prevent form submission
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
            setPlaybackSpeed(speed);
        }
    };

    const handleTrimStart = (e) => {
        e.preventDefault(); // Prevent form submission
        setTrimStart(progress);
    };

    const handleTrimEnd = (e) => {
        e.preventDefault(); // Prevent form submission
        setTrimEnd(progress);
    };

    const applyTrim = (e) => {
        e.preventDefault(); // Prevent form submission

        if (!file || !videoRef.current) return;

        const startTime = (trimStart / 100) * videoRef.current.duration;
        const endTime = (trimEnd / 100) * videoRef.current.duration;

        // Validate startTime and endTime
        if (startTime < 0 || endTime > videoRef.current.duration || startTime >= endTime) {
            console.error("Invalid trim range");
            return;
        }

        // Pass the trim range to the parent component
        onTrim({ startTime, endTime });
        setIsTrimming(false);
        setIsTrimApplied(true); // Indicate that trim is applied
    };

    return (
        <div
            className="relative w-full max-w-6xl mx-auto rounded-xl overflow-hidden bg-[#11111198] shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Video Preview Area */}
            <video
                ref={videoRef}
                preload="none"
                className="w-full"
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
            >
                <source src={URL.createObjectURL(file)} type="video/mp4" />
            </video>

            {/* Trim Tool Label */}
            {isTrimming && (
                <div className="absolute top-4 left-4 bg-primary/90 text-background font-medium px-3 py-1 rounded-md text-sm">
                    Trim Mode
                </div>
            )}

            {showControls && (
                <div className="absolute bottom-0 mx-auto max-w-4xl left-0 right-0 p-4 m-2 bg-[#11111198] backdrop-blur-md rounded-2xl">
                    {/* Current Time Display */}
                    <div className="text-white text-sm mb-2">
                        Current Time: {formatTime(currentTime)}
                    </div>

                    {/* Timeline/Seek Bar with Trim Handles */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="relative flex-1 h-2 bg-gray-600 rounded-full">
                            {/* Grey Area (Non-Trimmed) */}
                            <div
                                className="absolute top-0 h-full bg-gray-400 rounded-full"
                                style={{
                                    left: "0%",
                                    width: `${trimStart}%`,
                                }}
                            />
                            {/* White Area (Trimmed) */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="absolute top-0 h-full bg-white rounded-full"
                                        style={{
                                            left: `${trimStart}%`,
                                            width: `${trimEnd - trimStart}%`,
                                        }}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    Trimmed Area: {formatTime((trimStart / 100) * duration)} to {formatTime((trimEnd / 100) * duration)}
                                </TooltipContent>
                            </Tooltip>
                            {/* Grey Area (Non-Trimmed) */}
                            <div
                                className="absolute top-0 h-full bg-gray-400 rounded-full"
                                style={{
                                    left: `${trimEnd}%`,
                                    width: `${100 - trimEnd}%`,
                                }}
                            />
                            {/* Slider Thumb */}
                            <Slider
                                value={[progress]}
                                onValueChange={(value) => handleSeek(value[0])}
                                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {/* Visible Slider Thumb */}
                            <div
                                className="absolute top-0 h-2 bg-transparent"
                                style={{
                                    left: `${progress}%`,
                                    transform: "translateX(-50%)",
                                }}
                            >
                                <div className="h-3 w-1 bg-white rounded-full" />
                            </div>
                        </div>
                    </div>

                    {/* Time Markers */}
                    <div className="flex justify-between text-xs text-white mt-1">
                        {Array.from({ length: Math.ceil(duration) + 1 }).map((_, index) => (
                            <span key={index}>
                                {formatTime(index)}
                            </span>
                        ))}
                    </div>

                    {/* Trim Time Display */}
                    {isTrimming && (
                        <div className="flex justify-between text-sm text-white mb-2">
                            <span>Start: {formatTime((trimStart / 100) * duration)}</span>
                            <span>End: {formatTime((trimEnd / 100) * duration)}</span>
                        </div>
                    )}

                    {/* Playback Controls */}
                    <div className="flex items-center justify-between">
                        {/* Play Button and Volume Control */}
                        <div className="flex items-center gap-4">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={togglePlay}
                                        variant="ghost"
                                        size="icon"
                                        className="text-white hover:bg-[#111111d1] hover:text-white"
                                    >
                                        {isPlaying ? (
                                            <Pause className="h-5 w-5" />
                                        ) : (
                                            <Play className="h-5 w-5" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Play/Pause</TooltipContent>
                            </Tooltip>

                            <div className="flex items-center gap-x-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={toggleMute}
                                            variant="ghost"
                                            size="icon"
                                            className="text-white hover:bg-[#111111d1] hover:text-white"
                                        >
                                            {isMuted ? (
                                                <VolumeX className="h-5 w-5" />
                                            ) : volume > 0.5 ? (
                                                <Volume2 className="h-5 w-5" />
                                            ) : (
                                                <Volume1 className="h-5 w-5" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Mute/Unmute</TooltipContent>
                                </Tooltip>

                                <Slider
                                    value={[volume * 100]}
                                    onValueChange={(value) => handleVolumeChange(value[0])}
                                    className="w-24"
                                />
                            </div>
                        </div>

                        {/* Trim Controls */}
                        <div className="flex items-center gap-2">
                            {isTrimming ? (
                                <>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={handleTrimStart}
                                                variant="ghost"
                                                size="icon"
                                                className="text-white hover:bg-[#111111d1] hover:text-white"
                                            >
                                                <Scissors className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Set Start Time</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={handleTrimEnd}
                                                variant="ghost"
                                                size="icon"
                                                className="text-white hover:bg-[#111111d1] hover:text-white"
                                            >
                                                <Scissors className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Set End Time</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={applyTrim}
                                                variant="ghost"
                                                size="icon"
                                                className="text-white hover:bg-[#111111d1] hover:text-white"
                                            >
                                                Apply
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Apply Trim</TooltipContent>
                                    </Tooltip>
                                </>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setIsTrimming(true);
                                            }}
                                            variant="ghost"
                                            size="icon"
                                            className="text-white hover:bg-[#111111d1] hover:text-white"
                                        >
                                            <Scissors className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Trim Video</TooltipContent>
                                </Tooltip>
                            )}

                            {/* Playback Speed Controls */}
                            {[0.5, 1, 1.5, 2].map((speed) => (
                                <Tooltip key={speed}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={(e) => setSpeed(speed, e)}
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "text-white hover:bg-[#111111d1] hover:text-white",
                                                playbackSpeed === speed && "bg-[#111111d1]"
                                            )}
                                        >
                                            {speed}x
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Playback Speed: {speed}x</TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoTrimmer;