"use client";

import VideoPreview from "@/components/recording/VideoPreview";
import RecordingControls from "@/components/recording/RecordingControls";
import { useRecording } from "@/components/recording/useRecording";
import type { Settings } from "@/components/recording/types";
import { Dispatch, SetStateAction } from "react";

export default function Home() {
  const {
    status,
    settings,
    setSettings,
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
    recordingDuration,
  } = useRecording();

  if (!isClient) {
    return null; // Or a loading spinner
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full max-w-md lg:max-w-sm">
          <RecordingControls
            status={status}
            startRecording={startRecording}
            stopRecording={stopRecording}
            pauseRecording={pauseRecording}
            resumeRecording={resumeRecording}
            handleDownload={handleDownload}
            videoUrl={videoUrl}
            settings={settings}
            setSettings={setSettings as Dispatch<SetStateAction<Settings>>}
            duration={recordingDuration}
          />
        </div>
        <div className="flex-1 w-full">
          <VideoPreview
            status={status}
            videoUrl={videoUrl}
            videoPreviewRef={videoPreviewRef}
            cameraPreviewRef={cameraPreviewRef}
            canvasRef={canvasRef}
            settings={settings}
          />
        </div>
      </div>
    </main>
  );
}
