import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Pause, RotateCcw, Plus, Trash2, Save, 
  FileText, Move, ZoomIn, ZoomOut, FlipHorizontal
} from 'lucide-react';
import { 
  getAllTeleprompterScripts, 
  saveTeleprompterScript, 
  deleteTeleprompterScript, 
  type TeleprompterScript 
} from '../utils/db';

interface TeleprompterModalProps {
  onClose: () => void;
}

export function TeleprompterModal({ onClose }: TeleprompterModalProps) {
  const [scripts, setScripts] = useState<TeleprompterScript[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [title, setTitle] = useState<string>('Mon Script de Présentation');
  const [content, setContent] = useState<string>('Bienvenue dans ce tutoriel !\n\nAujourd\'hui, nous allons découvrir ensemble les fonctionnalités clés de notre application.\n\nPrenez le temps d\'expliquer chaque étape calmement en regardant l\'objectif de votre webcam pour créer une connexion directe avec votre audience.\n\nMerci à tous et bonne présentation !');
  const [wpm, setWpm] = useState<number>(130);
  const [fontSize, setFontSize] = useState<number>(26);
  const [bgOpacity, setBgOpacity] = useState<number>(0.85);
  const [isMirror, setIsMirror] = useState<boolean>(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState<boolean>(false);

  // Mode: 'editor' or 'prompter'
  const [viewMode, setViewMode] = useState<'editor' | 'prompter'>('editor');

  // Prompter player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(0);

  // Position state for draggable floating prompter
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 100, y: 80 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  // Load scripts on mount
  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    const list = await getAllTeleprompterScripts();
    setScripts(list);
    if (list.length > 0 && !selectedScriptId) {
      const first = list[0];
      setSelectedScriptId(first.id);
      setTitle(first.title);
      setContent(first.content);
      if (first.wpm) setWpm(first.wpm);
      if (first.fontSize) setFontSize(first.fontSize);
    }
  };

  const handleSelectScript = (s: TeleprompterScript) => {
    setSelectedScriptId(s.id);
    setTitle(s.title);
    setContent(s.content);
    if (s.wpm) setWpm(s.wpm);
    if (s.fontSize) setFontSize(s.fontSize);
  };

  const handleNewScript = () => {
    const newId = `script_${Date.now()}`;
    setSelectedScriptId(newId);
    setTitle('Nouveau Script');
    setContent('Écrivez votre texte ici...');
    setWpm(130);
    setFontSize(26);
  };

  const handleSaveScript = async () => {
    const idToSave = selectedScriptId || `script_${Date.now()}`;
    const scriptObj: TeleprompterScript = {
      id: idToSave,
      title: title.trim() || 'Script sans titre',
      content,
      date: new Date().toISOString(),
      wpm,
      fontSize
    };
    await saveTeleprompterScript(scriptObj);
    setSelectedScriptId(idToSave);
    setIsSaveSuccess(true);
    setTimeout(() => setIsSaveSuccess(false), 2500);
    await loadScripts();
  };

  const handleDeleteScript = async (id: string) => {
    if (confirm("Supprimer ce script ?")) {
      await deleteTeleprompterScript(id);
      const remaining = scripts.filter(s => s.id !== id);
      setScripts(remaining);
      if (remaining.length > 0) {
        handleSelectScript(remaining[0]);
      } else {
        handleNewScript();
      }
    }
  };

  // Word count & Estimated duration calculation
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((wordCount / (wpm || 130)) * 60);
  const estMins = Math.floor(estimatedSeconds / 60);
  const estSecs = estimatedSeconds % 60;

  // Prompter smooth scroll loop
  useEffect(() => {
    if (viewMode !== 'prompter' || !isPlaying) return;

    lastScrollTimeRef.current = performance.now();

    const scrollLoop = (now: number) => {
      const dt = (now - lastScrollTimeRef.current) / 1000;
      lastScrollTimeRef.current = now;

      if (scrollContainerRef.current) {
        const wordsPerSecond = (wpm || 130) / 60;
        const lineSpacing = fontSize * 1.5;
        const pixelsPerSecond = (wordsPerSecond / 7.5) * lineSpacing;

        scrollContainerRef.current.scrollTop += pixelsPerSecond * dt;

        const maxScroll = scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight;
        if (scrollContainerRef.current.scrollTop >= maxScroll - 2) {
          setIsPlaying(false);
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(scrollLoop);
    };

    animFrameRef.current = requestAnimationFrame(scrollLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [viewMode, isPlaying, wpm, fontSize]);

  // Spacebar toggle Play/Pause
  useEffect(() => {
    if (viewMode !== 'prompter') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  // Mouse Dragging handlers for floating prompter
  const onMouseDownHeader = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: pos.x,
      startY: pos.y
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - dragStartRef.current.mouseX;
      const dy = ev.clientY - dragStartRef.current.mouseY;
      setPos({
        x: Math.max(10, Math.min(window.innerWidth - 300, dragStartRef.current.startX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 200, dragStartRef.current.startY + dy))
      });
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {/* Background Dim for Editor Mode only */}
      {viewMode === 'editor' && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', pointerEvents: 'auto' }}
          onClick={onClose}
        />
      )}

      {/* 1. EDITOR & SCRIPTS MANAGER VIEW */}
      {viewMode === 'editor' && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '850px',
            maxWidth: '94vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '20px',
            pointerEvents: 'auto',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#c084fc" />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Téléprompteur & Gestionnaire de Scripts
              </h2>
            </div>
            <button className="close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {/* Main Content Split: Left Scripts Library & Right Script Editor */}
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px', flexGrow: 1, minHeight: '380px', overflow: 'hidden' }}>
            {/* Left Library */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid var(--border-color)', paddingRight: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mes Scripts ({scripts.length})</span>
                <button
                  className="btn-toolbar"
                  onClick={handleNewScript}
                  style={{ padding: '3px 7px', fontSize: '10px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                  title="Créer un nouveau script"
                >
                  <Plus size={11} /> Nouveau
                </button>
              </div>

              <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {scripts.map((s) => {
                  const isSelected = s.id === selectedScriptId;
                  const wordCountItem = s.content.trim().split(/\s+/).filter(Boolean).length;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectScript(s)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? 'rgba(192, 132, 252, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: isSelected ? '1px solid #c084fc' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#c084fc' : '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.title}
                        </span>
                        <button
                          style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScript(s.id);
                          }}
                          title="Supprimer ce script"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        {wordCountItem} mots • {new Date(s.date).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}

                {scripts.length === 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    Aucun script enregistré.
                  </div>
                )}
              </div>
            </div>

            {/* Right Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Titre du script</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Intro Tutoriel Python, Pitch Produit..."
                  style={{ width: '100%', fontSize: '13px', padding: '5px 8px', fontWeight: 600 }}
                />
              </div>

              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Texte à lire sur le prompteur</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {wordCount} mots • ~{estMins > 0 ? `${estMins}m ` : ''}{estSecs}s de parole
                  </span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tapez ou collez votre script ici..."
                  style={{
                    flexGrow: 1,
                    minHeight: '200px',
                    width: '100%',
                    padding: '10px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    color: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Speech cadence / WPM settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Débit de parole :</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>{wpm} Mots/min</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={220}
                    step={5}
                    value={wpm}
                    onChange={(e) => setWpm(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
                    <span>Posé (100)</span>
                    <span>Standard (130)</span>
                    <span>Rapide (170)</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Taille du texte :</span>
                    <span style={{ color: '#c084fc', fontWeight: 700 }}>{fontSize} px</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={44}
                    step={2}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#c084fc', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
                    <span>Petit</span>
                    <span>Moyen</span>
                    <span>Grand</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <button
                  className="btn-toolbar"
                  onClick={handleSaveScript}
                  style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Save size={13} />
                  <span>{isSaveSuccess ? '✓ Script Enregistré !' : 'Enregistrer le Script'}</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="action-btn" onClick={onClose}>Fermer</button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setViewMode('prompter');
                      setIsPlaying(true);
                    }}
                    style={{
                      padding: '6px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Lancer le Prompteur Flottant</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FLOATING PROMPTER PLAYER VIEW */}
      {viewMode === 'prompter' && (
        <div
          style={{
            position: 'fixed',
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            width: '560px',
            maxWidth: '90vw',
            height: '360px',
            pointerEvents: 'auto',
            backgroundColor: `rgba(10, 15, 29, ${bgOpacity})`,
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            boxShadow: '0 16px 36px rgba(0,0,0,0.75)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 99999
          }}
        >
          {/* Header Bar with Drag handle & controls */}
          <div
            onMouseDown={onMouseDownHeader}
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'move',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Move size={13} color="#94a3b8" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>{title}</span>
            </div>

            {/* Quick Prompter Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onMouseDown={(e) => e.stopPropagation()}>
              {/* Font Size decrease / increase */}
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                <button
                  className="btn-toolbar"
                  onClick={() => setFontSize(prev => Math.max(16, prev - 2))}
                  style={{ padding: '2px 5px', fontSize: '10px' }}
                  title="Réduire le texte"
                >
                  <ZoomOut size={11} />
                </button>
                <button
                  className="btn-toolbar"
                  onClick={() => setFontSize(prev => Math.min(48, prev + 2))}
                  style={{ padding: '2px 5px', fontSize: '10px' }}
                  title="Agrandir le texte"
                >
                  <ZoomIn size={11} />
                </button>
              </div>

              {/* Mirror toggle */}
              <button
                className="btn-toolbar"
                onClick={() => setIsMirror(prev => !prev)}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  backgroundColor: isMirror ? 'rgba(192, 132, 252, 0.25)' : 'transparent',
                  color: isMirror ? '#c084fc' : 'var(--text-secondary)',
                  borderColor: isMirror ? '#c084fc' : 'var(--border-color)'
                }}
                title="Mode miroir (inversion horizontale pour verre de prompteur)"
              >
                <FlipHorizontal size={11} />
              </button>

              {/* Background Opacity Slider */}
              <input
                type="range"
                min={0.2}
                max={0.95}
                step={0.05}
                value={bgOpacity}
                onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                style={{ width: '50px', accentColor: '#38bdf8', cursor: 'pointer' }}
                title={`Transparence du fond : ${Math.round(bgOpacity * 100)}%`}
              />

              {/* Return to Editor */}
              <button
                className="btn-toolbar"
                onClick={() => setViewMode('editor')}
                style={{ padding: '2px 6px', fontSize: '10px' }}
                title="Modifier le texte du script"
              >
                Éditer
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Prompter Scrolling Viewport */}
          <div style={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
            {/* Horizontal Focus Eye-Line Marker */}
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: 0,
                right: 0,
                height: '38px',
                pointerEvents: 'none',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                borderTop: '1px solid rgba(56, 189, 248, 0.25)',
                borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
                zIndex: 2
              }}
            />

            {/* Scroll Content */}
            <div
              ref={scrollContainerRef}
              style={{
                height: '100%',
                overflowY: 'auto',
                padding: '120px 24px 200px 24px',
                fontSize: `${fontSize}px`,
                lineHeight: '1.6',
                color: '#ffffff',
                fontWeight: 600,
                textAlign: 'center',
                transform: isMirror ? 'scaleX(-1)' : 'none',
                scrollBehavior: 'auto'
              }}
            >
              {content.split('\n\n').map((paragraph, pIdx) => (
                <p key={pIdx} style={{ margin: '0 0 1.2em 0' }}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Bottom Floating Controls Bar */}
          <div
            style={{
              padding: '6px 14px',
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            {/* Rewind */}
            <button
              className="btn-toolbar"
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = 0;
                }
              }}
              style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Revenir au tout début du texte"
            >
              <RotateCcw size={11} />
              <span>Début</span>
            </button>

            {/* Play/Pause Main Transport Button */}
            <button
              onClick={() => setIsPlaying(prev => !prev)}
              style={{
                padding: '5px 20px',
                borderRadius: '6px',
                backgroundColor: isPlaying ? '#8b5cf6' : '#10b981',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: isPlaying ? '0 0 14px rgba(139, 92, 246, 0.5)' : '0 0 14px rgba(16, 185, 129, 0.5)'
              }}
              title="Lancer / Mettre en pause le défilement (Touche Espace)"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
              <span>{isPlaying ? 'Pause' : 'Défiler'}</span>
            </button>

            {/* Speed / WPM fine adjuster */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Vitesse :</span>
              <button
                className="btn-toolbar"
                onClick={() => setWpm(prev => Math.max(70, prev - 10))}
                style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700 }}
                title="Ralentir"
              >
                -
              </button>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', minWidth: '45px', textAlign: 'center' }}>
                {wpm} WPM
              </span>
              <button
                className="btn-toolbar"
                onClick={() => setWpm(prev => Math.min(250, prev + 10))}
                style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 700 }}
                title="Accélérer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
