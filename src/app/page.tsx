"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Monitor,
  Mic,
  Video,
  Settings,
  MousePointer,
  Download,
  Clapperboard,
  Film,
  Play,
  Pause,
  StopCircle,
  VideoOff,
  Webcam,
  ChevronDown,
  ArrowRight,
  Pencil,
  Shapes,
  Highlighter,
  Loader2,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import GIF from 'gif.js';

type RecordingStatus = "idle" | "recording" | "paused" | "preview";
type ExportFormat = "video/webm" | "video/mp4" | "image/gif";

const ZOOM_LEVEL = 2.0;
const SMOOTHING_FACTOR = 0.15;

export default function Home() {
  const { toast } = useToast();

  // Settings State
  const [resolution, setResolution] = useState("1080");
  const [frameRate, setFrameRate] = useState("30");
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  const [includeMic, setIncludeMic] = useState(false);
  const [pipEnabled, setPipEnabled] = useState(false);
  const [highlightCursor, setHighlightCursor] = useState(false);
  const [highlightClicks, setHighlightClicks] = useState(false);
  const [followMouseZoom, setFollowMouseZoom] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("video/webm");

  // Recording State
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isConverting, setIsConverting] = useState(false);


  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mainStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const highlightCursorRef = useRef<HTMLDivElement>(null);
  const clickAnimationContainerRef = useRef<HTMLDivElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const videoBlobRef = useRef<Blob | null>(null);

  // For zoom/follow effect
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const smoothedMousePosRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    setIsClient(true);
    // Initialize the video element only on the client side
    fullScreenVideoRef.current = document.createElement('video');
  }, []);

  const drawZoomedFrame = useCallback(() => {
    if (!followMouseZoom || !fullScreenVideoRef.current || !canvasRef.current) {
      animationFrameRef.current = undefined; // Stop loop if conditions are not met
      return;
    }

    const video = fullScreenVideoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(drawZoomedFrame);
      return;
    }

    // Smooth the mouse position
    smoothedMousePosRef.current.x += (mousePosRef.current.x - smoothedMousePosRef.current.x) * SMOOTHING_FACTOR;
    smoothedMousePosRef.current.y += (mousePosRef.current.y - smoothedMousePosRef.current.y) * SMOOTHING_FACTOR;
    
    const { videoWidth, videoHeight } = video;
    const { width: canvasWidth, height: canvasHeight } = canvas;
    
    const zoomWidth = videoWidth / ZOOM_LEVEL;
    const zoomHeight = videoHeight / ZOOM_LEVEL;

    // Convert screen mouse coordinates to video coordinates
    const mouseVideoX = (smoothedMousePosRef.current.x / window.innerWidth) * videoWidth;
    const mouseVideoY = (smoothedMousePosRef.current.y / window.innerHeight) * videoHeight;

    let sourceX = mouseVideoX - zoomWidth / 2;
    let sourceY = mouseVideoY - zoomHeight / 2;

    // Clamp the source rectangle to stay within the video bounds
    sourceX = Math.max(0, Math.min(videoWidth - zoomWidth, sourceX));
    sourceY = Math.max(0, Math.min(videoHeight - zoomHeight, sourceY));
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(video, sourceX, sourceY, zoomWidth, zoomHeight, 0, 0, canvasWidth, canvasHeight);

    animationFrameRef.current = requestAnimationFrame(drawZoomedFrame);
  }, [followMouseZoom]);

  const cleanupStreams = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    if (mainStreamRef.current) {
      mainStreamRef.current.getTracks().forEach((track) => track.stop());
      mainStreamRef.current = null;
    }
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
    if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = null;
    if (fullScreenVideoRef.current) {
        fullScreenVideoRef.current.srcObject = null;
        fullScreenVideoRef.current.pause();
    }
  }, []);

  // Mouse move listeners
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (highlightCursor && highlightCursorRef.current) {
        highlightCursorRef.current.style.left = `${event.clientX}px`;
        highlightCursorRef.current.style.top = `${event.clientY}px`;
      }
      if (followMouseZoom) {
        mousePosRef.current = { x: event.clientX, y: event.clientY };
      }
    };
    
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [highlightCursor, followMouseZoom]);

  // Click highlighting effect
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (highlightClicks && clickAnimationContainerRef.current) {
        const clickEffect = document.createElement("div");
        clickEffect.className = "click-effect";
        clickEffect.style.left = `${event.clientX - 10}px`; // Adjust for size
        clickEffect.style.top = `${event.clientY - 10}px`; // Adjust for size
        clickAnimationContainerRef.current.appendChild(clickEffect);
        clickEffect.addEventListener("animationend", () => clickEffect.remove());
      }
    };
    
    if (highlightClicks) {
      document.addEventListener("click", handleClick);
    }

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [highlightClicks]);

  const startRecording = useCallback(async () => {
    cleanupStreams();
    setStatus("recording");
    recordedChunksRef.current = [];
    videoBlobRef.current = null;
    setVideoUrl(null);

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: parseInt(resolution),
          height: parseInt(resolution) * (9/16),
          frameRate: parseInt(frameRate),
          cursor: followMouseZoom ? "none" : "always", // Hide system cursor if we are zooming
        },
        audio: includeSystemAudio,
      });

      let audioStream = new MediaStream();
      displayStream.getAudioTracks().forEach(track => audioStream.addTrack(track));

      if (includeMic) {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getAudioTracks().forEach(track => audioStream.addTrack(track));
      }
      
      let recordingSourceStream: MediaStream;

      if (followMouseZoom) {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not found");

        const video = fullScreenVideoRef.current;
        if (!video) throw new Error("Video element for zoom not initialized");

        const {width, height} = displayStream.getVideoTracks()[0].getSettings();
        canvas.width = width || 1920;
        canvas.height = height || 1080;

        video.srcObject = displayStream;
        video.muted = true;
        await video.play();

        mousePosRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        smoothedMousePosRef.current = mousePosRef.current;

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(drawZoomedFrame);
        
        recordingSourceStream = canvas.captureStream(parseInt(frameRate));
        audioStream.getAudioTracks().forEach(track => recordingSourceStream.addTrack(track));

      } else {
        recordingSourceStream = new MediaStream();
        displayStream.getVideoTracks().forEach(track => recordingSourceStream.addTrack(track));
        audioStream.getAudioTracks().forEach(track => recordingSourceStream.addTrack(track));
      }

      if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = recordingSourceStream;
      }

      mainStreamRef.current = new MediaStream([
          ...recordingSourceStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
          ...(displayStream.getAudioTracks()),
      ]);

      if (pipEnabled) {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cameraPreviewRef.current) {
          cameraPreviewRef.current.srcObject = cameraStream;
        }
      }
      
      const mimeType = exportFormat === "video/mp4" && MediaRecorder.isTypeSupported("video/mp4") 
        ? "video/mp4" 
        : "video/webm";
      
      const recorder = new MediaRecorder(mainStreamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        videoBlobRef.current = blob;
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
  }, [resolution, frameRate, includeSystemAudio, includeMic, pipEnabled, cleanupStreams, toast, exportFormat, followMouseZoom, drawZoomedFrame]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording" || mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setStatus("paused");
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setStatus("recording");
      if (!animationFrameRef.current && followMouseZoom) {
        animationFrameRef.current = requestAnimationFrame(drawZoomedFrame);
      }
    }
  };

  const convertToGif = async (videoBlob: Blob) => {
    setIsConverting(true);
    toast({ title: 'Converting to GIF...', description: 'This may take a moment.' });
  
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    
    await new Promise(resolve => {
        video.onloadedmetadata = resolve;
    });

    await video.play();

    const MAX_WIDTH = 480;
    const aspectRatio = video.videoWidth / video.videoHeight;
    const canvasWidth = Math.min(MAX_WIDTH, video.videoWidth);
    const canvasHeight = canvasWidth / aspectRatio;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast({ title: 'Error', description: 'Could not create canvas context.', variant: 'destructive' });
      setIsConverting(false);
      return;
    }

    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: canvas.width,
        height: canvas.height,
        workerScript: '/gif.worker.js'
    });

    const duration = video.duration;
    const frameInterval = 1 / parseInt(frameRate, 10); // 1 / fps

    return new Promise<void>(resolvePromise => {
        gif.on('finished', (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ScreenVerse-recording-${new Date().toISOString()}.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsConverting(false);
            toast({ title: 'Success!', description: 'GIF downloaded.' });
            video.pause();
            resolvePromise();
        });

        const addFrameAtTime = async (time: number) => {
            if (time > duration) {
                gif.render();
                return;
            }
            video.currentTime = time;
            await new Promise(r => video.onseeked = r);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            gif.addFrame(ctx, {copy: true, delay: frameInterval * 1000});
            addFrameAtTime(time + frameInterval);
        };

        addFrameAtTime(0);
    });
  };


  const handleDownload = () => {
    if (exportFormat === 'image/gif') {
      if (videoBlobRef.current) {
        convertToGif(videoBlobRef.current);
      } else {
        toast({ title: 'Error', description: 'No video data to convert.', variant: 'destructive' });
      }
      return;
    }

    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      const extension = exportFormat.split("/")[1].split(';')[0];
      a.download = `ScreenVerse-recording-${new Date().toISOString()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  const SettingsPanel = () => (
    <Card className="w-full max-w-md lg:max-w-sm sticky top-20 self-start">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-6 w-6" /> Recording Settings
        </CardTitle>
        <CardDescription>
          Configure your screen capture settings before you start.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="video">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="video"><Video className="w-4 h-4 mr-1 inline-block"/>Video</TabsTrigger>
            <TabsTrigger value="audio"><Mic className="w-4 h-4 mr-1 inline-block"/>Audio</TabsTrigger>
            <TabsTrigger value="mouse"><MousePointer className="w-4 h-4 mr-1 inline-block"/>Mouse</TabsTrigger>
          </TabsList>
          <TabsContent value="video" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={setResolution} disabled={status !== 'idle'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="720">720p (HD)</SelectItem>
                  <SelectItem value="1080">1080p (Full HD)</SelectItem>
                  <SelectItem value="1440">1440p (2K)</SelectItem>
                  <SelectItem value="2160">2160p (4K)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frame Rate (FPS)</Label>
              <Select value={frameRate} onValueChange={setFrameRate} disabled={status !== 'idle'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
               <div className="space-y-0.5">
                  <Label>Picture-in-Picture</Label>
                  <p className="text-xs text-muted-foreground">Overlay your camera on the recording.</p>
               </div>
               <Switch checked={pipEnabled} onCheckedChange={setPipEnabled} disabled={status !== 'idle'}/>
            </div>
          </TabsContent>
          <TabsContent value="audio" className="space-y-4 pt-4">
             <div className="flex items-center justify-between rounded-lg border p-3">
               <div className="space-y-0.5">
                  <Label>System Audio</Label>
                  <p className="text-xs text-muted-foreground">Record audio from your computer.</p>
               </div>
               <Switch checked={includeSystemAudio} onCheckedChange={setIncludeSystemAudio} disabled={status !== 'idle'}/>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
               <div className="space-y-0.5">
                  <Label>Microphone</Label>
                  <p className="text-xs text-muted-foreground">Record your voice.</p>
               </div>
               <Switch checked={includeMic} onCheckedChange={setIncludeMic} disabled={status !== 'idle'}/>
            </div>
          </TabsContent>
          <TabsContent value="mouse" className="space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
               <div className="space-y-0.5">
                  <Label>Highlight Cursor</Label>
                   <p className="text-xs text-muted-foreground">Show a halo around the mouse.</p>
               </div>
               <Switch checked={highlightCursor} onCheckedChange={setHighlightCursor} disabled={status !== 'idle'}/>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
               <div className="space-y-0.5">
                  <Label>Highlight Clicks</Label>
                  <p className="text-xs text-muted-foreground">Animate mouse clicks.</p>
               </div>
               <Switch checked={highlightClicks} onCheckedChange={setHighlightClicks} disabled={status !== 'idle'}/>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
               <div className="space-y-0.5">
                  <Label className="flex items-center gap-1.5"><ZoomIn className="w-4 h-4"/>Follow & Zoom Mouse</Label>
                  <p className="text-xs text-muted-foreground">Follow and zoom on the cursor.</p>
               </div>
               <Switch checked={followMouseZoom} onCheckedChange={setFollowMouseZoom} disabled={status !== 'idle'}/>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  const RecordingControls = () => (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {status === "idle" && (
        <Button size="lg" onClick={startRecording}>
          <Clapperboard className="mr-2 h-5 w-5" /> Start Recording
        </Button>
      )}
      {(status === "recording" || status === "paused") && (
        <>
          {status === "recording" ? (
            <Button size="lg" variant="secondary" onClick={pauseRecording}>
              <Pause className="mr-2 h-5 w-5" /> Pause
            </Button>
          ) : (
            <Button size="lg" variant="secondary" onClick={resumeRecording}>
              <Play className="mr-2 h-5 w-5" /> Resume
            </Button>
          )}
          <Button size="lg" variant="destructive" onClick={stopRecording}>
            <StopCircle className="mr-2 h-5 w-5" /> Stop Recording
          </Button>
        </>
      )}
    </div>
  );

  const AnnotationToolbar = () => (
      <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm p-2 z-10">
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" disabled><Pencil className="w-5 h-5"/></Button>
              <Button variant="ghost" size="icon" disabled><ArrowRight className="w-5 h-5"/></Button>
              <Button variant="ghost" size="icon" disabled><Shapes className="w-5 h-5"/></Button>
              <Button variant="ghost" size="icon" disabled><Highlighter className="w-5 h-5"/></Button>
          </div>
      </Card>
  );


  if (!isClient) {
    return null; // Or a loading spinner
  }

  return (
    <main className="container mx-auto px-4 py-8 relative"> {/* Added relative positioning */}
      {/* Cursor highlight */}
      {highlightCursor && !followMouseZoom && (
        <div ref={highlightCursorRef} className="highlight-cursor"></div>
      )}
      {/* Click animations container */}
      <div ref={clickAnimationContainerRef} className="click-animation-container"></div>
      <div className="flex flex-col lg:flex-row gap-8">
        <SettingsPanel />

        <div className="flex-1 w-full">
          <Card className="w-full">
            <CardContent className="p-4 md:p-6">
              <div className="aspect-video w-full bg-muted rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                {status === "idle" && (
                  <div className="text-center text-muted-foreground">
                    <Monitor className="mx-auto h-16 w-16" />
                    <p className="mt-2 text-lg font-medium">Your screen recording will appear here.</p>
                    <p className="text-sm">Choose your settings and start recording.</p>
                  </div>
                )}
                {/* We use the canvas for the zoom effect, but it's always in the DOM to be recorded */}
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain" style={{ display: 'none' }} />
                {(status === "recording" || status === "paused") && (
                  <>
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      className="w-full h-full object-contain"
                    />
                    {pipEnabled && (
                      <video
                          ref={cameraPreviewRef}
                          autoPlay
                          muted
                          className="absolute bottom-4 right-4 w-48 h-auto rounded-lg shadow-lg border-2 border-primary"
                      />
                    )}
                    {/* Don't show annotation toolbar when zooming as coords are off */}
                    {!followMouseZoom && <AnnotationToolbar />}
                  </>
                )}
                {status === "preview" && videoUrl && (
                  <video src={videoUrl} controls className="w-full h-full" />
                )}
                 {status === "preview" && !videoUrl && (
                  <div className="text-center text-muted-foreground">
                    <VideoOff className="mx-auto h-16 w-16" />
                    <p className="mt-2">Recording finished. Processing video...</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-col items-center gap-4">
                <RecordingControls />
                {status === "preview" && videoUrl && (
                   <Card className="w-full mt-4 bg-secondary/50">
                     <CardHeader>
                       <CardTitle>Export Your Recording</CardTitle>
                       <CardDescription>Download your video or start a new recording.</CardDescription>
                     </CardHeader>
                     <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="space-y-2 flex-1 w-full">
                            <Label htmlFor="export-format">Format</Label>
                            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                                <SelectTrigger id="export-format"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="video/webm">WebM</SelectItem>
                                    <SelectItem value="video/mp4" disabled={!MediaRecorder.isTypeSupported('video/mp4')}>MP4 (Browser Dependant)</SelectItem>
                                    <SelectItem value="image/gif">GIF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                       <Button size="lg" onClick={handleDownload} className="w-full sm:w-auto mt-4 sm:mt-0 self-end" disabled={isConverting}>
                        {isConverting ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-5 w-5" />
                          )}
                          {isConverting ? 'Converting...' : 'Download'}
                       </Button>
                       <Button size="lg" variant="outline" onClick={() => setStatus("idle")} className="w-full sm:w-auto">
                         <Clapperboard className="mr-2 h-5 w-5" /> New Recording
                       </Button>
                     </CardContent>
                   </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
