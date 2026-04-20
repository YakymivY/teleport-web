import { ChartNoAxesColumn } from 'lucide-react';

export function TrafficButton() {
  return (
    <button className="action-panel-button">
      <ChartNoAxesColumn
        className="action-panel-button-icon"
        size={20}
        strokeWidth={2.3}
        absoluteStrokeWidth
        aria-hidden="true"
      />
    </button>
  );
}