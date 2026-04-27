import { X, TabletSmartphone } from 'lucide-react';
import { useSelectedDeviceStore } from '../../../../../store/device/useSelectedDeviceStore';
import './DeviceButton.css';

interface DeviceButtonProps {
  showDevices: boolean;
  onClick: () => void;
}

export function DeviceButton({ showDevices, onClick }: DeviceButtonProps) {
  const selectedDeviceName = useSelectedDeviceStore((state) => state.selectedDeviceName);

  return (
    <button
      type="button"
      className="device-button"
      onClick={onClick}
    >
      {showDevices
        ? <X size={16} className="device-button-icon" />
        : <>
            <TabletSmartphone size={24} className="device-button-icon" />
            <span className="device-button-label">{selectedDeviceName ?? 'no device'}</span>
          </>
      }
    </button>
  );
}
