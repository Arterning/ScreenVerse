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
import { saveVideoToDB } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import type { RecordingStatus, Settings, ExportFormat } from "./types";
import { useLanguage } from "@/components/LanguageProvider";

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
  duration = 0,
}: RecordingControlsProps & { duration?: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const setExportFormat = (value: string) => {
    setSettings((prev) => ({ ...prev, exportFormat: value as ExportFormat }));
  };

  const handleNewRecording = () => {
    window.location.reload();
  }

  const handleEdit = async () => {
    if (videoUrl) {
      try {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const id = await saveVideoToDB(blob, undefined, duration);
        router.push(`/edit/${id}`);
      } catch (error) {
        console.error("Failed to save video to DB:", error);
        toast({
          title: t('errorPrepareEdit'),
          description: t('errorSaveEditor'),
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveToLibrary = async () => {
    if (videoUrl) {
      try {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        await saveVideoToDB(blob, undefined, duration);
        toast({
          title: t('saveSuccess'),
          description: t('saveToLibrary'),
        });
      } catch (error) {
        console.error("Failed to save video to library:", error);
        toast({
          title: t('saveFailed'),
          description: t('saveFailedDesc'),
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      {status === "idle" && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5" />
              {t('readyToRecord')}
            </CardTitle>
            <CardDescription>
              {t('configureRecordingSettings')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-format">{t('exportFormat')}</Label>
              <Select value={settings.exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video/webm">WebM ({t('recommended')})</SelectItem>
                  <SelectItem value="video/mp4">MP4</SelectItem>
                  {/* <SelectItem value="image/gif">GIF</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={startRecording} size="lg" className="w-full">
              <Play className="mr-2 h-5 w-5" /> {t('startRecording')}
            </Button>
          </CardContent>
        </Card>
      )}

      {(status === "recording" || status === "paused") && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === "recording" ? (
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              ) : (
                <Pause className="h-5 w-5" />
              )}
              {status === "recording" ? "Recording..." : "Paused"}
            </CardTitle>
            <CardDescription>
              {status === "recording"
                ? "Click stop when you're done recording."
                : "Recording is paused. Resume or stop recording."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {status === "recording" ? (
                <Button onClick={pauseRecording} variant="outline" className="flex-1">
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
              ) : (
                <Button onClick={resumeRecording} variant="outline" className="flex-1">
                  <Play className="mr-2 h-4 w-4" /> Resume
                </Button>
              )}
              <Button onClick={stopRecording} variant="destructive" className="flex-1">
                <StopCircle className="mr-2 h-4 w-4" /> Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(status === "preview" || status === "converting") && videoUrl && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              {status === "converting" ? "Converting..." : "Recording Complete"}
            </CardTitle>
            <CardDescription>
              {status === "converting" 
                ? "Converting your recording to GIF format..."
                : "Your recording is ready. Download, edit, or save to your library."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex w-full sm:w-auto gap-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveToLibrary}
                className="flex-1"
                disabled={status === 'converting'}
              >
                <Clapperboard className="mr-1 h-5 w-5" /> Save
              </Button>
               <Button
                size="sm"
                variant="secondary"
                onClick={handleEdit}
                className="flex-1 sm:flex-none"
                disabled={status === 'converting'}
              >
                <Scissors className="mr-1 h-5 w-5" />Edit
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="flex-1 sm:flex-none"
                disabled={status === 'converting'}
              >
                <Download className="mr-1 h-5 w-5" /> 
                {status === 'converting' ? 'Converting...' : 'Download'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleNewRecording}
                className="flex-1"
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
