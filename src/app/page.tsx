"use client";

import SettingsPanel from "@/components/recording/SettingsPanel";
import VideoPreview from "@/components/recording/VideoPreview";
import RecordingControls from "@/components/recording/RecordingControls";
import { useRecording } from "@/components/recording/useRecording";

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
  } = useRecording();

  if (!isClient) {
    return null; // Or a loading spinner
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          isRecording={status === 'recording' || status === 'paused'}
        />
        <div className="flex-1 w-full">
          <VideoPreview
            status={status}
            videoUrl={videoUrl}
            videoPreviewRef={videoPreviewRef}
            cameraPreviewRef={cameraPreviewRef}
            canvasRef={canvasRef}
            settings={settings}
          />
          <div className="mt-6 flex flex-col items-center gap-4">
            <RecordingControls
              status={status}
              startRecording={startRecording}
              stopRecording={stopRecording}
              pauseRecording={pauseRecording}
              resumeRecording={resumeRecording}
              handleDownload={handleDownload}
              videoUrl={videoUrl}
              settings={settings}
              setSettings={setSettings}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
