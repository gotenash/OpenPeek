import { useState, useEffect } from 'react';
import type { SavedVideo } from '../utils/db';
import { 
  analyzeAudioSilences, 
  type SilenceAnalysisResult, 
  type SpeechSegment 
} from '../utils/audioSilenceDetector';
import { X, Sparkles, Sliders, Check, Clock, Mic, RefreshCw, Scissors } from 'lucide-react';

interface SilenceRemoverModalProps {
  video: SavedVideo;
  onClose: () => void;
  onApplySegments: (segments: SpeechSegment[]) => void;
}

export function SilenceRemoverModal({ video, onClose, onApplySegments }: SilenceRemoverModalProps) {
  const [thresholdDb, setThresholdDb] = useState<number>(-36);
  const [minSilenceDuration, setMinSilenceDuration] = useState<number>(0.6);
  const [padding, setPadding] = useState<number>(0.12);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [analysisResult, setAnalysisResult] = useState<SilenceAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await analyzeAudioSilences(video.blob, {
        thresholdDb,
        minSilenceDuration,
        padding
      });
      setAnalysisResult(res);
    } catch (err: any) {
      console.error('Error analyzing silences:', err);
      setErrorMsg('Impossible d’analyser la piste audio. La vidéo contient-elle du son ?');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}m ${s}.${ms}s`;
  };

  const handleApply = () => {
    if (!analysisResult || analysisResult.speechSegments.length === 0) return;
    onApplySegments(analysisResult.speechSegments);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Scissors size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                Suppresseur Automatique de Silences
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Détection intelligente des blancs pour un tutoriel dynamique et rythmé
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        {isAnalyzing ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 0',
            gap: '14px'
          }}>
            <Sparkles size={32} className="spinning" color="#38bdf8" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              Analyse de l’onde sonore et détection des pauses...
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Décodage audio PCM haute précision
            </span>
          </div>
        ) : errorMsg ? (
          <div style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            {errorMsg}
          </div>
        ) : analysisResult ? (
          <>
            {/* Stat Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={12} /> Durée Initiale
                </span>
                <strong style={{ fontSize: '16px', color: '#f8fafc' }}>
                  {formatSeconds(analysisResult.originalDuration)}
                </strong>
              </div>

              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '11px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Scissors size={12} /> Silences Supprimés
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <strong style={{ fontSize: '16px', color: '#f43f5e' }}>
                    -{formatSeconds(analysisResult.totalSilenceDuration)}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#fda4af', fontWeight: 700 }}>
                    (-{analysisResult.percentSaved}%)
                  </span>
                </div>
              </div>

              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '11px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Mic size={12} /> Nouvelle Durée
                </span>
                <strong style={{ fontSize: '16px', color: '#10b981' }}>
                  {formatSeconds(analysisResult.totalSpeechDuration)}
                </strong>
              </div>
            </div>

            {/* Visual Timeline Waveform Strip */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Aperçu du découpage temporel</span>
                <span>{analysisResult.silences.length} blancs détectés • {analysisResult.speechSegments.length} clips parlés</span>
              </div>
              <div style={{
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.45)', // Red = silence by default
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {/* Overlay speech segments as Cyan blocks */}
                {analysisResult.speechSegments.map((seg, idx) => {
                  const leftPct = (seg.start / analysisResult.originalDuration) * 100;
                  const widthPct = (seg.duration / analysisResult.originalDuration) * 100;
                  return (
                    <div
                      key={idx}
                      title={`Parole: ${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: '#06b6d4',
                        borderRight: '1px solid rgba(255,255,255,0.2)'
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '14px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#06b6d4' }} />
                  Zones Vocales Conservées
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f43f5e' }} />
                  Pauses / Silences Supprimés
                </span>
              </div>
            </div>

            {/* Sliders Accordion */}
            <div style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={13} color="#38bdf8" /> Paramètres d'analyse acoustique
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Seuil de silence :</span>
                    <strong style={{ color: '#f8fafc' }}>{thresholdDb} dB</strong>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={-20}
                    step={1}
                    value={thresholdDb}
                    onChange={(e) => setThresholdDb(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Plus bas = ignore les respirations
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Durée min silence :</span>
                    <strong style={{ color: '#f8fafc' }}>{minSilenceDuration.toFixed(2)}s</strong>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={1.5}
                    step={0.05}
                    value={minSilenceDuration}
                    onChange={(e) => setMinSilenceDuration(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Pauses courtes conservées
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Marge vocale (Padding) :</span>
                    <strong style={{ color: '#f8fafc' }}>{(padding * 1000).toFixed(0)} ms</strong>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.25}
                    step={0.01}
                    value={padding}
                    onChange={(e) => setPadding(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Évite de couper les syllabes
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                <button
                  className="btn-toolbar"
                  onClick={runAnalysis}
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={12} /> Recalculer l'analyse
                </button>
              </div>
            </div>
          </>
        ) : null}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Annuler
          </button>

          <button
            className="btn-primary"
            onClick={handleApply}
            disabled={isAnalyzing || !analysisResult || analysisResult.speechSegments.length === 0}
            style={{
              padding: '6px 18px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7'
            }}
          >
            <Check size={14} />
            <span>Appliquer le Découpage ({analysisResult?.speechSegments.length || 0} clips)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
