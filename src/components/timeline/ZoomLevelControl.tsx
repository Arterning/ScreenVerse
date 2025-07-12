import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ZoomLevelControlProps {
  zoomLevel: number;
  onZoomLevelChange: (level: number) => void;
  isVisible: boolean;
}

export const ZoomLevelControl: React.FC<ZoomLevelControlProps> = ({
  zoomLevel,
  onZoomLevelChange,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm">放大级别调整</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zoom-level" className="text-sm">
              放大倍数: {zoomLevel.toFixed(1)}x
            </Label>
            <Slider
              id="zoom-level"
              min={1.0}
              max={3.0}
              step={0.1}
              value={[zoomLevel]}
              onValueChange={(value) => onZoomLevelChange(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1.0x</span>
              <span>2.0x</span>
              <span>3.0x</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 