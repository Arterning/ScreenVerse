import React, { useRef, useState } from 'react';

export type TimelineRegion = {
  id: string;
  type: 'zoom' | 'trim';
  start: number;
  end: number;
  selected?: boolean;
};

interface TimelineEditorProps {
  duration: number;
  regions: TimelineRegion[];
  selectedId: string | null;
  currentTime: number;
  onSelect: (id: string | null) => void;
  onChange: (regions: TimelineRegion[]) => void;
  onTimeChange: (time: number) => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  duration,
  regions,
  selectedId,
  currentTime,
  onSelect,
  onChange,
  onTimeChange,
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
    <div
      ref={containerRef}
      className="w-full relative h-16 bg-gray-100 rounded mt-4 border cursor-pointer select-none"
      onClick={() => onSelect(null)}
    >
      {/* 时间轴主线 */}
      <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-300" style={{ transform: 'translateY(-50%)' }} />
      
      {/* 播放头 */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-ew-resize z-20"
        style={{ left: playheadPosition }}
        onMouseDown={onPlayheadMouseDown}
      >
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
      </div>
      
      {/* 区域渲染 */}
      {regions.map(region => {
        const left = `${(region.start / duration) * 100}%`;
        const width = `${((region.end - region.start) / duration) * 100}%`;
        return (
          <div
            key={region.id}
            className={`absolute top-2 h-10 flex items-center group ${region.selected ? 'ring-2 ring-primary z-10' : 'z-0'}`}
            style={{ left, width }}
            onMouseDown={e => onMouseDown(e, region.id, 'move')}
            onClick={e => { e.stopPropagation(); onSelect(region.id); }}
          >
            {/* 左 handle */}
            <div
              className="w-2 h-10 bg-primary/80 rounded-l cursor-ew-resize flex items-center justify-center group-hover:bg-primary"
              style={{ marginLeft: -8 }}
              onMouseDown={e => onMouseDown(e, region.id, 'start')}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-1 h-8 bg-white rounded" />
            </div>
            {/* 区域本体 */}
            <div
              className={`flex-1 h-full flex items-center justify-center text-xs font-bold select-none ${region.type === 'zoom' ? 'bg-blue-200 border-blue-500' : 'bg-red-200 border-red-500'} border-y-2 border-x-0`}
              style={{ borderLeft: 'none', borderRight: 'none' }}
            >
              {region.type === 'zoom' ? 'Zoom' : 'Trim'}
            </div>
            {/* 右 handle */}
            <div
              className="w-2 h-10 bg-primary/80 rounded-r cursor-ew-resize flex items-center justify-center group-hover:bg-primary"
              style={{ marginRight: -8 }}
              onMouseDown={e => onMouseDown(e, region.id, 'end')}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-1 h-8 bg-white rounded" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimelineEditor; 