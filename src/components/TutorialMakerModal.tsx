import { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, Download, Copy, Printer, Check, 
  FileText, Globe, BookOpen 
} from 'lucide-react';
import { type SavedMedia } from '../utils/db';
import { 
  type TutorialStep, 
  type TutorialMetadata, 
  generateMarkdown, 
  generateHTML 
} from './tutorial/tutorialExporter';
import { TutorialVideoScrubber } from './tutorial/TutorialVideoScrubber';
import { TutorialStepEditor } from './tutorial/TutorialStepEditor';
import { TutorialPreviewTab } from './tutorial/TutorialPreviewTab';

export type { TutorialStep };

export interface TutorialMakerModalProps {
  media?: SavedMedia;
  videoBlob?: Blob;
  videoTitle?: string;
  onClose: () => void;
}

export function TutorialMakerModal({ media, videoBlob, videoTitle, onClose }: TutorialMakerModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  
  // Tutorial metadata
  const initialTitle = media?.title || videoTitle || 'Mon Guide Pas-à-Pas';
  const [meta, setMeta] = useState<TutorialMetadata>({
    title: initialTitle.replace(/\.[^/.]+$/, ''),
    author: 'gotenash',
    estimatedTime: '5 min',
    difficulty: 'Débutant',
    intro: 'Ce tutoriel vous guide pas-à-pas pour reproduire facilement chaque action démontrée dans la vidéo.'
  });

  // Steps list
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Video playback & scrubber
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(media?.duration || 10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');

  useEffect(() => {
    const targetBlob = media?.blob || videoBlob;
    if (targetBlob) {
      const url = URL.createObjectURL(targetBlob);
      setVideoUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [media, videoBlob]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && isFinite(dur) && dur > 0) {
        setVideoDuration(dur);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekRelative = (offset: number) => {
    if (!videoRef.current) return;
    const nextTime = Math.max(0, Math.min(videoDuration, videoRef.current.currentTime + offset));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const seekTo = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoDuration, time));
    setCurrentTime(time);
  };

  const captureCurrentFrame = (targetStepId?: string) => {
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;

    setIsCapturing(true);

    try {
      const w = videoEl.videoWidth || 1280;
      const h = videoEl.videoHeight || 720;
      canvasEl.width = w;
      canvasEl.height = h;

      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoEl, 0, 0, w, h);
      const dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);

      const capturedTime = videoEl.currentTime;
      const fmtTime = formatTime(capturedTime);

      if (targetStepId) {
        setSteps(prev => prev.map(s => s.id === targetStepId ? {
          ...s,
          imageUrl: dataUrl,
          time: capturedTime,
          formattedTime: fmtTime
        } : s));
      } else {
        const newStep: TutorialStep = {
          id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          time: capturedTime,
          formattedTime: fmtTime,
          title: `Action à ${fmtTime}`,
          description: 'Décrivez précisément ce que l\'utilisateur doit faire ici...',
          tip: '',
          imageUrl: dataUrl
        };
        setSteps(prev => [...prev, newStep]);
        setSelectedStepId(newStep.id);
      }
    } catch (err) {
      console.error('[TutorialMaker] Frame capture failed:', err);
    } finally {
      setTimeout(() => setIsCapturing(false), 200);
    }
  };

  const updateStep = (id: string, updates: Partial<TutorialStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
    if (selectedStepId === id) setSelectedStepId(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) return;
    const newSteps = [...steps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const [moved] = newSteps.splice(index, 1);
    newSteps.splice(targetIdx, 0, moved);
    setSteps(newSteps);
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdown(meta, steps);
    navigator.clipboard.writeText(md);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdown(meta, steps);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_tuto.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTML = () => {
    const html = generateHTML(meta, steps, false);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_guide.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generateHTML(meta, steps, true));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="glass-panel" style={{
        width: '95vw',
        maxWidth: '1240px',
        height: '92vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(139, 92, 246, 0.25)'
      }}>
        {/* Hidden Canvas for High-Resolution Frame Extraction */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Modal Top Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
            }}>
              <BookOpen size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                Générateur de Guide Pas-à-Pas
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Capturez les étapes clés de votre capture vidéo et exportez en Markdown, HTML autonome ou PDF.
              </p>
            </div>
          </div>

          {/* Tab Switcher & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'editor' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'editor' ? '#ffffff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Camera size={14} />
                <span>Édition ({steps.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'preview' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'preview' ? '#ffffff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={14} />
                <span>Aperçu du Guide</span>
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab 1: Editor View */}
        {activeTab === 'editor' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '440px 1fr',
            gap: '16px',
            flexGrow: 1,
            minHeight: 0,
            paddingTop: '16px'
          }}>
            {/* Left Column: Video Scrubber & Meta settings */}
            <TutorialVideoScrubber
              videoRef={videoRef}
              videoUrl={videoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              currentTime={currentTime}
              videoDuration={videoDuration}
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
              onSeek={seekTo}
              onSeekRelative={seekRelative}
              onCaptureFrame={() => captureCurrentFrame()}
              isCapturing={isCapturing}
              meta={meta}
              onMetaChange={setMeta}
            />

            {/* Right Column: Step by Step List */}
            <TutorialStepEditor
              steps={steps}
              selectedStepId={selectedStepId}
              onSelectStepId={setSelectedStepId}
              onSeek={seekTo}
              onCaptureCurrentFrame={captureCurrentFrame}
              onMoveStep={moveStep}
              onRemoveStep={removeStep}
              onUpdateStep={updateStep}
            />
          </div>
        )}

        {/* Tab 2: Preview View */}
        {activeTab === 'preview' && (
          <TutorialPreviewTab
            meta={meta}
            steps={steps}
          />
        )}

        {/* Modal Bottom Toolbar & Export Engine */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '14px',
          marginTop: '12px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Exportations rapides :
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              disabled={steps.length === 0}
              className="btn-control-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                opacity: steps.length === 0 ? 0.5 : 1
              }}
              title="Copier le document formaté au format Markdown GitHub"
            >
              {copySuccess ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copySuccess ? 'Copié !' : 'Copier Markdown'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              disabled={steps.length === 0}
              className="btn-control-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                opacity: steps.length === 0 ? 0.5 : 1
              }}
              title="Télécharger le fichier .md avec étapes et images intégrées"
            >
              <Download size={14} />
              <span>Télécharger .md</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHTML}
              disabled={steps.length === 0}
              className="btn-control-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                opacity: steps.length === 0 ? 0.5 : 1
              }}
              title="Télécharger une page web HTML autonome complète prête à être partagée"
            >
              <Globe size={14} />
              <span>Télécharger .html</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              disabled={steps.length === 0}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
                opacity: steps.length === 0 ? 0.5 : 1
              }}
              title="Ouvrir la boîte de dialogue d'impression / Enregistrer en PDF A4"
            >
              <Printer size={14} />
              <span>Imprimer en PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
