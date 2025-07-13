'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getAllRecordings, updateRecordingTitle, deleteRecording, getVideoFromDB, saveVideoToDB, RecordingMetadata, getDB, STORE_NAME } from '@/lib/db';
import { Play, Edit, Trash2, Download, Clock, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function RecordingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      const data = await getAllRecordings();
      setRecordings(data);
    } catch (error) {
      console.error('Failed to load recordings:', error);
      toast({
        title: '加载失败',
        description: '无法加载录屏记录',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (recording: RecordingMetadata) => {
    try {
      const videoBlob = await getVideoFromDB(recording.id);
      if (videoBlob) {
        // 使用临时存储，不创建新的录屏记录
        const tempId = 'temp_for_edit';
        const db = await getDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // 保存到临时位置
        await new Promise<void>((resolve, reject) => {
          const request = store.put(videoBlob, tempId);
          transaction.oncomplete = () => resolve();
          transaction.onerror = (event: Event) => reject((event.target as IDBRequest).error);
        });
        
        router.push('/edit');
      } else {
        toast({
          title: '播放失败',
          description: '无法加载视频文件',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to play recording:', error);
      toast({
        title: '播放失败',
        description: '无法播放此录屏',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (recording: RecordingMetadata) => {
    setEditingId(recording.id);
    setEditingTitle(recording.title);
  };

  const handleSaveTitle = async () => {
    if (!editingId || !editingTitle.trim()) return;

    try {
      await updateRecordingTitle(editingId, editingTitle.trim());
      setRecordings(recordings.map(r => 
        r.id === editingId ? { ...r, title: editingTitle.trim() } : r
      ));
      setEditingId(null);
      setEditingTitle('');
      toast({
        title: '标题已更新',
        description: '录屏标题已成功修改',
      });
    } catch (error) {
      console.error('Failed to update title:', error);
      toast({
        title: '更新失败',
        description: '无法更新录屏标题',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个录屏吗？此操作无法撤销。')) return;

    try {
      await deleteRecording(id);
      setRecordings(recordings.filter(r => r.id !== id));
      toast({
        title: '删除成功',
        description: '录屏已删除',
      });
    } catch (error) {
      console.error('Failed to delete recording:', error);
      toast({
        title: '删除失败',
        description: '无法删除录屏',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (recording: RecordingMetadata) => {
    try {
      const videoBlob = await getVideoFromDB(recording.id);
      if (videoBlob) {
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${recording.title}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: '下载开始',
          description: '录屏文件正在下载',
        });
      }
    } catch (error) {
      console.error('Failed to download recording:', error);
      toast({
        title: '下载失败',
        description: '无法下载录屏文件',
        variant: 'destructive',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">加载中...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">我的录屏</h1>
        <p className="text-muted-foreground">
          查看和管理您的所有录屏记录
        </p>
      </div>

      {recordings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无录屏记录</h3>
            <p className="text-muted-foreground mb-4">
              您还没有录制过任何视频
            </p>
            <Button onClick={() => router.push('/')}>
              开始录制
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recordings.map((recording) => (
            <Card key={recording.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted relative overflow-hidden">
                {recording.thumbnail ? (
                  <img 
                    src={recording.thumbnail} 
                    alt={recording.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 hover:opacity-100 transition-opacity flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePlay(recording)}
                      className="bg-white/90 text-black hover:bg-white"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(recording)}
                      className="bg-white/90 text-black hover:bg-white"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
                    {editingId === recording.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle();
                            if (e.key === 'Escape') {
                              setEditingId(null);
                              setEditingTitle('');
                            }
                          }}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleSaveTitle}>
                          保存
                        </Button>
                      </div>
                    ) : (
                      recording.title
                    )}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(recording)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(recording.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(recording.duration)}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {formatSize(recording.size)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(recording.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
} 