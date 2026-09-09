import { useState, useRef, useEffect } from 'react';
import { 
  X, Play, Pause, Camera, Download, Copy, Printer, Check, 
  ChevronUp, ChevronDown, Trash2, Clock, BookOpen, 
  RefreshCw, FileText, Globe
} from 'lucide-react';
import { type SavedMedia } from '../utils/db';

export interface TutorialStep {
  id: string;
  time: number;
  formattedTime: string;
  title: string;
  description: string;
  tip?: string;
  imageUrl: string;
}

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
  const [title, setTitle] = useState(initialTitle.replace(/\.[^/.]+$/, ''));
  const [author, setAuthor] = useState('gotenash');
  const [estimatedTime, setEstimatedTime] = useState('5 min');
  const [difficulty, setDifficulty] = useState<'Débutant' | 'Intermédiaire' | 'Avancé'>('Débutant');
  const [intro, setIntro] = useState('Ce tutoriel vous guide pas-à-pas pour reproduire facilement chaque action démontrée dans la vidéo.');

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

  // Setup video URL
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
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Capture frame from video
  const captureCurrentFrame = (targetStepId?: string) => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to video intrinsic resolution
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const time = video.currentTime;
    const formatted = formatTime(time);

    if (targetStepId) {
      // Update existing step image
      setSteps(prev => prev.map(s => s.id === targetStepId ? { ...s, imageUrl: dataUrl, time, formattedTime: formatted } : s));
    } else {
      // Add new step
      const newStepNumber = steps.length + 1;
      const newStep: TutorialStep = {
        id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        time,
        formattedTime: formatted,
        title: `Étape ${newStepNumber} : Décrivez l'action`,
        description: `Explication détaillée de ce qu'il faut faire à cette étape.`,
        tip: '',
        imageUrl: dataUrl
      };
      setSteps(prev => [...prev, newStep]);
      setSelectedStepId(newStep.id);
    }

    setTimeout(() => setIsCapturing(false), 200);
  };

  const updateStep = (id: string, updates: Partial<TutorialStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
    if (selectedStepId === id) setSelectedStepId(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setSteps(prev => {
        const next = [...prev];
        const temp = next[index - 1];
        next[index - 1] = next[index];
        next[index] = temp;
        return next;
      });
    } else if (direction === 'down' && index < steps.length - 1) {
      setSteps(prev => {
        const next = [...prev];
        const temp = next[index + 1];
        next[index + 1] = next[index];
        next[index] = temp;
        return next;
      });
    }
  };

  // Format Markdown output
  const generateMarkdown = () => {
    let md = `# ${title}\n\n`;
    md += `> ⏱️ **Durée estimée** : ${estimatedTime} | 🎯 **Niveau** : ${difficulty} | 👤 **Auteur** : ${author} | 📅 **Date** : ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    
    if (intro.trim()) {
      md += `## 📋 Introduction\n\n${intro}\n\n---\n\n`;
    }

    md += `## 📑 Sommaire\n\n`;
    steps.forEach((step, idx) => {
      const slug = step.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      md += `${idx + 1}. [${step.title} (${step.formattedTime})](#${slug})\n`;
    });
    md += `\n---\n\n`;

    steps.forEach((step, idx) => {
      md += `### Étape ${idx + 1} : ${step.title}\n`;
      md += `*⏱️ Moment dans la vidéo : ${step.formattedTime}*\n\n`;
      md += `![${step.title}](${step.imageUrl})\n\n`;
      md += `${step.description}\n\n`;
      if (step.tip && step.tip.trim()) {
        md += `> [!TIP]\n> **Astuce :** ${step.tip}\n\n`;
      }
      md += `---\n\n`;
    });

    md += `*Guide généré automatiquement avec [OpenPeek](https://github.com/gotenash/OpenPeek) - Enregistreur d'écran open-source.*`;
    return md;
  };

  // Generate Standalone HTML output
  const generateHTML = (forPrint = false) => {
    const stepsHtml = steps.map((step, idx) => `
      <section class="step-card" id="step-${idx + 1}">
        <div class="step-header">
          <span class="step-badge">Étape ${idx + 1}</span>
          <h2 class="step-title">${step.title}</h2>
          <span class="step-time">⏱️ ${step.formattedTime}</span>
        </div>
        <div class="step-media">
          <img src="${step.imageUrl}" alt="${step.title}" loading="lazy" />
        </div>
        <div class="step-content">
          <p class="step-desc">${step.description.replace(/\n/g, '<br/>')}</p>
          ${step.tip ? `
            <div class="step-tip">
              <span class="tip-icon">💡</span>
              <div><strong>Astuce :</strong> ${step.tip}</div>
            </div>
          ` : ''}
        </div>
      </section>
    `).join('\n');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Guide Pas-à-Pas</title>
  <style>
    :root {
      --primary: #8b5cf6;
      --primary-dark: #6d28d9;
      --bg: #0b0f19;
      --card-bg: #131b2e;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.1);
      --accent: #38bdf8;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --primary: #7c3aed;
        --bg: #f8fafc;
        --card-bg: #ffffff;
        --text: #0f172a;
        --text-muted: #64748b;
        --border: #e2e8f0;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 30px 20px 80px;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
    }
    header.guide-header {
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    h1.guide-title {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #a78bfa 0%, #38bdf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .meta-tag {
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.3);
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 600;
      color: #c4b5fd;
    }
    .intro-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-left: 4px solid var(--primary);
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      font-size: 1rem;
    }
    .step-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      page-break-inside: avoid;
    }
    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .step-badge {
      background: linear-gradient(135deg, #8b5cf6, #3b82f6);
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .step-title {
      font-size: 1.3rem;
      font-weight: 700;
      flex-grow: 1;
    }
    .step-time {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-family: monospace;
    }
    .step-media img {
      width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid var(--border);
      display: block;
      margin-bottom: 16px;
    }
    .step-desc {
      font-size: 1.05rem;
      margin-bottom: 12px;
    }
    .step-tip {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.95rem;
      color: #7dd3fc;
    }
    .footer {
      text-align: center;
      margin-top: 60px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #8b5cf6;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 30px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.5);
      z-index: 100;
    }
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
      }
      .no-print, .print-btn { display: none !important; }
      .container { max-width: 100% !important; }
      h1.guide-title {
        background: none !important;
        -webkit-text-fill-color: initial !important;
        color: #111827 !important;
      }
      .step-card {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        box-shadow: none !important;
        page-break-inside: avoid;
        margin-bottom: 24px;
      }
      .step-badge {
        background: #6d28d9 !important;
        color: #ffffff !important;
      }
      .step-tip {
        background: #f0f9ff !important;
        color: #0369a1 !important;
        border-color: #bae6fd !important;
      }
      .step-media img {
        border-color: #cbd5e1 !important;
      }
    }
  </style>
</head>
<body>
  ${!forPrint ? '<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer ce Guide</button>' : ''}
  <div class="container">
    <header class="guide-header">
      <h1 class="guide-title">${title}</h1>
      <div class="meta-bar">
        <span class="meta-tag">⏱️ ${estimatedTime}</span>
        <span class="meta-tag">🎯 ${difficulty}</span>
        <span>👤 Par <strong>${author}</strong></span>
        <span>📅 ${new Date().toLocaleDateString('fr-FR')}</span>
      </div>
      ${intro ? `<div class="intro-box">${intro.replace(/\n/g, '<br/>')}</div>` : ''}
    </header>

    <main>
      ${stepsHtml}
    </main>

    <footer class="footer">
      Généré avec <strong>OpenPeek</strong> — Enregistreur d'écran et Studio de Tutoriels.
    </footer>
  </div>
</body>
</html>`;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_tuto.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTML = () => {
    const html = generateHTML(false);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_guide.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generateHTML(true));
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
            {/* Left Column: Video Scrubber & Capture Engine */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minHeight: 0,
              overflowY: 'auto',
              paddingRight: '6px'
            }}>
              {/* Video Player Card */}
              <div style={{
                background: '#000000',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  style={{ width: '100%', aspectRatio: '16/9', display: 'block', objectFit: 'contain' }}
                  onClick={togglePlay}
                />

                {/* Overlaid Play/Pause Status */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(6px)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#ffffff'
                }}>
                  {formatTime(currentTime)} / {formatTime(videoDuration)}
                </div>
              </div>

              {/* Scrubber & Player Controls */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 1}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => seekRelative(-5)}
                      className="btn-control-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Reculer de 5 secondes"
                    >
                      -5s
                    </button>
                    <button
                      type="button"
                      onClick={() => seekRelative(-1)}
                      className="btn-control-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Reculer de 1 seconde"
                    >
                      -1s
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={togglePlay}
                    style={{
                      background: 'var(--primary)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '6px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                    <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
                  </button>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => seekRelative(1)}
                      className="btn-control-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Avancer de 1 seconde"
                    >
                      +1s
                    </button>
                    <button
                      type="button"
                      onClick={() => seekRelative(5)}
                      className="btn-control-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Avancer de 5 secondes"
                    >
                      +5s
                    </button>
                  </div>
                </div>
              </div>

              {/* Big Capture Step Button */}
              <button
                type="button"
                onClick={() => captureCurrentFrame()}
                disabled={isCapturing}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
                  transition: 'transform 0.1s ease',
                  opacity: isCapturing ? 0.7 : 1
                }}
              >
                <Camera size={18} />
                <span>📸 Capturer cette étape ({formatTime(currentTime)})</span>
              </button>

              {/* Tutorial Meta Info Settings */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Métadonnées du Guide
                </span>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Titre du tutoriel</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      color: '#ffffff'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Auteur</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)',
                        color: '#ffffff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Durée estimée</label>
                    <input
                      type="text"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="ex: 5 min"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)',
                        color: '#ffffff'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Niveau</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        background: '#1a1e2d',
                        border: '1px solid var(--border-color)',
                        color: '#ffffff'
                      }}
                    >
                      <option value="Débutant">🌱 Débutant</option>
                      <option value="Intermédiaire">⚡ Intermédiaire</option>
                      <option value="Avancé">🔥 Avancé</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Introduction / Objectifs</label>
                  <textarea
                    rows={2}
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    placeholder="Présentez le but de ce tutoriel..."
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      color: '#ffffff',
                      resize: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Step by Step List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              padding: '14px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                  Étapes du Guide ({steps.length})
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Glissez dans la vidéo à gauche et capturez chaque moment clé
                </span>
              </div>

              {steps.length === 0 ? (
                <div style={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: 'var(--text-muted)',
                  padding: '40px 20px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)'
                  }}>
                    <Camera size={30} />
                  </div>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: '0 0 6px 0' }}>
                      Aucune étape capturée pour l'instant
                    </p>
                    <p style={{ fontSize: '13px', margin: 0, maxWidth: '400px' }}>
                      Positionnez la tête de lecture dans le lecteur à gauche et cliquez sur <strong>"Capturer cette étape"</strong> pour illustrer votre guide pas-à-pas.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  paddingRight: '6px'
                }}>
                  {steps.map((step, idx) => {
                    const isSelected = selectedStepId === step.id;
                    return (
                      <div
                        key={step.id}
                        style={{
                          background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setSelectedStepId(step.id)}
                      >
                        {/* Step Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              Étape {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                seekTo(step.time);
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: 'none',
                                color: '#38bdf8',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Se caler sur ce moment dans la vidéo"
                            >
                              <Clock size={11} />
                              {step.formattedTime}
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                captureCurrentFrame(step.id);
                              }}
                              className="control-icon-btn"
                              style={{ width: '26px', height: '26px' }}
                              title="Remplacer la capture par la position actuelle du lecteur"
                            >
                              <RefreshCw size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveStep(idx, 'up');
                              }}
                              disabled={idx === 0}
                              className="control-icon-btn"
                              style={{ width: '26px', height: '26px', opacity: idx === 0 ? 0.3 : 1 }}
                              title="Déplacer vers le haut"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveStep(idx, 'down');
                              }}
                              disabled={idx === steps.length - 1}
                              className="control-icon-btn"
                              style={{ width: '26px', height: '26px', opacity: idx === steps.length - 1 ? 0.3 : 1 }}
                              title="Déplacer vers le bas"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeStep(step.id);
                              }}
                              className="control-icon-btn delete"
                              style={{ width: '26px', height: '26px' }}
                              title="Supprimer cette étape"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Step Card Content */}
                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '12px' }}>
                          <img
                            src={step.imageUrl}
                            alt={step.title}
                            style={{
                              width: '100%',
                              aspectRatio: '16/9',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              display: 'block'
                            }}
                          />

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => updateStep(step.id, { title: e.target.value })}
                              placeholder="Titre de l'étape (ex: Cliquer sur le menu Préférences)"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                color: '#ffffff'
                              }}
                            />
                            <textarea
                              rows={2}
                              value={step.description}
                              onChange={(e) => updateStep(step.id, { description: e.target.value })}
                              placeholder="Instructions détaillées..."
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '12px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                resize: 'none'
                              }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#38bdf8' }}>💡 Astuce :</span>
                              <input
                                type="text"
                                value={step.tip || ''}
                                onChange={(e) => updateStep(step.id, { tip: e.target.value })}
                                placeholder="Conseil ou raccourci facultatif..."
                                style={{
                                  flexGrow: 1,
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  background: 'rgba(56, 189, 248, 0.05)',
                                  border: '1px solid rgba(56, 189, 248, 0.2)',
                                  borderRadius: '4px',
                                  color: '#7dd3fc'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Preview View */}
        {activeTab === 'preview' && (
          <div style={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '28px',
            marginTop: '16px'
          }}>
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              {/* Document Header */}
              <div style={{
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '20px',
                marginBottom: '24px'
              }}>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#ffffff',
                  marginBottom: '10px',
                  background: 'linear-gradient(135deg, #c4b5fd 0%, #38bdf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {title}
                </h1>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#c4b5fd',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}>
                    ⏱️ {estimatedTime}
                  </span>
                  <span style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}>
                    🎯 {difficulty}
                  </span>
                  <span>👤 Auteur : <strong>{author}</strong></span>
                  <span>📅 {new Date().toLocaleDateString('fr-FR')}</span>
                </div>

                {intro && (
                  <div style={{
                    marginTop: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderLeft: '4px solid var(--primary)',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)'
                  }}>
                    {intro}
                  </div>
                )}
              </div>

              {/* Steps Document List */}
              {steps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  Revenez à l'onglet "Édition" pour capturer vos premières étapes.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {steps.map((step, idx) => (
                    <div
                      key={step.id}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <span style={{
                          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                          color: '#ffffff',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          Étape {idx + 1}
                        </span>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#ffffff', flexGrow: 1 }}>
                          {step.title}
                        </h3>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ⏱️ {step.formattedTime}
                        </span>
                      </div>

                      <img
                        src={step.imageUrl}
                        alt={step.title}
                        style={{
                          width: '100%',
                          maxHeight: '400px',
                          objectFit: 'contain',
                          background: '#000000',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          marginBottom: '14px',
                          display: 'block'
                        }}
                      />

                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                        {step.description}
                      </p>

                      {step.tip && (
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'flex-start',
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#7dd3fc'
                        }}>
                          <span>💡</span>
                          <div><strong>Astuce :</strong> {step.tip}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
            {/* Copy Markdown */}
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

            {/* Download Markdown */}
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

            {/* Download Standalone HTML */}
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

            {/* Print / PDF Export */}
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
