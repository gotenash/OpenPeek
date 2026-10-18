import React, { useEffect, useState, useRef } from 'react';
import type { RecorderOptions } from '../hooks/useRecorder';
import { Camera, Volume2, Monitor, Keyboard, Key } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { SettingsVideoTab } from './settings/SettingsVideoTab';
import { SettingsAudioTab } from './settings/SettingsAudioTab';
import { SettingsWebcamTab } from './settings/SettingsWebcamTab';
import { SettingsShortcutsTab } from './settings/SettingsShortcutsTab';
import { SettingsApiTab } from './settings/SettingsApiTab';

interface SettingsPanelProps {
  options: RecorderOptions;
  setOptions: React.Dispatch<React.SetStateAction<RecorderOptions>>;
  isRecording?: boolean;
}

type SettingsTab = 'video' | 'audio' | 'webcam' | 'shortcuts' | 'api';

export function SettingsPanel({ options, setOptions, isRecording = false }: SettingsPanelProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>('video');
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const [systemMonitors, setSystemMonitors] = useState<Array<{ id: string; name: string; is_primary: boolean; width: number; height: number }>>([]);
  const [showRestartNotice, setShowRestartNotice] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

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

  useEffect(() => {
    let debounceTimer: number | null = null;

    async function loadDevices() {
      try {
        let devices = await navigator.mediaDevices.enumerateDevices();
        let audioDevices = devices.filter(d => d.kind === 'audioinput');
        let videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        if ((videoDevices.length === 0 || videoDevices.every(d => d.label === '')) && !isRecording) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            stream.getTracks().forEach(t => t.stop());
            devices = await navigator.mediaDevices.enumerateDevices();
            audioDevices = devices.filter(d => d.kind === 'audioinput');
            videoDevices = devices.filter(d => d.kind === 'videoinput');
          } catch (e) {
            try {
              const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
              vStream.getTracks().forEach(t => t.stop());
              devices = await navigator.mediaDevices.enumerateDevices();
              videoDevices = devices.filter(d => d.kind === 'videoinput');
            } catch (err) {
              console.debug('[SettingsPanel] Video device permission pre-grant declined:', err);
            }
          }
        }

        setMics(audioDevices);
        setCams(videoDevices);
        
        if (audioDevices.length > 0) {
          if (!optionsRef.current.selectedMicId || !audioDevices.some(d => d.deviceId === optionsRef.current.selectedMicId)) {
            setOptions(prev => ({ ...prev, selectedMicId: audioDevices[0].deviceId }));
          }
        }
        if (videoDevices.length > 0) {
          if (!optionsRef.current.selectedCamId || !videoDevices.some(d => d.deviceId === optionsRef.current.selectedCamId)) {
            setOptions(prev => ({ ...prev, selectedCamId: videoDevices[0].deviceId }));
          }
        }
      } catch (err) {
        console.error('Error listing hardware devices:', err);
        setPermissionError(true);
      }
    }

    loadDevices();
    
    const handleDeviceChange = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        loadDevices();
      }, 500);
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [isRecording, setOptions]);

  const handleCheckbox = (key: keyof RecorderOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] } as any));
  };

  const handleSelect = (key: keyof RecorderOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '780px', margin: '0 auto', width: '100%' }}>
      {/* Settings Navigation Tabs */}
      <div className="glass-panel" style={{ display: 'flex', padding: '4px', gap: '4px', borderRadius: '10px' }}>
        <button
          className={`nav-item ${activeTab === 'video' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
          onClick={() => setActiveTab('video')}
        >
          <Monitor size={16} />
          <span>{t('settings.tabs.video')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'audio' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
          onClick={() => setActiveTab('audio')}
        >
          <Volume2 size={16} />
          <span>{t('settings.tabs.audio')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'webcam' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
          onClick={() => setActiveTab('webcam')}
        >
          <Camera size={16} />
          <span>{t('settings.tabs.webcam')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'shortcuts' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
          onClick={() => setActiveTab('shortcuts')}
        >
          <Keyboard size={16} />
          <span>{t('settings.tabs.shortcuts')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'api' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
          onClick={() => setActiveTab('api')}
        >
          <Key size={16} />
          <span>{t('settings.tabs.api')}</span>
        </button>
      </div>

      {/* Tab 1: Video & Encoding */}
      {activeTab === 'video' && (
        <SettingsVideoTab
          options={options}
          handleSelect={handleSelect}
          handleCheckbox={handleCheckbox}
          systemMonitors={systemMonitors}
          showRestartNotice={showRestartNotice}
          setShowRestartNotice={setShowRestartNotice}
        />
      )}

      {/* Tab 2: Audio & Microphone */}
      {activeTab === 'audio' && (
        <SettingsAudioTab
          options={options}
          handleSelect={handleSelect}
          handleCheckbox={handleCheckbox}
          mics={mics}
          permissionError={permissionError}
        />
      )}

      {/* Tab 3: Webcam & Facecam */}
      {activeTab === 'webcam' && (
        <SettingsWebcamTab
          options={options}
          setOptions={setOptions}
          handleSelect={handleSelect}
          handleCheckbox={handleCheckbox}
          cams={cams}
          isRecording={isRecording}
        />
      )}

      {/* Tab 4: Shortcuts Cheatsheet & Language */}
      {activeTab === 'shortcuts' && (
        <SettingsShortcutsTab
          options={options}
          handleSelect={handleSelect}
          handleCheckbox={handleCheckbox}
        />
      )}

      {/* Tab 5: Cloud AI & API Keys */}
      {activeTab === 'api' && <SettingsApiTab />}
    </div>
  );
}
