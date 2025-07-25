import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, Scissors, Undo2, Redo2, Trash2, RefreshCcw, Play, Pause } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from "@/components/LanguageProvider";

interface TimelineToolbarProps {
  onAddZoom: () => void;
  onAddTrim: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onPlayPause: () => void;
  onCancelZoomPosition?: () => void;
  isPlaying: boolean;
  selectedId: string | null;
  isSettingZoomPosition?: boolean;
  timelineScale: number;
  onTimelineScaleChange: (scale: number) => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  onAddZoom,
  onAddTrim,
  onDelete,
  onUndo,
  onRedo,
  onReset,
  onPlayPause,
  onCancelZoomPosition,
  isPlaying,
  selectedId,
  isSettingZoomPosition = false,
  timelineScale,
  onTimelineScaleChange,
}) => {
  const { t } = useLanguage();
  const handleResetClick = () => {
    if (window.confirm(t('resetConfirm'))) {
      onReset();
    }
  };
  return (
    <div className="flex gap-2 my-4 items-center">
      <Button variant="outline" size="sm" onClick={onPlayPause} title={t('playPause')}>
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      {isSettingZoomPosition ? (
        <Button variant="destructive" size="sm" onClick={onCancelZoomPosition} title={t('cancelZoomPosition')}>
          {t('cancel')}
        </Button>
      ) : (
        <>
          <Button variant="outline" size="sm" onClick={onAddZoom} title={t('addZoomRegion')}>
            <ZoomIn className="w-4 h-4 mr-1" /> {t('zoom')}
          </Button>
          <Button variant="outline" size="sm" onClick={onAddTrim} title={t('addTrimRegion')}>
            <Scissors className="w-4 h-4 mr-1" /> {t('trim')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onUndo} title={t('undo')}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRedo} title={t('redo')}>
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetClick} title={t('reset')}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} title={t('deleteSelectedRegion')} disabled={!selectedId}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-2 min-w-[180px]">
        <span className="text-xs text-gray-500">{t('timelineScale')}</span>
        <Slider
          min={1}
          max={5}
          step={0.01}
          value={[timelineScale]}
          onValueChange={v => onTimelineScaleChange(v[0])}
          className="w-24"
        />
        <span className="text-xs text-gray-500 w-8 text-right">{timelineScale.toFixed(2)}x</span>
      </div>
    </div>
  );
};

export default TimelineToolbar; 