"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { RecordingStatus, Settings, ExportFormat } from "./types";
import GIF from "gif.js";

const initialSettings: Settings = {
  resolution: "1080",
  frameRate: "30",
  includeSystemAudio: true,
  includeMic: false,
  pipEnabled: false,
  highlightCursor: true,
  highlightClicks: true,
  followMouse: false,
  exportFormat: "video/webm",
};

export function useRecording() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mainStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const fullScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  // Zoom 区域自动捕获（录屏时鼠标点击）
  const autoZoomRegionsRef = useRef<any[]>([]); // [{time, x, y}]
  const recordingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Initialize the hidden video element on the client
    fullScreenVideoRef.current = document.createElement("video");
  }, []);

  const cleanupStreams = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    if (mainStreamRef.current) {
      mainStreamRef.current.getTracks().forEach((track) => track.stop());
      mainStreamRef.current = null;
    }

    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
    if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = null;

    if (fullScreenVideoRef.current) {
      fullScreenVideoRef.current.srcObject = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const drawZoomedFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = fullScreenVideoRef.current;
    if (!canvas || !video || video.videoWidth === 0) {
      animationFrameId.current = requestAnimationFrame(drawZoomedFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { videoWidth, videoHeight } = video;
    canvas.width = parseInt(settings.resolution, 10);
    canvas.height = (canvas.width / videoWidth) * videoHeight;

    const zoomFactor = 2;
    const sourceWidth = videoWidth / zoomFactor;
    const sourceHeight = videoHeight / zoomFactor;

    let sourceX = mousePos.current.x * (videoWidth / canvas.clientWidth) - sourceWidth / 2;
    let sourceY = mousePos.current.y * (videoHeight / canvas.clientHeight) - sourceHeight / 2;

    sourceX = Math.max(0, Math.min(videoWidth - sourceWidth, sourceX));
    sourceY = Math.max(0, Math.min(videoHeight - sourceHeight, sourceY));

    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    animationFrameId.current = requestAnimationFrame(drawZoomedFrame);
  }, [settings.resolution]);

  const startRecording = useCallback(async () => {
    cleanupStreams();
    setStatus("recording");
    recordedChunksRef.current = [];
    setVideoUrl(null);
    recordingStartTimeRef.current = Date.now(); // 录制开始时间
  
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: parseInt(settings.resolution, 10) },
          frameRate: parseInt(settings.frameRate),
        },
        audio: settings.includeSystemAudio,
      });
  
      let streamToRecord: MediaStream;
      const audioTracks: MediaStreamTrack[] = [];
  
      if (settings.includeSystemAudio && displayStream.getAudioTracks().length > 0) {
        audioTracks.push(...displayStream.getAudioTracks());
      }
      if (settings.includeMic) {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioTracks.push(...micStream.getAudioTracks());
      }
  
      if (settings.followMouse) {
        if (fullScreenVideoRef.current) {
          fullScreenVideoRef.current.srcObject = displayStream;
          await fullScreenVideoRef.current.play();
        }
  
        // Wait a bit for the first frame to be available
        await new Promise(resolve => setTimeout(resolve, 200));
        
        drawZoomedFrame();
  
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not found");
        
        const canvasStream = canvas.captureStream(parseInt(settings.frameRate, 10));
        streamToRecord = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioTracks
        ]);

      } else {
        if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = displayStream;
        }
        if (canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        
        streamToRecord = new MediaStream([
            ...displayStream.getVideoTracks(),
            ...audioTracks
        ]);
      }
  
      if (settings.pipEnabled) {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cameraPreviewRef.current) {
          cameraPreviewRef.current.srcObject = cameraStream;
        }
      }
  
      mainStreamRef.current = displayStream;
  
      const mimeType =
        settings.exportFormat === "video/mp4" &&
        MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : "video/webm";
  
      const recorder = new MediaRecorder(streamToRecord, { mimeType });
      mediaRecorderRef.current = recorder;
  
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
  
      recorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) {
            console.error("Recording stopped with no data.");
            toast({
                title: "Recording Error",
                description: "No video data was captured. Please try again.",
                variant: "destructive",
            });
            setStatus("idle");
            cleanupStreams();
            return;
        }
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStatus("preview");
        cleanupStreams();
      };
  
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === "recording" || mediaRecorderRef.current?.state === "paused") {
          stopRecording();
        }
      };
  
      recorder.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description: "Could not start recording. Please check permissions and try again.",
        variant: "destructive",
      });
      cleanupStreams();
      setStatus("idle");
    }
  }, [
    settings,
    cleanupStreams,
    drawZoomedFrame,
    toast,
  ]);
  
  // 导出自动捕获的 zoom 区域（供录屏结束后同步到编辑器）
  const getAutoZoomRegions = useCallback(() => {
    return autoZoomRegionsRef.current.map(z => ({
      id: `zoom-mouse-${Math.floor(z.time * 1000)}`,
      type: 'zoom',
      zoomType: 'mouse',
      start: Math.max(0, z.time - 0.1),
      end: z.time + 0.3,
      zoomCenter: { x: z.x, y: z.y },
      zoomLevel: 1.5,
      zoomSize: { width: 200, height: 200 },
    }));
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current?.state === "recording" ||
      mediaRecorderRef.current?.state === "paused"
    ) {
      mediaRecorderRef.current.stop();
      // 录屏结束时保存自动 zoom 区域到 localStorage
      const autoZooms = getAutoZoomRegions();
      if (autoZooms && autoZooms.length > 0) {
        localStorage.setItem('autoZoomRegions', JSON.stringify(autoZooms));
      } else {
        localStorage.removeItem('autoZoomRegions');
      }
    }
    // 录制结束时间
    if (recordingStartTimeRef.current) {
      const endTime = Date.now();
      const duration = (endTime - recordingStartTimeRef.current) / 1000; // 秒
      setRecordingDuration(duration);
    }
  }, [getAutoZoomRegions]);

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setStatus("paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setStatus("recording");
    }
  };

  const convertToGif = useCallback(async (videoUrl: string) => {
    setStatus("converting");
    toast({
      title: "Converting to GIF",
      description: "This may take a few moments...",
    });
  
    const video = document.createElement("video");
    video.src = videoUrl;
    video.muted = true;
  
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });
  
    const canvas = document.createElement("canvas");
    const MAX_WIDTH = 480;
    const aspectRatio = video.videoWidth / video.videoHeight;
    canvas.width = MAX_WIDTH;
    canvas.height = MAX_WIDTH / aspectRatio;

    const context = canvas.getContext("2d");
  
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: canvas.width,
      height: canvas.height,
    });
  
    let currentTime = 0;
    const duration = video.duration;
    const interval = 1 / Math.min(parseInt(settings.frameRate, 10), 15);
  
    video.currentTime = 0;
    await new Promise(resolve => {
        if(video.seekable.length > 0) video.onseeked = resolve;
        else resolve(null);
    });

    while (currentTime < duration) {
        if (!context) break;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        gif.addFrame(context, { copy: true, delay: interval * 1000 });
        currentTime += interval;
        video.currentTime = currentTime;
        await new Promise(resolve => {
            if(video.seekable.length > 0) video.onseeked = resolve;
            else resolve(null);
        });
    }
  
    gif.on("finished", function (blob) {
      const url = URL.createObjectURL(blob);
      setVideoUrl(url); // Update the videoUrl to the GIF url
      setStatus("preview");
      toast({
        title: "Conversion Complete",
        description: "Your GIF is ready for download.",
      });
      
      // Trigger download directly
      const a = document.createElement("a");
      a.href = url;
      a.download = `ScreenVerse-recording-${new Date().toISOString()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  
    gif.render();
  }, [toast, settings.frameRate]);

  const handleDownload = () => {
    if (videoUrl) {
      if (settings.exportFormat === "image/gif") {
        convertToGif(videoUrl);
        return;
      }
      const a = document.createElement("a");
      a.href = videoUrl;
      const extension = settings.exportFormat.split("/")[1].split(";")[0];
      a.download = `ScreenVerse-recording-${new Date().toISOString()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      mousePos.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
  }, []);

  const handleClick = (event: MouseEvent) => {
    const clickEffect = document.createElement("div");
    clickEffect.className = "click-effect";
    clickEffect.style.left = `${event.clientX}px`;
    clickEffect.style.top = `${event.clientY}px`;
    document.body.appendChild(clickEffect);
    setTimeout(() => {
      clickEffect.remove();
    }, 500);
  };
  
  const handleCursor = (event: MouseEvent) => {
    const cursor = document.querySelector(".cursor-highlight") as HTMLElement;
    if (cursor) {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    }
  };

  // 录屏时全局监听鼠标点击
  useEffect(() => {
    if (status === 'recording') {
      recordingStartTimeRef.current = Date.now();
      const handleGlobalClick = (e: MouseEvent) => {
        // 计算录屏进度（秒）
        const now = Date.now();
        const time = ((now - (recordingStartTimeRef.current || now)) / 1000);
        // 屏幕坐标转百分比
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        autoZoomRegionsRef.current.push({ time, x, y });
      };
      window.addEventListener('mousedown', handleGlobalClick);
      return () => {
        window.removeEventListener('mousedown', handleGlobalClick);
        recordingStartTimeRef.current = null;
      };
    }
  }, [status]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);
  
  useEffect(() => {
    if (settings.highlightClicks) {
      document.addEventListener("click", handleClick);
    } else {
      document.removeEventListener("click", handleClick);
    }
    return () => document.removeEventListener("click", handleClick);
  }, [settings.highlightClicks]);
  
  useEffect(() => {
    const cursorEl = document.querySelector(".cursor-highlight");
    if (settings.highlightCursor) {
      if (!cursorEl) {
        const newCursor = document.createElement("div");
        newCursor.className = "cursor-highlight";
        document.body.appendChild(newCursor);
      }
      document.addEventListener("mousemove", handleCursor);
    } else {
      if (cursorEl) {
        cursorEl.remove();
      }
      document.removeEventListener("mousemove", handleCursor);
    }
    return () => {
      document.removeEventListener("mousemove", handleCursor);
      const el = document.querySelector(".cursor-highlight");
      if (el) el.remove();
    };
  }, [settings.highlightCursor]);

  return {
    status,
    settings,
    setSettings: (updater: (prev: Settings) => Settings) => setSettings(updater),
    videoUrl,
    videoPreviewRef,
    cameraPreviewRef,
    canvasRef,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    handleDownload,
    isClient,
    getAutoZoomRegions, // 新增：导出自动 zoom 区域
    recordingDuration, // 新增：录制时长
  };
}
