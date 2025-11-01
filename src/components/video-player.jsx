"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/custom-button";
import { Play, Pause, Volume2, Volume1, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const fmt = (s) => {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
};

function SeekBar({ value, onChange, "aria-label": ariaLabel }) {
    const barRef = useRef(null);

    const percentToTime = (clientX) => {
        const rect = barRef.current.getBoundingClientRect();
        const pct = ((clientX - rect.left) / rect.width) * 100;
        return Math.min(Math.max(pct, 0), 100);
    };

    const onPointerDown = (e) => {
        e.preventDefault();
        const move = (ev) => onChange(percentToTime(ev.clientX));
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    return (
        <div
            ref={barRef}
            role="slider"
            aria-label={ariaLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(value)}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "ArrowRight") onChange(Math.min(value + 1, 100));
                if (e.key === "ArrowLeft") onChange(Math.max(value - 1, 0));
                if (e.key === "Home") onChange(0);
                if (e.key === "End") onChange(100);
            }}
            className="relative w-full h-1 bg-white/20 rounded-full cursor-pointer"
            onClick={(e) => onChange(percentToTime(e.clientX))}
            onPointerDown={onPointerDown}
        >
            <motion.div
                className="absolute top-0 left-0 h-full bg-white rounded-full"
                style={{ width: `${value}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
        </div>
    );
}

export default function VideoPlayer({ src, className = "", videoClassName = "" }) {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [prevVolume, setPrevVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showControls, setShowControls] = useState(false);

    const onLoadedMeta = () => {
        const d = videoRef.current?.duration ?? 0;
        if (Number.isFinite(d)) setDuration(d);
    };

    const onTimeUpdate = () => {
        const v = videoRef.current;
        if (!v || !duration) return;
        const pct = (v.currentTime / duration) * 100;
        setCurrentTime(v.currentTime);
        setProgress(Number.isFinite(pct) ? Math.min(Math.max(pct, 0), 100) : 0);
    };

    const handleSeek = (pct) => {
        const v = videoRef.current;
        if (!v || !duration) return;
        const t = (pct / 100) * duration;
        v.currentTime = t;
        setProgress(pct);
        setCurrentTime(t);
    };

    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play(); else v.pause();
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

    const onVolumeChange = (pct) => {
        const v = videoRef.current;
        if (!v) return;
        const vol = pct / 100;
        v.volume = vol;
        v.muted = vol === 0;
        setIsMuted(vol === 0);
        setVolume(vol);
        if (vol > 0) setPrevVolume(vol);
    };

    const setSpeed = (s) => {
        const v = videoRef.current;
        if (!v) return;
        v.playbackRate = s;
        setPlaybackSpeed(s);
    };

    // sync playing state even if user taps OS controls, etc.
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        v.addEventListener("play", onPlay);
        v.addEventListener("pause", onPause);
        return () => {
            v.removeEventListener("play", onPlay);
            v.removeEventListener("pause", onPause);
        };
    }, []);

    return (
        <motion.div
            className={cn(
                // old: "relative w-full max-w-6xl mx-auto rounded-xl overflow-hidden ..."
                "relative w-full rounded-xl overflow-hidden bg-[#11111198] shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm",
                className
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}>
            <video
                ref={videoRef}
                className={cn(
                    // old: "w-full"
                    "w-full h-auto",
                    videoClassName
                )}
                src={src}
                preload="metadata"
                onLoadedMetadata={onLoadedMeta}
                onTimeUpdate={onTimeUpdate}
                onClick={togglePlay}
            />

            <AnimatePresence>
                {showControls && (
                    <motion.div
                        className="absolute bottom-0 mx-auto max-w-4xl left-0 right-0 p-4 m-2 bg-[#11111198] backdrop-blur-md rounded-2xl"
                        initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        exit={{ y: 20, opacity: 0, filter: "blur(10px)" }}
                        transition={{ duration: 0.4, ease: "circInOut" }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-white text-sm">{fmt(currentTime)}</span>
                            <SeekBar value={progress} onChange={handleSeek} aria-label="Seek" />
                            <span className="text-white text-sm">{fmt(duration)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button type="button" onClick={togglePlay} variant="ghost" size="icon" className="text-white hover:bg-[#111111d1]">
                                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                    </Button>
                                </motion.div>

                                <div className="flex items-center gap-2">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button type="button" onClick={toggleMute} variant="ghost" size="icon" className="text-white hover:bg-[#111111d1]">
                                            {isMuted ? <VolumeX className="h-5 w-5" /> : volume > 0.5 ? <Volume2 className="h-5 w-5" /> : <Volume1 className="h-5 w-5" />}
                                        </Button>
                                    </motion.div>
                                    <div className="w-28">
                                        <SeekBar value={volume * 100} onChange={onVolumeChange} aria-label="Volume" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {[0.5, 1, 1.5, 2].map((s) => (
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} key={s}>
                                        <Button
                                            type="button"
                                            onClick={() => setSpeed(s)}
                                            variant="ghost"
                                            size="icon"
                                            className={cn("text-white hover:bg-[#111111d1]", playbackSpeed === s && "bg-[#111111d1]")}
                                        >
                                            {s}x
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
