"use client";

import {
  Clapperboard,
  Download,
  Pause,
  Play,
  StopCircle,
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
  const setExportFormat = (value: string) => {
    setSettings((prev) => ({ ...prev, exportFormat: value as ExportFormat }));
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
              Download your video or start a new recording.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
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
            <Button
              size="lg"
              onClick={handleDownload}
              className="w-full sm:w-auto mt-4 sm:mt-0 self-end"
              disabled={status === 'converting'}
            >
              <Download className="mr-2 h-5 w-5" /> 
              {status === 'converting' ? 'Converting...' : 'Download'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setSettings((prev) => ({...prev, status: 'idle'}))}
              className="w-full sm:w-auto"
            >
              <Clapperboard className="mr-2 h-5 w-5" /> New Recording
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
