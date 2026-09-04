import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  Play, 
  Pause, 
  Sparkles, 
  Key, 
  Zap, 
  Check, 
  Download 
} from 'lucide-react';
import { 
  AI_VOICE_PRESETS, 
  getLocalVoices, 
  generateSpeechAudio 
} from '../utils/ttsEngine';

interface VoiceGeneratorModalProps {
  initialText?: string;
  onClose: () => void;
  onGenerated?: (title: string, blob: Blob) => void;
}

export function VoiceGeneratorModal({ initialText = '', onClose, onGenerated }: VoiceGeneratorModalProps) {
  const [text, setText] = useState<string>(initialText);
  const [voiceProvider, setVoiceProvider] = useState<'openai' | 'local'>('openai');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('nova');
  const [localVoiceName, setLocalVoiceName] = useState<string>('');
  const [localVoices, setLocalVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speed, setSpeed] = useState<number>(1.0);
  
  // API Key for OpenAI
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('openpeek_openai_key') || localStorage.getItem('openpeek_whisper_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

  // Status & Audio Preview
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load OS local voices on mount
  useEffect(() => {
    getLocalVoices().then((voices) => {
      setLocalVoices(voices);
      if (voices.length > 0) {
        const fr = voices.find(v => v.lang.startsWith('fr')) || voices[0];
        setLocalVoiceName(fr.name);
      }
    });
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('openpeek_openai_key', key.trim());
    if (localStorage.getItem('openpeek_whisper_service') === 'openai') {
      localStorage.setItem('openpeek_whisper_key', key.trim());
    }
  };

  // Preview directly in browser without downloading
  const handlePreviewLive = () => {
    if (!text.trim()) return;

    if (isPlayingPreview) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (previewAudioRef.current) previewAudioRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    if (generatedUrl) {
      if (!previewAudioRef.current) previewAudioRef.current = new Audio();
      previewAudioRef.current.src = generatedUrl;
      previewAudioRef.current.volume = 1.0;
      previewAudioRef.current.play().catch(() => {});
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
      setIsPlayingPreview(true);
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      const v = localVoices.find(voice => voice.name === localVoiceName);
      if (v) utterance.voice = v;

      utterance.onend = () => setIsPlayingPreview(false);
      utterance.onerror = () => setIsPlayingPreview(false);

      setIsPlayingPreview(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Generate Audio File (WAV/MP3)
  const handleGenerate = async () => {
    if (!text.trim()) {
      setErrorMsg("Veuillez saisir un texte à prononcer.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const blob = await generateSpeechAudio(text, {
        voiceId: voiceProvider === 'openai' ? selectedVoiceId : localVoiceName,
        speed,
        apiKey,
        provider: voiceProvider,
        lang: 'fr-FR'
      });

      setGeneratedBlob(blob);
      const url = URL.createObjectURL(blob);
      setGeneratedUrl(url);

      if (onGenerated) {
        const title = `VoixOff_${text.slice(0, 18).replace(/[^a-z0-9]/gi, '_')}`;
        onGenerated(title, blob);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Erreur lors de la génération audio");
      if (voiceProvider === 'openai' && !apiKey) {
        setShowApiKeyInput(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedBlob) return;
    const url = URL.createObjectURL(generatedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voix_off_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '16px' }}>
      <div 
        className="glass-panel modal-content" 
        style={{ 
          maxWidth: '520px', 
          width: '100%', 
          padding: '18px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.2)' }}>
              <Mic size={18} color="#38bdf8" />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '15px' }}>Générateur de Voix Off IA (TTS)</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                Transformez votre texte en une voix off claire, naturelle et dynamique
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Script Text Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Texte / Script à prononcer :
            </label>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {text.trim().split(/\s+/).filter(Boolean).length} mots • ~{Math.round((text.trim().split(/\s+/).filter(Boolean).length / (3 * speed)))}s
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="form-input"
            rows={4}
            style={{ width: '100%', fontSize: '12px', resize: 'vertical', lineHeight: '1.4' }}
            placeholder="Écrivez ou collez le texte de votre commentaire ici..."
          />
        </div>

        {/* Provider Toggle (OpenAI HD vs Local Gratuit) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            onClick={() => setVoiceProvider('openai')}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: voiceProvider === 'openai' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
              border: voiceProvider === 'openai' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
              color: voiceProvider === 'openai' ? '#38bdf8' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={13} />
            <span>IA HD (OpenAI TTS)</span>
          </button>

          <button
            onClick={() => setVoiceProvider('local')}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: voiceProvider === 'local' ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255,255,255,0.03)',
              border: voiceProvider === 'local' ? '1px solid #c084fc' : '1px solid var(--border-color)',
              color: voiceProvider === 'local' ? '#c084fc' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Zap size={13} />
            <span>Gratuit (Voix Windows)</span>
          </button>
        </div>

        {/* Voice Selector */}
        {voiceProvider === 'openai' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Choix du Timbre de Voix IA :
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {AI_VOICE_PRESETS.map((v) => {
                const isSel = selectedVoiceId === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoiceId(v.id)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      textAlign: 'left',
                      backgroundColor: isSel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: isSel ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                      color: isSel ? '#38bdf8' : 'var(--text-secondary)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: isSel ? '#38bdf8' : '#ffffff' }}>{v.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{v.description}</div>
                  </button>
                );
              })}
            </div>

            {/* API Key Drawer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <button
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Key size={11} />
                <span>{apiKey ? '✓ Clé API OpenAI configurée' : '⚠️ Configurer Clé API OpenAI (pour mode HD)'}</span>
              </button>
            </div>

            {showApiKeyInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="form-input"
                  style={{ width: '100%', fontSize: '11px', padding: '3px 6px', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  💡 Vous pouvez aussi gérer vos clés dans <strong>Paramètres → IA & Clés API</strong>.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Voix Windows Installée :
            </label>
            <select
              value={localVoiceName}
              onChange={(e) => setLocalVoiceName(e.target.value)}
              className="form-input"
              style={{ width: '100%', fontSize: '11px', padding: '5px 8px' }}
            >
              {localVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Speed / Rate Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '85px' }}>
            Vitesse ({speed}x) :
          </span>
          <input
            type="range"
            min={0.7}
            max={1.5}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ flexGrow: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{ fontSize: '11px', color: '#fb7185', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '6px 10px', borderRadius: '4px' }}>
            {errorMsg}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
          <button
            onClick={handlePreviewLive}
            disabled={!text.trim()}
            className="btn-toolbar"
            style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            {isPlayingPreview ? <Pause size={13} color="#fde047" /> : <Play size={13} color="#38bdf8" />}
            <span>{isPlayingPreview ? 'Arrêter' : 'Écouter l’extrait'}</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {generatedBlob && (
              <button
                onClick={handleDownload}
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Download size={13} />
                <span>Télécharger MP3</span>
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim()}
              className="btn-primary"
              style={{ fontSize: '11px', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}
            >
              {isGenerating ? <Sparkles size={13} className="spinning" /> : <Check size={13} />}
              <span>{isGenerating ? 'Génération...' : (generatedBlob ? '✓ Voix Générée !' : 'Générer la Voix Off')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
