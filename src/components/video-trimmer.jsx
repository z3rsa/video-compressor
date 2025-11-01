"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/custom-button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, Volume1, VolumeX, Scissors } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const fmt = (s) => {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function VideoTrimmer({ file, onTrim }) {
    const videoRef = useRef(null);
    const barRef = useRef(null);
    const [objectUrl, setObjectUrl] = useState(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [prevVolume, setPrevVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    const [progressPct, setProgressPct] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const [isTrimming, setIsTrimming] = useState(false);
    const [trimStartPct, setTrimStartPct] = useState(0);
    const [trimEndPct, setTrimEndPct] = useState(100);

    // Create/revoke object URL safely
    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => {
            URL.revokeObjectURL(url);
            setObjectUrl(null);
        };
    }, [file]);

    // Duration once
    const onLoadedMeta = () => {
        const d = videoRef.current?.duration ?? 0;
        if (Number.isFinite(d)) setDuration(d);
    };

    // Derived trimmed bounds (seconds)
    const { minTime, maxTime, isFullRange } = useMemo(() => {
        const min = (trimStartPct / 100) * (duration || 0);
        const max = (trimEndPct / 100) * (duration || 0);
        return {
            minTime: Number.isFinite(min) ? min : 0,
            maxTime: Number.isFinite(max) ? max : 0,
            isFullRange: Math.round(trimStartPct) === 0 && Math.round(trimEndPct) === 100,
        };
    }, [trimStartPct, trimEndPct, duration]);

    // Keep playhead updated + loop inside trimmed range
    const onTimeUpdate = () => {
        const v = videoRef.current;
        if (!v || !duration) return;

        // If not full range, clamp + wrap at end
        if (!isFullRange) {
            // clamp lower
            if (v.currentTime < minTime) {
                v.currentTime = minTime;
            }
            // If we reached (or slightly overshot) the end, wrap to start & continue
            // epsilon helps avoid sticking on boundary due to frame/time rounding
            const epsilon = 0.05;
            if (v.currentTime >= maxTime - epsilon) {
                v.currentTime = minTime;
                if (!v.paused) v.play(); // keep playing on wrap
            }
        }

        // UI state
        const pct = (v.currentTime / duration) * 100;
        const clampedPct = isFullRange
            ? Math.min(Math.max(pct, 0), 100)
            : Math.min(Math.max(pct, trimStartPct), trimEndPct);

        setCurrentTime(v.currentTime);
        setProgressPct(Number.isFinite(clampedPct) ? clampedPct : 0);
    };

    // Ensure any external seeks remain inside the range
    const handleSeekAtClientX = (clientX) => {
        const bar = barRef.current;
        if (!bar || !duration) return;
        const rect = bar.getBoundingClientRect();
        let pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.min(Math.max(pct, 0), 100);
        if (!isFullRange) pct = Math.min(Math.max(pct, trimStartPct), trimEndPct);

        setProgressPct(pct);
        videoRef.current.currentTime = (pct / 100) * duration;
    };

    const onBarClick = (e) => handleSeekAtClientX(e.clientX);

    // Drag for playhead
    const onThumbPointerDown = (e) => {
        e.preventDefault();
        const move = (ev) => handleSeekAtClientX(ev.clientX);
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    // Drag for trim handles
    const makeTrimDrag = (which) => (e) => {
        e.preventDefault();
        const bar = barRef.current;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();

        const move = (ev) => {
            const pct = ((ev.clientX - rect.left) / rect.width) * 100;
            if (which === "start") {
                const next = Math.min(Math.max(pct, 0), trimEndPct - 1);
                setTrimStartPct(next);
                if (progressPct < next) handleSeekAtClientX(ev.clientX);
            } else {
                const next = Math.max(Math.min(pct, 100), trimStartPct + 1);
                setTrimEndPct(next);
                if (progressPct > next) handleSeekAtClientX(ev.clientX);
            }
        };

        const up = () => {
            // Emit trim once on release
            if (onTrim && duration) {
                const startTime = (trimStartPct / 100) * duration;
                const endTime = (trimEndPct / 100) * duration;
                onTrim({ startTime: Math.floor(startTime), endTime: Math.floor(endTime) });
            }
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    // Keep playhead inside bounds when trims change
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !duration) return;
        if (!isFullRange) {
            if (v.currentTime < minTime) v.currentTime = minTime;
            if (v.currentTime > maxTime) v.currentTime = minTime; // snap back inside
        }
    }, [trimStartPct, trimEndPct, minTime, maxTime, duration, isFullRange]);

    // Loop on native "ended" event if trimmed
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const onEnded = () => {
            if (!duration || isFullRange) return;
            v.currentTime = minTime;
            v.play();
        };

        v.addEventListener("ended", onEnded);
        return () => v.removeEventListener("ended", onEnded);
    }, [duration, isFullRange, minTime]);

    // Basic play/pause & volume controls
    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play(); else v.pause();
        setIsPlaying(!v.paused);
    };

    const toggleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        if (!isMuted) {
            setPrevVolume(volume || 0.6);
            v.muted = true;
            setIsMuted(true);
            setVolume(0);
        } else {
            v.muted = false;
            setIsMuted(false);
            v.volume = prevVolume;
            setVolume(prevVolume);
        }
    };

    const onVolumeSlider = (valArr) => {
        const v = videoRef.current;
        if (!v) return;
        const val = (valArr?.[0] ?? 0) / 100;
        v.volume = val;
        v.muted = val === 0;
        setIsMuted(val === 0);
        setVolume(val);
        if (val > 0) setPrevVolume(val);
    };

    // Time markers for the timeline
    const timeMarkers = useMemo(() => {
        const marks = [];
        const d = Math.floor(duration) || 0;
        if (!d) return marks;
        const interval = d <= 10 ? 1 : d <= 60 ? 5 : d <= 600 ? 30 : 60;
        for (let t = 0; t <= d; t += interval) marks.push(t);
        return marks;
    }, [duration]);

    const startLabel = fmt(minTime);
    const endLabel = fmt(maxTime);

    return (
        <div className="relative w-full max-w-6xl mx-auto rounded-xl overflow-hidden bg-[#11111198] shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm">
            <video
                ref={videoRef}
                className="w-full"
                preload="metadata"
                onLoadedMetadata={onLoadedMeta}
                onTimeUpdate={onTimeUpdate}
                onClick={togglePlay}
            >
                {objectUrl && <source src={objectUrl} type={file?.type || undefined} />}
            </video>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 m-2 bg-[#11111198] backdrop-blur-md rounded-2xl">
                {/* Timeline */}
                <div className="mb-2">
                    <div
                        ref={barRef}
                        className="relative h-2 bg-gray-600 rounded-full cursor-pointer"
                        onClick={onBarClick}
                        aria-label="Seek bar"
                    >
                        {/* left grey */}
                        <div className="absolute top-0 h-full bg-gray-400 rounded-full" style={{ left: "0%", width: `${trimStartPct}%` }} />
                        {/* active (white) */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="absolute top-0 h-full bg-white" style={{ left: `${trimStartPct}%`, width: `${trimEndPct - trimStartPct}%` }} />
                            </TooltipTrigger>
                            <TooltipContent>Trim: {startLabel} → {endLabel}</TooltipContent>
                        </Tooltip>
                        {/* right grey */}
                        <div className="absolute top-0 h-full bg-gray-400 rounded-full" style={{ left: `${trimEndPct}%`, width: `${100 - trimEndPct}%` }} />

                        {/* Playhead (draggable) */}
                        <div
                            role="slider"
                            aria-label="Current position"
                            aria-valuemin={Math.floor(trimStartPct)}
                            aria-valuemax={Math.floor(trimEndPct)}
                            aria-valuenow={Math.floor(progressPct)}
                            tabIndex={0}
                            onPointerDown={onThumbPointerDown}
                            className="absolute -top-3 h-8 w-1 bg-white rounded-full"
                            style={{ left: `${progressPct}%`, transform: "translateX(-50%)" }}
                        />

                        {/* Trim handles */}
                        <div
                            role="slider"
                            aria-label="Trim start"
                            aria-valuemin={0}
                            aria-valuemax={Math.floor(trimEndPct - 1)}
                            aria-valuenow={Math.floor(trimStartPct)}
                            tabIndex={0}
                            onPointerDown={makeTrimDrag("start")}
                            className="absolute -top-1.5 h-5 w-2 bg-white rounded cursor-ew-resize"
                            style={{ left: `${trimStartPct}%`, transform: "translateX(-125%)" }}
                        />
                        <div
                            role="slider"
                            aria-label="Trim end"
                            aria-valuemin={Math.floor(trimStartPct + 1)}
                            aria-valuemax={100}
                            aria-valuenow={Math.floor(trimEndPct)}
                            tabIndex={0}
                            onPointerDown={makeTrimDrag("end")}
                            className="absolute -top-1.5 h-5 w-2 bg-white rounded cursor-ew-resize"
                            style={{ left: `${trimEndPct}%`, transform: "translateX(30%)" }}
                        />
                    </div>

                    {/* Markers */}
                    <div className="relative mt-1 text-xs text-white select-none">
                        <div className="relative h-4">
                            {timeMarkers.map((t) => (
                                <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(t / (duration || 1)) * 100}%` }}>
                                    {fmt(t)}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Trim labels when active */}
                    {isTrimming && (
                        <div className="flex justify-between text-sm text-white mt-1">
                            <span>Start: {startLabel}</span>
                            <span>End: {endLabel}</span>
                        </div>
                    )}
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Tooltip><TooltipTrigger asChild>
                            <Button type="button" onClick={togglePlay} variant="ghost" size="icon" className="text-white hover:bg-[#111111d1]">
                                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                            </Button>
                        </TooltipTrigger><TooltipContent>Play/Pause</TooltipContent></Tooltip>

                        <div className="flex items-center gap-2">
                            <Tooltip><TooltipTrigger asChild>
                                <Button type="button" onClick={toggleMute} variant="ghost" size="icon" className="text-white hover:bg-[#111111d1]">
                                    {isMuted ? <VolumeX className="h-5 w-5" /> : volume > 0.5 ? <Volume2 className="h-5 w-5" /> : <Volume1 className="h-5 w-5" />}
                                </Button>
                            </TooltipTrigger><TooltipContent>Mute/Unmute</TooltipContent></Tooltip>

                            <Slider value={[volume * 100]} onValueChange={onVolumeSlider} className="w-28" />
                        </div>

                        <span className="text-xs text-white/90 ml-2">{fmt(currentTime)} / {fmt(duration)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isTrimming ? (
                            <Tooltip><TooltipTrigger asChild>
                                <Button type="button" onClick={() => setIsTrimming(true)} variant="ghost" size="icon" className="text-white hover:bg-[#111111d1]">
                                    <Scissors className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger><TooltipContent>Trim Video</TooltipContent></Tooltip>
                        ) : (
                            <>
                                <Tooltip><TooltipTrigger asChild>
                                    <Button type="button" onClick={() => setTrimStartPct(progressPct)} variant="ghost" size="icon" className="text-white hover:bg-[#111111d1]">
                                        <Scissors className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger><TooltipContent>Set Start</TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild>
                                    <Button type="button" onClick={() => setTrimEndPct(progressPct)} variant="ghost" size="icon" className="text-white hover:bg-[#111111d1]">
                                        <Scissors className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger><TooltipContent>Set End</TooltipContent></Tooltip>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
