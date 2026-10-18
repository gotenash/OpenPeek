import React, { useState, useRef, useEffect } from 'react';
import { X, Type } from 'lucide-react';
import { type SavedVideo, saveRecording } from '../utils/db';
import { VoiceGeneratorModal } from './VoiceGeneratorModal';
import { 
  type SubtitleCue, 
  type SubtitleStyleKey, 
  type SubtitlePosition, 
  type SubtitleOptions, 
  type WordAnimationType,
  SUBTITLE_PRESETS,
  resolveAccurateBlobDuration,
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
import { SubtitlesPlaybackPreview } from './subtitles/SubtitlesPlaybackPreview';
import { SubtitlesActionBar } from './subtitles/SubtitlesActionBar';
import { SubtitlesStyleBar } from './subtitles/SubtitlesStyleBar';
import { SubtitlesCuesList } from './subtitles/SubtitlesCuesList';
import { SubtitlesExportFooter } from './subtitles/SubtitlesExportFooter';

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
  const [whisperService, setWhisperService] = useState<'groq' | 'openai'>(() => (localStorage.getItem('openpeek_whisper_service') as 'groq' | 'openai') || 'groq');
  const [whisperApiKey, setWhisperApiKey] = useState<string>(() => {
    const s = (localStorage.getItem('openpeek_whisper_service') as 'groq' | 'openai') || 'groq';
    if (s === 'groq') return localStorage.getItem('openpeek_groq_key') || localStorage.getItem('openpeek_whisper_key') || '';
    return localStorage.getItem('openpeek_openai_key') || localStorage.getItem('openpeek_whisper_key') || '';
  });

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
    let isCancelled = false;
    const v = document.createElement('video');
    v.src = URL.createObjectURL(video.blob);
    v.muted = false;
    v.volume = 1.0;
    v.loop = true;
    v.playsInline = true;
    v.autoplay = true;
    v.play().catch(() => {});
    videoRef.current = v;

    v.onloadedmetadata = () => {
      if (isFinite(v.duration) && v.duration > 0.5) {
        if (!isCancelled) setVideoDuration(prev => Math.max(prev, v.duration));
      }
    };

    v.ontimeupdate = () => {
      if (v.currentTime > 0) {
        if (!isCancelled) setVideoDuration(prev => Math.max(prev, v.currentTime));
      }
    };

    resolveAccurateBlobDuration(video.blob, video.duration).then((dur) => {
      if (!isCancelled && dur > 0.5) {
        setVideoDuration(prev => Math.max(prev, dur));
      }
    });

    return () => {
      isCancelled = true;
      v.pause();
      URL.revokeObjectURL(v.src);
      videoRef.current = null;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [video.blob, video.duration]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

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
      if (whisperService === 'groq') {
        localStorage.setItem('openpeek_groq_key', whisperApiKey.trim());
      } else {
        localStorage.setItem('openpeek_openai_key', whisperApiKey.trim());
      }

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
        const maxCueEnd = Math.max(...generatedCues.map(c => c.endTime));
        if (isFinite(maxCueEnd) && maxCueEnd > 0) {
          setVideoDuration(prev => Math.max(prev, maxCueEnd));
        }
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

  const handleVadSegment = async () => {
    setIsTranscribing(true);
    setTranscribeStatus('Découpage intelligent des silences (VAD)...');
    try {
      const generated = await detectSpeechSegments(video.blob, videoDuration);
      setCues(generated);
      if (generated.length > 0) {
        const maxCueEnd = Math.max(...generated.map(c => c.endTime));
        if (isFinite(maxCueEnd) && maxCueEnd > 0) {
          setVideoDuration(prev => Math.max(prev, maxCueEnd));
        }
      }
    } catch (err) {
      console.error('[SubtitlesStudio] Speech segment detection failed:', err);
      alert("Erreur lors de l'analyse vocale.");
    } finally {
      setIsTranscribing(false);
      setTranscribeStatus('');
    }
  };

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
      if (generatedCues.length > 0) {
        const maxCueEnd = Math.max(...generatedCues.map(c => c.endTime));
        if (isFinite(maxCueEnd) && maxCueEnd > 0) {
          setVideoDuration(prev => Math.max(prev, maxCueEnd));
        }
      }
    } catch (err) {
      console.error('[SubtitlesStudio] Local video transcription failed:', err);
      alert("Erreur lors de la transcription locale.");
    } finally {
      setIsTranscribing(false);
      setTranscribeStatus('');
    }
  };

  const handleCleanTics = () => {
    if (cues.length === 0) return;
    const cleaned = cleanFillerWords(cues, language);
    setCues(cleaned);
    setCleanedNotification(true);
    setTimeout(() => setCleanedNotification(false), 3000);
  };

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
        const maxCueEnd = Math.max(...importedCues.map(c => c.endTime));
        if (isFinite(maxCueEnd) && maxCueEnd > 0) {
          setVideoDuration(prev => Math.max(prev, maxCueEnd));
        }
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
    } catch (err) {
      console.error('[SubtitlesStudio] Error saving to library:', err);
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
        <SubtitlesPlaybackPreview
          canvasRef={previewCanvasRef}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          volume={volume}
          onVolumeChange={(val) => {
            setVolume(val);
            if (val > 0 && isMuted) setIsMuted(false);
          }}
          currentTime={currentTime}
          videoDuration={videoDuration}
        />

        {/* Transcribe & Options Action Bar */}
        <SubtitlesActionBar
          isTranscribing={isTranscribing}
          isExporting={isExporting}
          transcribeStatus={transcribeStatus}
          onWhisperTranscribe={handleWhisperTranscribe}
          showWhisperConfig={showWhisperConfig}
          onToggleWhisperConfig={() => setShowWhisperConfig(!showWhisperConfig)}
          whisperService={whisperService}
          onWhisperServiceChange={(s) => {
            setWhisperService(s);
            localStorage.setItem('openpeek_whisper_service', s);
            const key = (s === 'groq') ? localStorage.getItem('openpeek_groq_key') || '' : localStorage.getItem('openpeek_openai_key') || '';
            setWhisperApiKey(key);
          }}
          whisperApiKey={whisperApiKey}
          onWhisperApiKeyChange={setWhisperApiKey}
          onVadSegment={handleVadSegment}
          onImportClick={() => fileInputRef.current?.click()}
          language={language}
          onLanguageChange={setLanguage}
          maxWordsPerSegment={maxWordsPerSegment}
          onMaxWordsPerSegmentChange={setMaxWordsPerSegment}
          cues={cues}
          onDownloadSrt={handleDownloadSrt}
          onDownloadVtt={handleDownloadVtt}
        />

        {/* Style & Position Options */}
        <SubtitlesStyleBar
          selectedStyle={selectedStyle}
          onSelectStyle={setSelectedStyle}
          position={position}
          onPositionChange={setPosition}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          wordAnimation={wordAnimation}
          onWordAnimationChange={setWordAnimation}
        />

        {/* Timeline Transcript Editor */}
        <SubtitlesCuesList
          cues={cues}
          currentTime={currentTime}
          onSeek={seekTo}
          onUpdateCueText={handleUpdateCueText}
          onUpdateCueTiming={handleUpdateCueTiming}
          onDeleteCue={handleDeleteCue}
          onAddCue={handleAddCue}
          onCleanTics={handleCleanTics}
          cleanedNotification={cleanedNotification}
          showTranslateMenu={showTranslateMenu}
          onToggleTranslateMenu={() => setShowTranslateMenu(!showTranslateMenu)}
          targetLang={targetLang}
          onTargetLangChange={setTargetLang}
          isTranslating={isTranslating}
          onTranslate={handleTranslate}
          onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          onSplitLongCues={() => setCues(prev => splitLongCues(prev, maxWordsPerSegment))}
          onLocalTranscribe={handleLocalTranscribe}
        />

        {/* Export Footer */}
        <SubtitlesExportFooter
          isExporting={isExporting}
          exportType={exportType}
          exportProgress={exportProgress}
          exportedBlob={exportedBlob}
          savedSuccess={savedSuccess}
          cuesLength={cues.length}
          onClose={onClose}
          onSaveToLibrary={handleSaveToLibrary}
          onDownloadExported={handleDownloadExported}
          onExportGif={handleExportGif}
          onExportVideo={handleExportVideo}
        />
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
