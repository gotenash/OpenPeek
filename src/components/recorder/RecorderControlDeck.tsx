import React from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Video, 
  Mic, 
  Volume2, 
  MousePointer, 
  Sparkles, 
  Wand2, 
  Keyboard, 
  Monitor, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import type { RecorderOptions } from '../../hooks/useRecorder';
import { RecorderAudioVisualizer } from './RecorderAudioVisualizer';

interface SystemMonitor {
  id: string;
  name: string;
  is_primary: boolean;
  width: number;
  height: number;
}

interface RecorderControlDeckProps {
  options: RecorderOptions;
  setOptions: React.Dispatch<React.SetStateAction<RecorderOptions>>;
  recorder: any;
  systemMonitors: SystemMonitor[];
  onSelectMonitor: (pref: string) => void;
}

export function RecorderControlDeck({
  options,
  setOptions,
  recorder,
  systemMonitors,
  onSelectMonitor
}: RecorderControlDeckProps) {
  const { t } = useI18n();

  const {
    isRecording,
    isPaused,
    isPreviewing,
    recordingTime,
    micLevel,
    countdown,
    cancelCountdown,
    startScreenPreview,
    stopScreenPreview,
    analyserNode,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording
  } = recorder;

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  return (
    <div className="glass-panel control-deck">
      <div className="deck-glow" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="deck-title">
          {t('dashboard.sources')}
        </h2>
        {countdown !== null ? (
          <span className="status-pill recording" style={{ animation: 'pulse-red 1s infinite ease-in-out' }}>
            {t('dashboard.countdownStarting')}...
          </span>
        ) : isRecording ? (
          <span className={`status-pill ${isPaused ? 'paused' : 'recording'}`}>
            {isPaused ? t('dashboard.paused') : t('dashboard.recording')}
          </span>
        ) : isPreviewing ? (
          <span className="status-pill ready" style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8', borderColor: '#06b6d4' }}>
            {t('dashboard.previewOn')}
          </span>
        ) : (
          <span className="status-pill ready">{t('dashboard.ready')}</span>
        )}
      </div>

      {/* Selected parameters list */}
      <div className="sources-grid">
        <div className={`source-card ${options.recordMic ? 'selected' : ''}`} onClick={() => !isRecording && countdown === null && setOptions(prev => ({ ...prev, recordMic: !prev.recordMic }))}>
          <div className="source-card-icon">
            <Mic size={20} />
          </div>
          <div className="source-card-title">{t('dashboard.recordMic')}</div>
        </div>

        <div className={`source-card ${options.recordSystemAudio ? 'selected' : ''}`} onClick={() => !isRecording && countdown === null && setOptions(prev => ({ ...prev, recordSystemAudio: !prev.recordSystemAudio }))}>
          <div className="source-card-icon">
            <Volume2 size={20} />
          </div>
          <div className="source-card-title">{t('dashboard.recordSystem')}</div>
        </div>

        <div className={`source-card ${options.showWebcam ? 'selected' : ''}`} onClick={() => !isRecording && countdown === null && setOptions(prev => ({ ...prev, showWebcam: !prev.showWebcam }))}>
          <div className="source-card-icon">
            <Video size={20} />
          </div>
          <div className="source-card-title">{t('dashboard.webcam')}</div>
        </div>

        <div className={`source-card ${options.showMouseClicks ? 'selected' : ''}`} onClick={() => !isRecording && countdown === null && setOptions(prev => ({ ...prev, showMouseClicks: !prev.showMouseClicks }))}>
          <div className="source-card-icon">
            <MousePointer size={20} />
          </div>
          <div className="source-card-title">{t('dashboard.clicks')}</div>
        </div>

        <div className={`source-card ${options.enableAutoZoom ? 'selected' : ''}`} onClick={() => {
          if (!isRecording && countdown === null) {
            setOptions(prev => ({ ...prev, enableAutoZoom: !prev.enableAutoZoom }));
          }
        }} title={t('settings.video.autoZoomHelp')}>
          <div className="source-card-icon">
            <Sparkles size={20} />
          </div>
          <div className="source-card-title">{t('dashboard.autoZoom')}</div>
        </div>

        <div className={`source-card ${options.enableCinematicCursor !== false ? 'selected' : ''}`} onClick={() => {
          if (!isRecording && countdown === null) {
            setOptions(prev => ({ ...prev, enableCinematicCursor: prev.enableCinematicCursor === false }));
          }
        }} title={t('settings.video.cinematicCursorHelp')}>
          <div className="source-card-icon">
            <Wand2 size={20} />
          </div>
          <div className="source-card-title">{t('dashboard.smoothCursor')}</div>
        </div>

        <div className={`source-card ${options.enableKeystrokeHUD !== false ? 'selected' : ''}`} onClick={() => {
          if (!isRecording && countdown === null) {
            setOptions(prev => ({ ...prev, enableKeystrokeHUD: prev.enableKeystrokeHUD === false }));
          }
        }} title={t('settings.keystrokeHUD.enableHelp')}>
          <div className="source-card-icon">
            <Keyboard size={20} />
          </div>
          <div className="source-card-title">{t('dashboard.keystrokes')}</div>
        </div>
      </div>

      {/* Screen / Monitor Selection */}
      <div style={{
        marginTop: '10px',
        padding: '10px 12px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(56, 189, 248, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={14} color="#38bdf8" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('dashboard.screenSelectTitle')}
            </span>
          </div>
          {systemMonitors.length > 1 && (
            <span style={{
              fontSize: '10px',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '1px 6px',
              borderRadius: '8px',
              fontWeight: 600
            }}>
              {systemMonitors.length} {t('dashboard.detectedScreens')}
            </span>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: systemMonitors.length >= 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: '6px'
        }}>
          {/* 1: Interactive Picker */}
          <button
            type="button"
            disabled={isRecording || countdown !== null}
            onClick={() => onSelectMonitor('prompt')}
            style={{
              padding: '6px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: (options.selectedMonitorId || 'prompt') === 'prompt' ? 700 : 500,
              backgroundColor: (options.selectedMonitorId || 'prompt') === 'prompt' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)',
              border: (options.selectedMonitorId || 'prompt') === 'prompt' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
              color: (options.selectedMonitorId || 'prompt') === 'prompt' ? '#38bdf8' : 'var(--text-secondary)',
              cursor: (isRecording || countdown !== null) ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            title="Affiche le sélecteur natif avec miniatures en direct des écrans et fenêtres"
          >
            <span>{t('dashboard.screenSelectPrompt')}</span>
            <span style={{ fontSize: '9px', opacity: 0.75 }}>{t('dashboard.screenSelectPromptDesc')}</span>
          </button>

          {/* 2: Screen 1 */}
          <button
            type="button"
            disabled={isRecording || countdown !== null}
            onClick={() => onSelectMonitor('screen1')}
            style={{
              padding: '6px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: options.selectedMonitorId === 'screen1' ? 700 : 500,
              backgroundColor: options.selectedMonitorId === 'screen1' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)',
              border: options.selectedMonitorId === 'screen1' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
              color: options.selectedMonitorId === 'screen1' ? '#38bdf8' : 'var(--text-secondary)',
              cursor: (isRecording || countdown !== null) ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            title={systemMonitors[0] ? `Écran 1: ${systemMonitors[0].width}×${systemMonitors[0].height}` : 'Écran 1'}
          >
            <span>{t('dashboard.screenSelect1')}</span>
            <span style={{ fontSize: '9px', opacity: 0.75 }}>
              {systemMonitors[0] ? `${systemMonitors[0].width}×${systemMonitors[0].height}` : 'Principal'}
            </span>
          </button>

          {/* 3: Screen 2 (if 2+ monitors) */}
          {systemMonitors.length >= 2 && (
            <button
              type="button"
              disabled={isRecording || countdown !== null}
              onClick={() => onSelectMonitor('screen2')}
              style={{
                padding: '6px 4px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: options.selectedMonitorId === 'screen2' ? 700 : 500,
                backgroundColor: options.selectedMonitorId === 'screen2' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                border: options.selectedMonitorId === 'screen2' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                color: options.selectedMonitorId === 'screen2' ? '#38bdf8' : 'var(--text-secondary)',
                cursor: (isRecording || countdown !== null) ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.15s ease'
              }}
              title={systemMonitors[1] ? `Écran 2: ${systemMonitors[1].width}×${systemMonitors[1].height}` : 'Écran 2'}
            >
              <span>{t('dashboard.screenSelect2')}</span>
              <span style={{ fontSize: '9px', opacity: 0.75 }}>
                {systemMonitors[1] ? `${systemMonitors[1].width}×${systemMonitors[1].height}` : 'Secondaire'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Trigger Button section */}
      <div className="action-section">
        {countdown !== null ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="countdown-badge-inline">
              <span>{countdown}</span>
            </div>
            <button className="btn-secondary" onClick={cancelCountdown} style={{ fontSize: '12px' }}>
              Annuler
            </button>
          </div>
        ) : !isRecording ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button className="rec-btn" onClick={startRecording} title={t('dashboard.startBtn')}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 0 8px rgba(255,255,255,0.7)' }} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1.5px', textTransform: 'uppercase', textShadow: '0 0 8px var(--accent-glow)' }}>
              {t('dashboard.startBtn')}
            </span>

            <button
              className="btn-secondary"
              onClick={isPreviewing ? stopScreenPreview : startScreenPreview}
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                backgroundColor: isPreviewing ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.06)',
                borderColor: isPreviewing ? '#06b6d4' : 'var(--border-color)',
                color: isPreviewing ? '#38bdf8' : 'var(--text-primary)'
              }}
              title="Affiche l'écran en direct pour cadrer et positionner les zones de flou sans enregistrer"
            >
              {isPreviewing ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{isPreviewing ? t('dashboard.previewOff') : t('dashboard.previewOn')}</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div className="rec-timer">
              {formatTime(recordingTime)}
            </div>

            <div className="rec-controls-row">
              {isPaused ? (
                <button className="control-icon-btn active" onClick={resumeRecording} title="Reprendre l'enregistrement">
                  <Play size={20} fill="white" />
                </button>
              ) : (
                <button className="control-icon-btn" onClick={pauseRecording} title="Mettre en pause l'enregistrement">
                  <Pause size={20} />
                </button>
              )}

              <button className="control-icon-btn stop" onClick={stopRecording} title="Arrêter et sauvegarder l'enregistrement">
                <Square size={20} fill="currentColor" />
              </button>
            </div>
          </div>
        )}
      </div>

      <RecorderAudioVisualizer
        analyserNode={analyserNode}
        isRecording={isRecording}
        isPaused={isPaused}
        recordMic={Boolean(options.recordMic)}
        micLevel={micLevel}
      />
    </div>
  );
}
