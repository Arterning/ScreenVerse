"use client";

import {
  Clapperboard,
  Download,
  Pause,
  Play,
  StopCircle,
  Scissors,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
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
import { Label } from "@/components/ui/label";
import type { RecordingStatus, Settings, ExportFormat } from "./types";

interface RecordingControlsProps {
  status: RecordingStatus;
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  handleDownload: () => void;
  videoUrl: string | null;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

export default function RecordingControls({
  status,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  handleDownload,
  videoUrl,
  settings,
  setSettings,
}: RecordingControlsProps) {
  const router = useRouter();
  
  const setExportFormat = (value: string) => {
    setSettings((prev) => ({ ...prev, exportFormat: value as ExportFormat }));
  };

  const handleNewRecording = () => {
    window.location.reload();
  }

  const handleEdit = async () => {
    if (videoUrl) {
      // Fetch the blob from the URL
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // We need to store it in a way the /edit page can access it.
      // localStorage is a good option for blobs, but it only stores strings.
      // A common trick is to use FileReader to convert the Blob to a Base64 data URL.
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        localStorage.setItem('recordedVideoUrl', dataUrl);
        router.push('/edit');
      };
      reader.readAsDataURL(blob);
    }
  };

  return (
    <>
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
      {status === "preview" && videoUrl && (
        <Card className="w-full mt-4 bg-secondary/50">
          <CardHeader>
            <CardTitle>Export Your Recording</CardTitle>
            <CardDescription>
              Download, edit your video, or start a new recording.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 w-full">
              <Label htmlFor="export-format">Format</Label>
              <Select
                value={settings.exportFormat}
                onValueChange={setExportFormat}
              >
                <SelectTrigger id="export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video/webm">WebM</SelectItem>
                  <SelectItem
                    value="video/mp4"
                    disabled={!MediaRecorder.isTypeSupported("video/mp4")}
                  >
                    MP4 (Browser Dependant)
                  </SelectItem>
                  <SelectItem value="image/gif">GIF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full sm:w-auto gap-4">
              <Button
                size="lg"
                onClick={handleDownload}
                className="flex-1 sm:flex-none"
                disabled={status === 'converting'}
              >
                <Download className="mr-2 h-5 w-5" /> 
                {status === 'converting' ? 'Converting...' : 'Download'}
              </Button>
               <Button
                size="lg"
                variant="secondary"
                onClick={handleEdit}
                className="flex-1 sm:flex-none"
              >
                <Scissors className="mr-2 h-5 w-5" /> Edit
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleNewRecording}
                className="flex-1 sm:flex-none"
              >
                <Clapperboard className="mr-2 h-5 w-5" /> New Recording
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
