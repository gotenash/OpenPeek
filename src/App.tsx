import { useState } from 'react';
import { useRecorder, type RecorderOptions } from './hooks/useRecorder';
import { RecorderDashboard } from './components/RecorderDashboard';
import { VideoLibrary } from './components/VideoLibrary';
import { DrawingCanvas } from './components/DrawingCanvas';
import { SettingsPanel } from './components/SettingsPanel';
import { OverlayCanvas } from './components/OverlayCanvas';
import { VideoEditorStudio } from './components/VideoEditorStudio';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { 
  Video, 
  Film, 
  Settings, 
  PenTool, 
  Globe, 
  Clapperboard,
  Languages
} from 'lucide-react';
import './App.css';

function MainApp() {
  const { t, language, setLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'whiteboard' | 'library' | 'editor' | 'settings'>('dashboard');
  const [libraryRefreshTrigger, setLibraryRefreshTrigger] = useState(0);

  // Recorder configurations state
  const [options, setOptions] = useState<RecorderOptions>({
    resolution: '1080p',
    frameRate: 60,
    codec: 'video/webm;codecs=h264',
    recordMic: true,
    recordSystemAudio: false,
    enableNoiseSuppression: true,
    enableVocalEnhancer: true,
    micGain: 1.15,
    showWebcam: false,
    webcamShape: 'circle',
    webcamHaloColor: '#8b5cf6',
    webcamMirrorMode: true,
    webcamGlow: true,
    showMouseClicks: true,
    enableAutoZoom: false,
    autoZoomFactor: 1.75,
    autoZoomDuration: 2.8,
    selectedMicId: '',
    selectedCamId: '',
    captureSourcePreference: 'screen',
    zoomSoundFeedback: true,
    zoomToastFeedback: true,
    zoomCornerIndicator: true,
    enableCinematicCursor: true,
    cursorSize: 'large',
    cursorSmoothingSpeed: 'cinematic',
    enableKeystrokeHUD: true,
    keystrokeHUDPosition: 'bottom-center',
    selectedMonitorId: 'prompt'
  });

  // Load saved screen preference on startup
  useState(() => {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<string>('get_screen_preference').then((pref) => {
        if (pref) {
          setOptions(prev => ({ ...prev, selectedMonitorId: pref }));
        }
      }).catch(() => {});
    }).catch(() => {});
  });

  // Instantiate recording engine hook
  const recorder = useRecorder(options, () => {
    setLibraryRefreshTrigger(prev => prev + 1);
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <RecorderDashboard 
            options={options} 
            setOptions={setOptions} 
            recorder={recorder} 
          />
        );
      case 'whiteboard':
        return <DrawingCanvas />;
      case 'library':
        return (
          <VideoLibrary 
            refreshTrigger={libraryRefreshTrigger} 
          />
        );
      case 'editor':
        return <VideoEditorStudio />;
      case 'settings':
        return (
          <SettingsPanel 
            options={options} 
            setOptions={setOptions} 
            isRecording={recorder.isRecording}
          />
        );
      default:
        return null;
    }
  };

  const getPageMeta = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: t('meta.dashboardTitle'),
          subtitle: t('meta.dashboardSubtitle')
        };
      case 'whiteboard':
        return {
          title: t('meta.whiteboardTitle'),
          subtitle: t('meta.whiteboardSubtitle')
        };
      case 'library':
        return {
          title: t('meta.libraryTitle'),
          subtitle: t('meta.librarySubtitle')
        };
      case 'editor':
        return {
          title: t('meta.editorTitle'),
          subtitle: t('meta.editorSubtitle')
        };
      case 'settings':
        return {
          title: t('meta.settingsTitle'),
          subtitle: t('meta.settingsSubtitle')
        };
      default:
        return { title: 'OpenPeek', subtitle: '' };
    }
  };

  const meta = getPageMeta();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="logo-icon" style={{ position: 'relative', overflow: 'visible', background: 'transparent', boxShadow: 'none' }}>
              <img src="/app-icon.png" alt="OpenPeek" style={{ width: 34, height: 34, objectFit: 'contain' }} />
              {recorder.isRecording && (
                <span style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  boxShadow: '0 0 8px #ef4444'
                }} />
              )}
            </div>
            <span className="logo-text">OpenPeek</span>
          </div>

          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Video size={18} />
              {t('nav.recorder')}
            </button>

            <button 
              className={`nav-item ${activeTab === 'whiteboard' ? 'active' : ''}`}
              onClick={() => !recorder.isRecording && setActiveTab('whiteboard')}
              disabled={recorder.isRecording}
              style={recorder.isRecording ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={recorder.isRecording ? t('nav.recordingBlocked') : ''}
            >
              <PenTool size={18} />
              {t('nav.whiteboard')}
            </button>

            <button 
              className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => !recorder.isRecording && setActiveTab('library')}
              disabled={recorder.isRecording}
              style={recorder.isRecording ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={recorder.isRecording ? t('nav.recordingBlocked') : ''}
            >
              <Film size={18} />
              {t('nav.library')}
            </button>

            <button 
              className={`nav-item ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => !recorder.isRecording && setActiveTab('editor')}
              disabled={recorder.isRecording}
              style={recorder.isRecording ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={recorder.isRecording ? t('nav.recordingBlocked') : ''}
            >
              <Clapperboard size={18} />
              {t('nav.editor')}
            </button>

            <button 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => !recorder.isRecording && setActiveTab('settings')}
              disabled={recorder.isRecording}
              style={recorder.isRecording ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={recorder.isRecording ? t('nav.recordingBlocked') : ''}
            >
              <Settings size={18} />
              {t('nav.settings')}
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          {/* Language Switcher Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px',
            marginBottom: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px' }}>
              <Languages size={13} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                title="Passer en Français"
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: language === 'fr' ? 700 : 500,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: language === 'fr' ? 'var(--primary)' : 'transparent',
                  color: language === 'fr' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                🇫🇷 FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                title="Switch to English"
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: language === 'en' ? 700 : 500,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: language === 'en' ? 'var(--primary)' : 'transparent',
                  color: language === 'en' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>

          {/* Creator Profile & GitHub Link */}
          <a 
            href="https://github.com/gotenash/OpenPeek" 
            target="_blank" 
            rel="noreferrer" 
            className="author-card"
            title="gotenash / OpenPeek sur GitHub"
          >
            <img 
              src="/avatar.png" 
              alt="gotenash" 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid #8b5cf6',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)',
                objectFit: 'cover',
                flexShrink: 0
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                gotenash
                <Globe size={11} color="#8b5cf6" />
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                OpenPeek
              </span>
            </div>
          </a>

          <div className="version-info">
            OpenPeek v1.2.0 • Open Source
          </div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="main-content">
        <header className="page-header">
          <h1 className="page-title">{meta.title}</h1>
          <p className="page-subtitle">{meta.subtitle}</p>
        </header>

        <section style={{ flexGrow: 1 }}>
          {renderContent()}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const isOverlayWindow = window.location.hash.includes('overlay') || window.location.search.includes('overlay');

  if (isOverlayWindow) {
    document.documentElement.classList.add('overlay-mode');
    document.body.classList.add('overlay-mode');
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.backgroundImage = 'none';
  }

  return (
    <I18nProvider>
      {isOverlayWindow ? <OverlayCanvas /> : <MainApp />}
    </I18nProvider>
  );
}
