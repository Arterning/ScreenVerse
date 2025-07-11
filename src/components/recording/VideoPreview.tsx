"use client";

import {
  Monitor,
  VideoOff,
  Pencil,
  ArrowRight,
  Shapes,
  Highlighter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "../ui/button";
import type { RecordingStatus, Settings } from "./types";

interface VideoPreviewProps {
  status: RecordingStatus;
  videoUrl: string | null;
  videoPreviewRef: React.RefObject<HTMLVideoElement>;
  cameraPreviewRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  settings: Settings;
}

const AnnotationToolbar = () => (
  <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm p-2 z-10">
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" disabled>
        <Pencil className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" disabled>
        <ArrowRight className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" disabled>
        <Shapes className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" disabled>
        <Highlighter className="w-5 h-5" />
      </Button>
    </div>
  </Card>
);

export default function VideoPreview({
  status,
  videoUrl,
  videoPreviewRef,
  cameraPreviewRef,
  canvasRef,
  settings,
}: VideoPreviewProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-4 md:p-6">
        <div className="aspect-video w-full bg-muted rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden">
          {status === "idle" && (
            <div className="text-center text-muted-foreground">
              <Monitor className="mx-auto h-16 w-16" />
              <p className="mt-2 text-lg font-medium">
                Your screen recording will appear here.
              </p>
              <p className="text-sm">
                Choose your settings and start recording.
              </p>
            </div>
          )}
          {(status === "recording" || status === "paused") && (
            <>
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                className="w-full h-full object-contain hidden"
              />
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
                width={1920}
                height={1080}
              />
              {settings.pipEnabled && (
                <video
                  ref={cameraPreviewRef}
                  autoPlay
                  muted
                  className="absolute bottom-4 right-4 w-48 h-auto rounded-lg shadow-lg border-2 border-primary"
                />
              )}
              <AnnotationToolbar />
            </>
          )}
          {status === "preview" && videoUrl && (
            <video src={videoUrl} controls className="w-full h-full" />
          )}
          {(status === "preview" || status === 'converting') && !videoUrl && (
            <div className="text-center text-muted-foreground">
              <VideoOff className="mx-auto h-16 w-16" />
              <p className="mt-2">Recording finished. Processing video...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
