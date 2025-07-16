import { useRef, useState, useCallback } from 'react';

export function useExtensionRecording() {
  const [status, setStatus] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // 开始录屏
  const startRecording = useCallback(async () => {
    setStatus('recording');
    recordedChunksRef.current = [];
    setVideoUrl(null);
    try {
      // 选择录制源（屏幕/窗口/标签页）
      // 兼容 Chrome 插件和标准 API
      let stream: MediaStream;
      if ((navigator.mediaDevices as any).getDisplayMedia) {
        stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: true
        });
      } else {
        throw new Error('当前环境不支持屏幕录制');
      }
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStatus('preview');
      };
      recorder.start();
    } catch (err) {
      setStatus('idle');
      alert('录屏失败: ' + (err as any).message);
    }
  }, []);

  // 停止录屏
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // 下载录制视频
  const handleDownload = useCallback(() => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `ScreenVerse-recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [videoUrl]);

  return {
    status,
    videoUrl,
    startRecording,
    stopRecording,
    handleDownload,
  };
} 