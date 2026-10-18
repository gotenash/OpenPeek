import { Sparkles, Key, Activity, Upload, Languages, FileText, X } from 'lucide-react';
import type { SubtitleCue } from '../../utils/subtitlesEngine';

interface SubtitlesActionBarProps {
  isTranscribing: boolean;
  isExporting: boolean;
  transcribeStatus: string;
  onWhisperTranscribe: () => void;
  showWhisperConfig: boolean;
  onToggleWhisperConfig: () => void;
  whisperService: 'groq' | 'openai';
  onWhisperServiceChange: (service: 'groq' | 'openai') => void;
  whisperApiKey: string;
  onWhisperApiKeyChange: (key: string) => void;
  onVadSegment: () => void;
  onImportClick: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  maxWordsPerSegment: number;
  onMaxWordsPerSegmentChange: (words: number) => void;
  cues: SubtitleCue[];
  onDownloadSrt: () => void;
  onDownloadVtt: () => void;
}

export function SubtitlesActionBar({
  isTranscribing,
  isExporting,
  transcribeStatus,
  onWhisperTranscribe,
  showWhisperConfig,
  onToggleWhisperConfig,
  whisperService,
  onWhisperServiceChange,
  whisperApiKey,
  onWhisperApiKeyChange,
  onVadSegment,
  onImportClick,
  language,
  onLanguageChange,
  maxWordsPerSegment,
  onMaxWordsPerSegmentChange,
  cues,
  onDownloadSrt,
  onDownloadVtt
}: SubtitlesActionBarProps) {
  return (
    <>
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
            onClick={onWhisperTranscribe}
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
            onClick={onToggleWhisperConfig}
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
            onClick={onVadSegment}
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
            onClick={onImportClick}
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
              onChange={(e) => onLanguageChange(e.target.value)}
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
              onChange={(e) => onMaxWordsPerSegmentChange(parseInt(e.target.value))}
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
              onClick={onDownloadSrt}
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Télécharger les sous-titres au format .SRT"
            >
              <FileText size={12} />
              <span>.SRT</span>
            </button>

            <button
              className="btn-secondary"
              onClick={onDownloadVtt}
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
              onClick={onToggleWhisperConfig}
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
                onChange={(e) => onWhisperServiceChange(e.target.value as 'groq' | 'openai')}
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
                onChange={(e) => onWhisperApiKeyChange(e.target.value)}
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
              onClick={onWhisperTranscribe}
              style={{ padding: '4px 12px', fontSize: '11px' }}
            >
              Lancer la transcription
            </button>
          </div>

          <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>
            💡 Astuce : Vous pouvez aussi configurer et tester vos clés globalement dans l'onglet <strong>Paramètres → IA & Clés API</strong>.
          </p>
        </div>
      )}
    </>
  );
}
