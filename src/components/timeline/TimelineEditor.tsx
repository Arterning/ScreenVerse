import React, { useRef, useState } from 'react';

export type TimelineRegion = {
  id: string;
  type: 'zoom' | 'trim';
  start: number;
  end: number;
  selected?: boolean;
  active?: boolean; // 新增：激活状态
  // Zoom 区域特有的属性
  zoomCenter?: { x: number; y: number }; // 鼠标坐标（相对于视频的百分比）
  zoomSize?: { width: number; height: number }; // 放大区域大小（像素）
  zoomLevel?: number; // 新增：放大级别 (1.0-3.0)
  zoomType?: 'mouse' | 'custom'; // 新增：zoom 区域类型
};

interface TimelineEditorProps {
  duration: number;
  regions: TimelineRegion[];
  selectedId: string | null;
  currentTime: number;
  onSelect: (id: string | null) => void;
  onChange: (regions: TimelineRegion[]) => void;
  onTimeChange: (time: number) => void;
  onSeekAndPlay?: (time: number) => void; // 新增：跳转并播放
  timelineScale?: number;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  duration,
  regions,
  selectedId,
  currentTime,
  onSelect,
  onChange,
  onTimeChange,
  onSeekAndPlay,
  timelineScale = 1,
}) => {
  const [dragging, setDragging] = useState<null | { id: string; type: 'move' | 'start' | 'end'; offset?: number }>();
  const [playheadDragging, setPlayheadDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 鼠标事件
  const onMouseDown = (e: React.MouseEvent, id: string, type: 'move' | 'start' | 'end') => {
    e.stopPropagation();
    let offset = 0;
    if (type === 'move' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const region = regions.find(r => r.id === id);
      if (region) {
        const mouseX = e.clientX - rect.left;
        const left = (region.start / duration) * rect.width;
        offset = mouseX - left;
      }
    }
    setDragging({ id, type, offset });
    onSelect(id);
  };

  const onPlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayheadDragging(true);
  };

  // 时间轴点击事件处理
  const onTimelineClick = (e: React.MouseEvent) => {
    if (!containerRef.current || dragging || playheadDragging) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const newTime = (mouseX / rect.width) * duration;
    const clampedTime = Math.max(0, Math.min(duration, newTime));
    
    // 如果提供了 onSeekAndPlay 回调，则跳转并播放
    if (onSeekAndPlay) {
      onSeekAndPlay(clampedTime);
    } else {
      // 否则只跳转时间
      onTimeChange(clampedTime);
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    if (playheadDragging) {
      const newTime = (mouseX / rect.width) * duration;
      onTimeChange(Math.max(0, Math.min(duration, newTime)));
      return;
    }
    
    if (!dragging) return;
    const regionIdx = regions.findIndex(r => r.id === dragging.id);
    if (regionIdx === -1) return;
    const region = regions[regionIdx];
    let newRegions = [...regions];
    if (dragging.type === 'move') {
      const width = region.end - region.start;
      let newStart = ((mouseX - (dragging.offset || 0)) / rect.width) * duration;
      newStart = Math.max(0, Math.min(duration - width, newStart));
      newRegions[regionIdx] = { ...region, start: newStart, end: newStart + width };
    } else if (dragging.type === 'start') {
      let newStart = (mouseX / rect.width) * duration;
      newStart = Math.max(0, Math.min(region.end - 0.1, newStart));
      newRegions[regionIdx] = { ...region, start: newStart };
    } else if (dragging.type === 'end') {
      let newEnd = (mouseX / rect.width) * duration;
      newEnd = Math.max(region.start + 0.1, Math.min(duration, newEnd));
      newRegions[regionIdx] = { ...region, end: newEnd };
    }
    onChange(newRegions);
  };

  const onMouseUp = () => {
    setDragging(null);
    setPlayheadDragging(false);
  };

  React.useEffect(() => {
    if (dragging || playheadDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  });

  const playheadPosition = `${(currentTime / duration) * 100}%`;

  return (
    <div className="w-full overflow-x-auto">
      <div
        ref={containerRef}
        className="relative h-20 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg mt-4 border border-gray-200 dark:border-gray-700 cursor-pointer select-none shadow-sm"
        style={{ width: `${timelineScale * 100}%`, minWidth: '100%' }}
        onClick={onTimelineClick}
      >
        {/* 时间轴主线 */}
        <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" style={{ transform: 'translateY(-50%)' }} />
        
        {/* 时间刻度 */}
        <div className="absolute left-0 right-0 top-0 bottom-0 flex justify-between px-2">
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-px h-2 bg-gray-300 dark:bg-gray-600" />
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.floor((i / 10) * duration)}s
              </span>
            </div>
          ))}
        </div>
        
        {/* 播放头 */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize z-20 shadow-lg"
          style={{ left: playheadPosition }}
          onMouseDown={onPlayheadMouseDown}
        >
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 shadow-lg" />
        </div>
        
        {/* 区域渲染 */}
        {regions.map(region => {
          const left = `${(region.start / duration) * 100}%`;
          const width = `${((region.end - region.start) / duration) * 100}%`;
          return (
            <div
              key={region.id}
              className={`absolute top-2 h-16 flex items-center group ${region.selected ? 'ring-2 ring-blue-500 dark:ring-blue-400 z-10' : 'z-0'}`}
              style={{ left, width }}
              onMouseDown={e => onMouseDown(e, region.id, 'move')}
              onClick={e => { 
                e.stopPropagation(); 
                onSelect(region.id);
                // 如果是 Zoom 区域，触发 seekAndPlay
                if (region.type === 'zoom' && onSeekAndPlay) {
                  onSeekAndPlay(region.start);
                }
              }}
            >
              {/* 左 handle */}
              <div
                className="w-3 h-16 bg-blue-500/80 dark:bg-blue-400/80 rounded-l cursor-ew-resize flex items-center justify-center group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors"
                style={{ marginLeft: -12 }}
                onMouseDown={e => onMouseDown(e, region.id, 'start')}
                onClick={e => e.stopPropagation()}
              >
                <div className="w-1 h-12 bg-white dark:bg-gray-200 rounded" />
              </div>
              {/* 区域本体 */}
              <div
                className={`flex-1 h-full flex items-center justify-center text-xs font-semibold select-none rounded-sm ${
                  region.type === 'zoom' 
                    ? region.active
                      ? 'bg-green-200/80 dark:bg-green-900/80 border-green-500 dark:border-green-400'
                      : 'bg-blue-200/80 dark:bg-blue-900/80 border-blue-500 dark:border-blue-400'
                    : 'bg-red-200/80 dark:bg-red-900/80 border-red-500 dark:border-red-400'
                } border-y-2 border-x-0 backdrop-blur-sm`}
                style={{ borderLeft: 'none', borderRight: 'none' }}
                onClick={e => { 
                  e.stopPropagation(); 
                  onSelect(region.id);
                  // 如果是 Zoom 区域，触发 seekAndPlay
                  if (region.type === 'zoom' && onSeekAndPlay) {
                    onSeekAndPlay(region.start);
                  }
                }}
              >
                <span className={`font-medium ${
                  region.type === 'zoom' 
                    ? region.active
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-blue-700 dark:text-blue-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {region.type === 'zoom' ? (region.active ? 'ACTIVE' : 'ZOOM') : 'TRIM'}
                </span>
                {/* 新增：显示 zoomType */}
                {region.type === 'zoom' && region.zoomType && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{region.zoomType === 'mouse' ? '鼠标点击' : '自定义'}</span>
                )}
              </div>
              {/* 右 handle */}
              <div
                className="w-3 h-16 bg-blue-500/80 dark:bg-blue-400/80 rounded-r cursor-ew-resize flex items-center justify-center group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors"
                style={{ marginRight: -12 }}
                onMouseDown={e => onMouseDown(e, region.id, 'end')}
                onClick={e => e.stopPropagation()}
              >
                <div className="w-1 h-12 bg-white dark:bg-gray-200 rounded" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineEditor; 