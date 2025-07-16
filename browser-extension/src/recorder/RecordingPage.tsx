import React from 'react';
import { useExtensionRecording } from './useExtensionRecording';

const RecordingPage: React.FC = () => {
  const { status, videoUrl, startRecording, stopRecording, handleDownload, clicks } = useExtensionRecording();

  // 编辑按钮逻辑
  const handleEdit = async () => {
    if (!videoUrl) return;
    // 获取 Blob
    const blob = await fetch(videoUrl).then(r => r.blob());
    // 打开 Web 编辑页面
    const win = window.open('http://localhost:9200/edit/import', '_blank');
    if (!win) {
      alert('无法打开编辑页面，请检查浏览器弹窗设置');
      return;
    }
    // 发送数据（延迟确保页面加载）
    setTimeout(() => {
      win.postMessage({ videoBlob: blob, clicks }, '*');
    }, 800);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>ScreenVerse 录屏插件</h1>
      <div style={{ width: 600, maxWidth: '90vw', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0001', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {status === 'idle' && (
          <button onClick={startRecording} style={{ fontSize: 20, padding: '12px 32px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>开始录屏</button>
        )}
        {status === 'recording' && (
          <>
            <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>录屏中...</div>
            <button onClick={stopRecording} style={{ fontSize: 18, padding: '10px 28px', borderRadius: 8, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>停止录屏</button>
          </>
        )}
        {status === 'preview' && videoUrl && (
          <>
            <video src={videoUrl} controls style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={handleDownload} style={{ fontSize: 18, padding: '10px 28px', borderRadius: 8, background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>下载录制视频</button>
              <button onClick={handleEdit} style={{ fontSize: 18, padding: '10px 28px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>编辑</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default RecordingPage; 