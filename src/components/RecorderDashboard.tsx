import React, { useEffect, useRef, useState } from 'react';
import type { RecorderOptions } from '../hooks/useRecorder';
import { RecorderLivePreview } from './recorder/RecorderLivePreview';
import { RecorderToolbars } from './recorder/RecorderToolbars';
import { RecorderBlurPanel } from './recorder/RecorderBlurPanel';
import { RecorderControlDeck } from './recorder/RecorderControlDeck';
import { RecorderSecondaryCamOverlay } from './recorder/RecorderSecondaryCamOverlay';

interface RecorderDashboardProps {
  options: RecorderOptions;
  setOptions: React.Dispatch<React.SetStateAction<RecorderOptions>>;
  recorder: any; // Return type of useRecorder
}

export function RecorderDashboard({ options, setOptions, recorder }: RecorderDashboardProps) {
  const [systemMonitors, setSystemMonitors] = useState<Array<{ id: string; name: string; is_primary: boolean; width: number; height: number }>>([]);
  const canvasMountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<Array<{ id: string; name: string; is_primary: boolean; width: number; height: number }>>('get_system_monitors')
        .then((monitors) => {
          if (monitors && monitors.length > 0) {
            setSystemMonitors(monitors);
          }
        })
        .catch(() => {});
    }).catch(() => {});
  }, []);

  const handleSelectMonitor = (pref: string) => {
    setOptions(prev => ({ ...prev, selectedMonitorId: pref }));
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('save_screen_preference', { preference: pref }).catch(() => {});
      invoke('set_active_capture_monitor', { monitorId: pref }).catch(() => {});
    }).catch(() => {});
  };

  return (
    <div className="dashboard-grid">
      {/* Left side: Live Preview & Live Drawing/Webcam */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <RecorderLivePreview
          options={options}
          recorder={recorder}
          canvasMountRef={canvasMountRef}
        />

        <RecorderToolbars
          options={options}
          setOptions={setOptions}
          recorder={recorder}
        />

        <RecorderBlurPanel
          recorder={recorder}
        />
      </div>

      {/* Right side: Control Deck */}
      <RecorderControlDeck
        options={options}
        setOptions={setOptions}
        recorder={recorder}
        systemMonitors={systemMonitors}
        onSelectMonitor={handleSelectMonitor}
      />

      {/* Floating framing window for Secondary Camera during active B-Roll capture */}
      <RecorderSecondaryCamOverlay
        options={options}
        recorder={recorder}
      />
    </div>
  );
}
