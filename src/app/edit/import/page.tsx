"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveVideoToDB } from '@/lib/db';

export default function ImportEditPage() {
  const router = useRouter();

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      const { videoBlob, clicks } = e.data || {};
      if (videoBlob) {
        // 保存到 IndexedDB
        const id = await saveVideoToDB(videoBlob, '插件导入录屏');
        // 保存 clicks 到 localStorage
        if (clicks) {
          localStorage.setItem('autoZoomRegions', JSON.stringify(clicks));
        }
        // 跳转到编辑页面
        router.replace(`/edit/${id}`);
      }
    };
    window.addEventListener('message', handler, { once: true });
    return () => window.removeEventListener('message', handler);
  }, [router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-2xl font-bold mb-4">正在导入录屏...</div>
      <div className="text-gray-500">请稍候，视频正在保存并跳转到编辑页面。</div>
    </main>
  );
}
