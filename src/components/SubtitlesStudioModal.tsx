import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Plus, 
  Trash2, 
  Check, 
  FileText, 
  Type, 
  Languages, 
  Layers, 
  Film,
  Volume2,
  VolumeX,
  Key,
  Upload,
  Activity,
  Globe,
  Eraser,
  Mic
} from 'lucide-react';
import { type SavedVideo, saveRecording } from '../utils/db';
import { VoiceGeneratorModal } from './VoiceGeneratorModal';
import { 
  type SubtitleCue, 
  type SubtitleStyleKey, 
  type SubtitlePosition, 
  type SubtitleOptions, 
  type WordAnimationType,
  SUBTITLE_PRESETS,
  getAccurateVideoDuration,
  extractAudioWavFromBlob,
  transcribeWithWhisper,
  detectSpeechSegments,
  parseSrt,
  parseVtt,
  splitLongCues,
  cleanFillerWords,
  translateSubtitleCues,
  transcribeVideoLocally, 
  drawSubtitles, 
  generateSrt, 
  generateVtt, 
  renderSubtitledVideo, 
  renderSubtitledGif 
} from '../utils/subtitlesEngine';

interface SubtitlesStudioModalProps {
  video: SavedVideo;
  onClose: () => void;
  onSavedToLibrary?: () => void;
}

export function SubtitlesStudioModal({ video, onClose, onSavedToLibrary }: SubtitlesStudioModalProps) {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<SubtitleStyleKey>('tiktok');
  const [position, setPosition] = useState<SubtitlePosition>('bottom');
  const [language, setLanguage] = useState<string>('fr-FR');
  const [fontSize, setFontSize] = useState<number>(42);
  const [maxWordsPerSegment, setMaxWordsPerSegment] = useState<number>(4);
  const [wordAnimation, setWordAnimation] = useState<WordAnimationType>('pop');

  // Audio & Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(video.duration || 10);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);

  // Transcription & AI state
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeStatus, setTranscribeStatus] = useState<string>('');
  const [showWhisperConfig, setShowWhisperConfig] = useState<boolean>(false);
  const [whisperApiKey, setWhisperApiKey] = useState<string>(() => localStorage.getItem('openpeek_whisper_key') || '');
  const [whisperService, setWhisperService] = useState<'groq' | 'openai'>(() => (localStorage.getItem('openpeek_whisper_service') as 'groq' | 'openai') || 'groq');

  // Translation & Cleanup state
  const [showTranslateMenu, setShowTranslateMenu] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [targetLang, setTargetLang] = useState<string>('en');
  const [cleanedNotification, setCleanedNotification] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportType, setExportType] = useState<'video' | 'gif'>('video');
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Setup video element with accurate duration and audio playback
  useEffect(() => {
    const v = document.createElement('video');
    v.src = URL.createObjectURL(video.blob);
    v.muted = false;
    v.volume = 1.0;
    v.loop = true;
    v.playsInline = true;
    v.autoplay = true;
    v.play().catch(() => {});
    videoRef.current = v;

    getAccurateVideoDuration(v, video.duration).then((dur) => {
      if (dur > 0) {
        setVideoDuration(dur);
      }
    });

    return () => {
      v.pause();
      URL.revokeObjectURL(v.src);
      videoRef.current = null;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [video.blob, video.duration]);

  // Sync mute and volume with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  // Derive current subtitle options
  const subtitleOptions: SubtitleOptions = {
    ...SUBTITLE_PRESETS[selectedStyle].defaultOptions,
    position,
    fontSize,
    wordAnimation
  };

  // Live Canvas Rendering Loop
  useEffect(() => {
    const v = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!canvas || !v) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const renderLoop = () => {
      if (!isMounted) return;

      const origW = v.videoWidth || 1280;
      const origH = v.videoHeight || 720;

      if (canvas.width !== origW || canvas.height !== origH) {
        canvas.width = origW;
        canvas.height = origH;
      }

      if (v.readyState >= 2) {
        ctx.drawImage(v, 0, 0, origW, origH);
        drawSubtitles(ctx, origW, origH, cues, v.currentTime, subtitleOptions);
        setCurrentTime(v.currentTime);
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [cues, selectedStyle, position, fontSize]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(videoDuration, time));
    setCurrentTime(v.currentTime);
  };

  // 1. Whisper AI Transcription
  const handleWhisperTranscribe = async () => {
    if (!whisperApiKey.trim()) {
      setShowWhisperConfig(true);
      return;
    }

    setIsTranscribing(true);
    setTranscribeStatus('Extraction de la piste audio...');

    try {
      localStorage.setItem('openpeek_whisper_key', whisperApiKey.trim());
      localStorage.setItem('openpeek_whisper_service', whisperService);

      const audioWav = await extractAudioWavFromBlob(video.blob);
      setTranscribeStatus(`Transcription Whisper (${whisperService.toUpperCase()})...`);

      const generatedCues = await transcribeWithWhisper(
        audioWav,
        whisperApiKey,
        whisperService,
        language,
        maxWordsPerSegment
      );

      if (generatedCues.length > 0) {
        setCues(generatedCues);
        setShowWhisperConfig(false);
      } else {
        alert("Aucune parole détectée dans l'audio.");
      }
    } catch (e: any) {
      alert(`Erreur de transcription Whisper : ${e.message || e}`);
    } finally {
      setIsTranscribing(false);
      setTranscribeStatus('');
    }
  };

  // 2. Smart VAD Segmentation
  const handleVadSegment = async () => {
    setIsTranscribing(true);
    setTranscribeStatus('Découpage intelligent des silences (VAD)...');
    try {
      const generated = await detectSpeechSegments(video.blob, videoDuration);
      setCues(generated);
    } catch {
      alert("Erreur lors de l'analyse vocale.");
    } finally {
      setIsTranscribing(false);
      setTranscribeStatus('');
    }
  };

  // 3. Fallback Web Speech Recognition
  const handleLocalTranscribe = async () => {
    setIsTranscribing(true);
    setTranscribeStatus('Recherche de voix...');
    try {
      const generatedCues = await transcribeVideoLocally(
        video.blob,
        videoDuration,
        language,
        (p) => setTranscribeStatus(`Progression locale : ${p}%`)
      );
      setCues(generatedCues);
    } catch {
      alert("Erreur lors de la transcription locale.");
    } finally {
      setIsTranscribing(false);
      setTranscribeStatus('');
    }
  };

  // Clean Verbal Tics & Filler words
  const handleCleanTics = () => {
    if (cues.length === 0) return;
    const cleaned = cleanFillerWords(cues, language);
    setCues(cleaned);
    setCleanedNotification(true);
    setTimeout(() => setCleanedNotification(false), 3000);
  };

  // Translate Subtitle Cues
  const handleTranslate = async (langCode: string) => {
    if (cues.length === 0) return;
    setIsTranslating(true);
    try {
      const translated = await translateSubtitleCues(cues, langCode, whisperApiKey, whisperService);
      setCues(translated);
      setShowTranslateMenu(false);
    } catch (e: any) {
      alert(`Erreur de traduction : ${e.message || e}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // 4. File Import (.SRT / .VTT)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      let importedCues: SubtitleCue[] = [];
      if (file.name.endsWith('.vtt')) {
        importedCues = parseVtt(content);
      } else {
        importedCues = parseSrt(content);
      }

      if (importedCues.length > 0) {
        setCues(importedCues);
      } else {
        alert("Impossible de lire les sous-titres depuis ce fichier.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddCue = () => {
    const newStart = Math.round(currentTime * 10) / 10;
    const newEnd = Math.min(videoDuration, newStart + 2.5);
    const newCue: SubtitleCue = {
      id: `cue_${Date.now()}`,
      startTime: newStart,
      endTime: newEnd,
      text: 'Nouveau sous-titre...'
    };
    setCues(prev => [...prev, newCue].sort((a, b) => a.startTime - b.startTime));
  };

  const handleUpdateCueText = (id: string, text: string) => {
    setCues(prev => prev.map(c => c.id === id ? { ...c, text } : c));
  };

  const handleUpdateCueTiming = (id: string, field: 'startTime' | 'endTime', value: number) => {
    setCues(prev => prev.map(c => c.id === id ? { ...c, [field]: Math.max(0, value) } : c));
  };

  const handleDeleteCue = (id: string) => {
    setCues(prev => prev.filter(c => c.id !== id));
  };

  // Export SRT file
  const handleDownloadSrt = () => {
    if (cues.length === 0) return;
    const content = generateSrt(cues);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = (video.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${cleanTitle}_subtitles.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export VTT file
  const handleDownloadVtt = () => {
    if (cues.length === 0) return;
    const content = generateVtt(cues);
    const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = (video.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${cleanTitle}_subtitles.vtt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Video Export execution
  const handleExportVideo = async () => {
    if (cues.length === 0) {
      alert("Ajoutez ou générez au moins un sous-titre avant d'exporter.");
      return;
    }

    setIsExporting(true);
    setExportType('video');
    setExportProgress(0);
    setExportedBlob(null);
    setSavedSuccess(false);

    abortControllerRef.current = new AbortController();

    try {
      const blob = await renderSubtitledVideo(
        video.blob,
        cues,
        subtitleOptions,
        videoDuration,
        (p) => setExportProgress(p),
        abortControllerRef.current.signal
      );
      setExportedBlob(blob);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        alert("Erreur lors de l'exportation vidéo.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  // GIF Export execution
  const handleExportGif = async () => {
    if (cues.length === 0) {
      alert("Ajoutez ou générez au moins un sous-titre avant d'exporter.");
      return;
    }

    setIsExporting(true);
    setExportType('gif');
    setExportProgress(0);
    setExportedBlob(null);
    setSavedSuccess(false);

    abortControllerRef.current = new AbortController();

    try {
      const blob = await renderSubtitledGif(
        video.blob,
        cues,
        subtitleOptions,
        { fps: 12, speed: 1.0, maxColors: 256 },
        videoDuration,
        (p) => setExportProgress(p),
        abortControllerRef.current.signal
      );
      setExportedBlob(blob);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        alert("Erreur lors de l'exportation GIF.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExported = () => {
    if (!exportedBlob) return;
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = exportType === 'gif' ? 'gif' : 'webm';
    const cleanTitle = (video.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${cleanTitle}_subtitled.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToLibrary = async () => {
    if (!exportedBlob) return;
    try {
      const canvas = previewCanvasRef.current;
      const thumb = canvas ? canvas.toDataURL('image/jpeg', 0.8) : '';
      await saveRecording({
        id: crypto.randomUUID ? crypto.randomUUID() : `sub_${Date.now()}`,
        title: `${video.title} (Sous-titré)`,
        blob: exportedBlob,
        thumbnail: thumb,
        duration: videoDuration,
        size: exportedBlob.size,
        date: new Date().toISOString()
      });
      setSavedSuccess(true);
      onSavedToLibrary?.();
    } catch {
      alert("Erreur lors de la sauvegarde.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '12px' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".srt,.vtt,text/plain"
        style={{ display: 'none' }}
      />

      <div 
        className="glass-panel modal-content" 
        style={{ 
          maxWidth: '980px', 
          width: '98%', 
          maxHeight: '94vh', 
          overflowY: 'auto', 
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: 0, paddingBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '6px', 
              background: 'linear-gradient(135deg, #fde047, #f97316)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#0f172a'
            }}>
              <Type size={16} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '16px', margin: 0 }}>
                Sous-titres & Captions Dynamiques
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Générez des sous-titres animés style TikTok / Hormozi, éditez le texte et exportez en SRT ou Vidéo avec son d'origine.
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isExporting || isTranscribing}>
            <X size={18} />
          </button>
        </div>

        {/* Video Canvas Preview */}
        <div style={{
          position: 'relative',
          height: '260px',
          maxHeight: '260px',
          backgroundColor: '#0a0a0f',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-color)'
        }}>
          <canvas 
            ref={previewCanvasRef} 
            style={{ 
              maxHeight: '100%', 
              maxWidth: '100%', 
              objectFit: 'contain',
              borderRadius: '4px'
            }} 
          />

          {/* Left Controls: Play/Pause & Sound */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            padding: '4px 8px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <button
              onClick={togglePlay}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '2px'
              }}
              title={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                background: 'none',
                border: 'none',
                color: isMuted ? '#f87171' : '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '2px'
              }}
              title={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (val > 0 && isMuted) setIsMuted(false);
              }}
              style={{ width: '50px', accentColor: '#38bdf8', cursor: 'pointer' }}
              title={`Volume : ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          {/* Time Badge */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            fontSize: '11px',
            color: 'var(--text-secondary)'
          }}>
            {currentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
          </div>
        </div>

        {/* Transcribe & Options Action Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(253, 224, 71, 0.1), rgba(249, 115, 22, 0.1))',
          border: '1px solid rgba(253, 224, 71, 0.25)',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            {/* Whisper AI Transcribe Button */}
            <button
              className="btn-primary"
              onClick={handleWhisperTranscribe}
              disabled={isTranscribing || isExporting}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Transcrire l'audio avec l'IA Whisper (Groq / OpenAI)"
            >
              {isTranscribing ? <Sparkles size={14} className="spinning" /> : <Sparkles size={14} />}
              <span>{isTranscribing ? transcribeStatus : 'Transcrire avec Whisper IA'}</span>
            </button>

            {/* Whisper Settings Toggle */}
            <button
              className="btn-secondary"
              onClick={() => setShowWhisperConfig(!showWhisperConfig)}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Configurer la clé API Whisper (Groq gratuit / OpenAI)"
            >
              <Key size={12} color="#fde047" />
              <span>Clé API</span>
            </button>

            {/* Smart VAD Audio Segmentation */}
            <button
              className="btn-secondary"
              onClick={handleVadSegment}
              disabled={isTranscribing || isExporting}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Détecter automatiquement les pauses vocales et silences de la vidéo"
            >
              <Activity size={12} color="#38bdf8" />
              <span>Découpage VAD</span>
            </button>

            {/* Import SRT / VTT */}
            <button
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTranscribing || isExporting}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Importer un fichier de sous-titres .SRT ou .VTT existant"
            >
              <Upload size={12} />
              <span>Importer .SRT / .VTT</span>
            </button>

            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
              <Languages size={13} color="#fde047" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="form-input"
                style={{ padding: '3px 6px', fontSize: '11px' }}
              >
                <option value="fr-FR">Français</option>
                <option value="en-US">Anglais</option>
                <option value="es-ES">Espagnol</option>
                <option value="de-DE">Allemand</option>
              </select>
            </div>

            {/* Segment Length Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '2px' }}>
              <select
                value={maxWordsPerSegment}
                onChange={(e) => setMaxWordsPerSegment(parseInt(e.target.value))}
                className="form-input"
                style={{ padding: '3px 6px', fontSize: '11px', color: '#fde047', borderColor: 'rgba(253, 224, 71, 0.4)' }}
                title="Format de longueur des segments de sous-titres"
              >
                <option value={3}>⚡ 3 mots / segment (Court)</option>
                <option value={4}>⚡ 4 mots / segment (TikTok)</option>
                <option value={6}>📝 6 mots / segment (Équilibré)</option>
                <option value={10}>📄 10 mots / segment (Long)</option>
              </select>
            </div>
          </div>

          {/* Quick SRT / VTT Download */}
          {cues.length > 0 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn-secondary"
                onClick={handleDownloadSrt}
                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Télécharger les sous-titres au format .SRT"
              >
                <FileText size={12} />
                <span>.SRT</span>
              </button>

              <button
                className="btn-secondary"
                onClick={handleDownloadVtt}
                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Télécharger les sous-titres au format .VTT"
              >
                <FileText size={12} />
                <span>.VTT</span>
              </button>
            </div>
          )}
        </div>

        {/* Whisper API Configuration Drawer */}
        {showWhisperConfig && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(253, 224, 71, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#fde047' }}>
                Configuration Whisper Speech-to-Text (Transcription Ultra-Rapide) :
              </span>
              <button
                onClick={() => setShowWhisperConfig(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Moteur :</span>
                <select
                  value={whisperService}
                  onChange={(e) => setWhisperService(e.target.value as 'groq' | 'openai')}
                  className="form-input"
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                >
                  <option value="groq">Groq Whisper (Gratuit & Ultra Rapide)</option>
                  <option value="openai">OpenAI Whisper (whisper-1)</option>
                </select>
              </div>

              <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Clé API :</span>
                <input
                  type="password"
                  placeholder={whisperService === 'groq' ? 'gsk_...' : 'sk-...'}
                  value={whisperApiKey}
                  onChange={(e) => setWhisperApiKey(e.target.value)}
                  style={{
                    flexGrow: 1,
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: '#ffffff'
                  }}
                />
              </div>

              <button
                className="btn-primary"
                onClick={handleWhisperTranscribe}
                style={{ padding: '4px 12px', fontSize: '11px' }}
              >
                Lancer la transcription
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>
              💡 Astuce : Avec Groq Cloud (gratuit sur console.groq.com), une vidéo de 3 minutes est transcrite avec horodatages précis en moins de 2 secondes.
            </p>
          </div>
        )}

        {/* Style & Position Options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
          {/* Caption Style Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Style Visuel d'Incrustation :
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {(Object.keys(SUBTITLE_PRESETS) as SubtitleStyleKey[]).map((key) => {
                const p = SUBTITLE_PRESETS[key];
                const isSel = selectedStyle === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedStyle(key);
                      if (p.defaultOptions.wordAnimation) {
                        setWordAnimation(p.defaultOptions.wordAnimation);
                      }
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: isSel ? 'rgba(253, 224, 71, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: isSel ? '1px solid #fde047' : '1px solid var(--border-color)',
                      color: isSel ? '#fde047' : 'var(--text-secondary)',
                      fontSize: '11px',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{p.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Position, Size & Animation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Position, Taille & Animation :
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'bottom', label: '⬇️ Bas' },
                { id: 'middle', label: '⏺️ Milieu' },
                { id: 'top', label: '⬆️ Haut' }
              ].map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setPosition(pos.id as SubtitlePosition)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    backgroundColor: position === pos.id ? 'rgba(253, 224, 71, 0.2)' : 'rgba(255,255,255,0.03)',
                    border: position === pos.id ? '1px solid #fde047' : '1px solid var(--border-color)',
                    color: position === pos.id ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {pos.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', width: '70px' }}>Taille ({fontSize}px) :</span>
              <input
                type="range"
                min={24}
                max={64}
                step={2}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                style={{ flexGrow: 1, accentColor: '#fde047' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', width: '70px' }}>Animation :</span>
              <select
                value={wordAnimation}
                onChange={(e) => setWordAnimation(e.target.value as WordAnimationType)}
                className="form-input"
                style={{ flexGrow: 1, padding: '3px 6px', fontSize: '10px', color: '#fde047', borderColor: 'rgba(253, 224, 71, 0.4)' }}
              >
                <option value="pop">💥 Pop Élastique (CapCut / Hormozi)</option>
                <option value="bounce">🏀 Rebond Dynamique (Bounce)</option>
                <option value="zoom">🔍 Zoom Accentuation</option>
                <option value="none">⏹️ Standard (Fixe)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Timeline Transcript Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Lignes de Sous-titres ({cues.length}) :
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {cues.length > 0 && (
                <>
                  <button
                    onClick={handleCleanTics}
                    style={{
                      background: cleanedNotification ? 'rgba(74, 222, 128, 0.15)' : 'rgba(236, 72, 153, 0.12)',
                      border: cleanedNotification ? '1px solid #4ade80' : '1px solid rgba(236, 72, 153, 0.35)',
                      color: cleanedNotification ? '#4ade80' : '#f472b6',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Supprimer les 'Euh...', hésitations et répétitions du texte"
                  >
                    <Eraser size={11} />
                    <span>{cleanedNotification ? '✓ Nettoyé !' : 'Nettoyer "Euh..."'}</span>
                  </button>

                  <button
                    onClick={() => setShowTranslateMenu(!showTranslateMenu)}
                    style={{
                      background: showTranslateMenu ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Traduire tous les sous-titres dans une autre langue"
                  >
                    <Globe size={11} />
                    <span>Traduire...</span>
                  </button>

                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    style={{
                      background: 'rgba(192, 132, 252, 0.15)',
                      border: '1px solid rgba(192, 132, 252, 0.35)',
                      color: '#c084fc',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Générer une voix off IA qui lit tous vos sous-titres"
                  >
                    <Mic size={11} />
                    <span>Voix IA...</span>
                  </button>

                  <button
                    onClick={() => setCues(prev => splitLongCues(prev, maxWordsPerSegment))}
                    style={{
                      background: 'rgba(253, 224, 71, 0.1)',
                      border: '1px solid rgba(253, 224, 71, 0.3)',
                      color: '#fde047',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Découper les sous-titres trop longs en segments courts de 3 à 4 mots"
                  >
                    <span>✂️ Raccourcir</span>
                  </button>
                </>
              )}
              {cues.length === 0 && (
                <button
                  onClick={handleLocalTranscribe}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Auto-segmenter
                </button>
              )}
              <button
                onClick={handleAddCue}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fde047',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} />
                <span>+ Ajouter</span>
              </button>
            </div>
          </div>

          {/* Quick Translation Popover Drawer */}
          {showTranslateMenu && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(56, 189, 248, 0.4)'
            }}>
              <Globe size={13} color="#38bdf8" />
              <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 600 }}>Traduire vers :</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="form-input"
                style={{ padding: '2px 6px', fontSize: '11px', flexGrow: 1 }}
              >
                <option value="en">Anglais (English)</option>
                <option value="es">Espagnol (Español)</option>
                <option value="de">Allemand (Deutsch)</option>
                <option value="it">Italien (Italiano)</option>
                <option value="pt">Portugais (Português)</option>
                <option value="fr">Français (Français)</option>
                <option value="ja">Japonais (日本語)</option>
                <option value="zh">Chinois (中文)</option>
                <option value="nl">Néerlandais (Nederlands)</option>
                <option value="ar">Arabe (العربية)</option>
              </select>
              <button
                className="btn-primary"
                onClick={() => handleTranslate(targetLang)}
                disabled={isTranslating}
                style={{ padding: '3px 10px', fontSize: '11px', background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}
              >
                {isTranslating ? 'Traduction en cours...' : 'Traduire en 1 clic'}
              </button>
              <button
                onClick={() => setShowTranslateMenu(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div style={{
            maxHeight: '140px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '6px',
            backgroundColor: 'rgba(0,0,0,0.25)',
            borderRadius: '6px',
            border: '1px solid var(--border-color)'
          }}>
            {cues.map((cue) => {
              const isActive = currentTime >= cue.startTime && currentTime <= cue.endTime;
              return (
                <div
                  key={cue.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: isActive ? 'rgba(253, 224, 71, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: isActive ? '1px solid #fde047' : '1px solid var(--border-color)'
                  }}
                >
                  <button
                    onClick={() => seekTo(cue.startTime)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isActive ? '#fde047' : 'var(--text-muted)',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      width: '45px',
                      textAlign: 'left'
                    }}
                    title="Aller à ce moment"
                  >
                    {cue.startTime.toFixed(1)}s
                  </button>

                  <input
                    type="text"
                    value={cue.text}
                    onChange={(e) => handleUpdateCueText(cue.id, e.target.value)}
                    style={{
                      flexGrow: 1,
                      padding: '3px 8px',
                      fontSize: '11px',
                      backgroundColor: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: '#ffffff'
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={cue.startTime}
                      onChange={(e) => handleUpdateCueTiming(cue.id, 'startTime', parseFloat(e.target.value) || 0)}
                      style={{ width: '45px', padding: '2px 4px', fontSize: '10px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '3px' }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>-</span>
                    <input
                      type="number"
                      step="0.1"
                      value={cue.endTime}
                      onChange={(e) => handleUpdateCueTiming(cue.id, 'endTime', parseFloat(e.target.value) || 0)}
                      style={{ width: '45px', padding: '2px 4px', fontSize: '10px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '3px' }}
                    />
                  </div>

                  <button
                    onClick={() => handleDeleteCue(cue.id)}
                    style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '2px' }}
                    title="Supprimer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            {cues.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px 8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                Cliquez sur "Transcrire avec Whisper IA", "Découpage VAD", "Importer .SRT" ou "+ Ajouter un sous-titre" pour commencer.
              </div>
            )}
          </div>
        </div>

        {/* Progress Display */}
        {isExporting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(253, 224, 71, 0.1)', border: '1px solid rgba(253, 224, 71, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Rendu {exportType.toUpperCase()} avec son & sous-titres...</span>
              <span>{exportProgress}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${exportProgress}%`, background: 'linear-gradient(90deg, #fde047, #f97316)', transition: 'width 0.1s linear' }} />
            </div>
          </div>
        )}

        {/* Modal Controls Footer */}
        <div className="modal-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
          <button className="action-btn" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={onClose} disabled={isExporting}>
            Fermer
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {exportedBlob ? (
              <>
                <button
                  className="btn-secondary"
                  onClick={handleSaveToLibrary}
                  disabled={savedSuccess}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {savedSuccess ? <Check size={14} color="#4ade80" /> : <Layers size={14} />}
                  <span>{savedSuccess ? 'Enregistré' : 'Sauvegarder'}</span>
                </button>

                <button
                  className="btn-primary"
                  onClick={handleDownloadExported}
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Télécharger {exportType.toUpperCase()}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn-secondary"
                  onClick={handleExportGif}
                  disabled={isExporting || cues.length === 0}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fde047' }}
                >
                  <Film size={14} />
                  <span>Exporter en GIF</span>
                </button>

                <button
                  className="btn-primary"
                  onClick={handleExportVideo}
                  disabled={isExporting || cues.length === 0}
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
                >
                  {isExporting ? <Sparkles size={14} className="spinning" /> : <Sparkles size={14} />}
                  <span>Exporter Vidéo Sous-titrée</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Voice Generator Modal */}
      {isVoiceModalOpen && (
        <VoiceGeneratorModal
          initialText={cues.map(c => c.text).join(' ')}
          onClose={() => setIsVoiceModalOpen(false)}
          onGenerated={(_title, _blob) => {
            setIsVoiceModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
