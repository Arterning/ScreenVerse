import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, Scissors, Undo2, Redo2, Trash2, RefreshCcw, Play, Pause } from 'lucide-react';

interface TimelineToolbarProps {
  onAddZoom: () => void;
  onAddTrim: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onPlayPause: () => void;
  isPlaying: boolean;
  selectedId: string | null;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  onAddZoom,
  onAddTrim,
  onDelete,
  onUndo,
  onRedo,
  onReset,
  onPlayPause,
  isPlaying,
  selectedId,
}) => {
  return (
    <div className="flex gap-2 my-4 items-center">
      <Button variant="outline" size="sm" onClick={onPlayPause} title="播放/暂停">
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <Button variant="outline" size="sm" onClick={onAddZoom} title="添加 Zoom 区域">
        <ZoomIn className="w-4 h-4 mr-1" /> Zoom
      </Button>
      <Button variant="outline" size="sm" onClick={onAddTrim} title="添加 Trim 区域">
        <Scissors className="w-4 h-4 mr-1" /> Trim
      </Button>
      <Button variant="ghost" size="sm" onClick={onUndo} title="撤销">
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onRedo} title="重做">
        <Redo2 className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onReset} title="重置">
        <RefreshCcw className="w-4 h-4" />
      </Button>
      <Button variant="destructive" size="sm" onClick={onDelete} title="删除选中区域" disabled={!selectedId}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default TimelineToolbar; 