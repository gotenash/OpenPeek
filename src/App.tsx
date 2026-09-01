import { useState } from 'react';
import { useRecorder, type RecorderOptions } from './hooks/useRecorder';
import { RecorderDashboard } from './components/RecorderDashboard';
import { VideoLibrary } from './components/VideoLibrary';
import { DrawingCanvas } from './components/DrawingCanvas';
import { SettingsPanel } from './components/SettingsPanel';
import { OverlayCanvas } from './components/OverlayCanvas';
import { VideoEditorStudio } from './components/VideoEditorStudio';
import { 
  Video, 
  Film, 
  Settings, 
  PenTool, 
  Globe,
  VideoOff,
  Clapperboard
} from 'lucide-react';
import './App.css';

export default function App() {
  const isOverlayWindow = window.location.hash === '#overlay' || window.location.search.includes('overlay');

  if (isOverlayWindow) {
    return <OverlayCanvas />;
  }

  const [activeTab, setActiveTab] = useState<'dashboard' | 'whiteboard' | 'library' | 'editor' | 'settings'>('dashboard');
  const [libraryRefreshTrigger, setLibraryRefreshTrigger] = useState(0);

  // Recorder configurations state
  const [options, setOptions] = useState<RecorderOptions>({
    resolution: '1080p',
    frameRate: 30,
    codec: 'video/webm;codecs=vp8',
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
    selectedMicId: '',
    selectedCamId: ''
  });

  // Instantiate recording engine hook
  const recorder = useRecorder(options, () => {
    // When save completes, increment trigger to reload the video library list automatically
    setLibraryRefreshTrigger(prev => prev + 1);
    // Switch to video library view so they can play back their recorded tutorial
    setActiveTab('library');
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
        return <VideoLibrary refreshTrigger={libraryRefreshTrigger} />;
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
          title: 'Enregistrer un Tutoriel',
          subtitle: 'Configurez vos sources et lancez votre capture vidéo en un clic.'
        };
      case 'whiteboard':
        return {
          title: 'Tableau de Présentation',
          subtitle: 'Dessinez vos concepts, écrivez du texte et expliquez vos idées en temps réel.'
        };
      case 'library':
        return {
          title: 'Bibliothèque locale',
          subtitle: 'Consultez, lisez à vitesse variable, renommez et téléchargez vos vidéos enregistrées.'
        };
      case 'editor':
        return {
          title: 'Studio de Montage Vidéo',
          subtitle: 'Assemblez vos captures, appliquez des transitions et insérez des titres.'
        };
      case 'settings':
        return {
          title: 'Options de capture',
          subtitle: 'Ajustez la qualité, la fréquence d\'images, les formats de fichier et vos microphones.'
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
            <div className="logo-icon">
              {recorder.isRecording ? <Video size={20} /> : <VideoOff size={20} />}
            </div>
            <span className="logo-text">OpenPeek</span>
          </div>

          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Video size={18} />
              Enregistreur
            </button>

            <button 
              className={`nav-item ${activeTab === 'whiteboard' ? 'active' : ''}`}
              onClick={() => !recorder.isRecording && setActiveTab('whiteboard')}
              disabled={recorder.isRecording}
              style={recorder.isRecording ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={recorder.isRecording ? "Impossible de changer d'onglet pendant l'enregistrement" : ""}
            >
              <PenTool size={18} />
              Tableau Blanc
            </button>

            <button 
              className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => !recorder.isRecording && setActiveTab('library')}
              disabled={recorder.isRecording}
              style={recorder.isRecording ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={recorder.isRecording ? "Impossible de changer d'onglet pendant l'enregistrement" : ""}
            >
              <Film size={18} />
              Mes Vidéos
            </button>

            <button 
              className={`nav-item ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => !recorder.isRecording && setActiveTab('editor')}
              disabled={recorder.isRecording}
              style={recorder.isRecording ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={recorder.isRecording ? "Impossible de changer d'onglet pendant l'enregistrement" : ""}
            >
              <Clapperboard size={18} />
              Montage Vidéo
            </button>

            <button 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => !recorder.isRecording && setActiveTab('settings')}
              disabled={recorder.isRecording}
              style={recorder.isRecording ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={recorder.isRecording ? "Impossible de changer d'onglet pendant l'enregistrement" : ""}
            >
              <Settings size={18} />
              Configuration
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noreferrer" 
            className="nav-item"
            style={{ padding: '8px 12px', fontSize: '13px' }}
          >
            <Globe size={16} />
            Code Source (GitHub)
          </a>
          <div className="version-info">
            OpenPeek v1.0.0 • Open Source
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
