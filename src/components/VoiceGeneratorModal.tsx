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
  ELEVENLABS_VOICE_PRESETS,
  getLocalVoices, 
  generateSpeechAudio,
  testElevenLabsApiKey
} from '../utils/ttsEngine';

interface VoiceGeneratorModalProps {
  initialText?: string;
  onClose: () => void;
  onGenerated?: (title: string, blob: Blob) => void;
}

export function VoiceGeneratorModal({ initialText = '', onClose, onGenerated }: VoiceGeneratorModalProps) {
  const [text, setText] = useState<string>(initialText);
  const [voiceProvider, setVoiceProvider] = useState<'elevenlabs' | 'openai' | 'local'>(() => {
    const hasEleven = !!localStorage.getItem('openpeek_elevenlabs_key');
    const hasOpenai = !!localStorage.getItem('openpeek_openai_key');
    if (hasEleven) return 'elevenlabs';
    if (hasOpenai) return 'openai';
    return 'elevenlabs';
  });
  const [elevenVoiceId, setElevenVoiceId] = useState<string>('21m00Tcm4TlvDq8ikWAM');
  const [openaiVoiceId, setOpenaiVoiceId] = useState<string>('nova');
  const [localVoiceName, setLocalVoiceName] = useState<string>('');
  const [localVoices, setLocalVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speed, setSpeed] = useState<number>(1.0);
  
  // API Keys
  const [elevenLabsKey, setElevenLabsKey] = useState<string>(() => localStorage.getItem('openpeek_elevenlabs_key') || '');
  const [openaiKey, setOpenaiKey] = useState<string>(() => localStorage.getItem('openpeek_openai_key') || localStorage.getItem('openpeek_whisper_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [elevenQuota, setElevenQuota] = useState<{ used?: number; limit?: number } | null>(null);

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

  // Fetch ElevenLabs quota if key is present
  useEffect(() => {
    if (elevenLabsKey.trim()) {
      testElevenLabsApiKey(elevenLabsKey.trim()).then((res) => {
        if (res.valid && res.characterLimit !== undefined) {
          setElevenQuota({ used: res.charactersUsed, limit: res.characterLimit });
        }
      });
    }
  }, [elevenLabsKey]);

  const handleSaveElevenKey = (key: string) => {
    setElevenLabsKey(key);
    localStorage.setItem('openpeek_elevenlabs_key', key.trim());
  };

  const handleSaveOpenaiKey = (key: string) => {
    setOpenaiKey(key);
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
      const activeVoiceId = voiceProvider === 'elevenlabs'
        ? elevenVoiceId
        : voiceProvider === 'openai'
        ? openaiVoiceId
        : localVoiceName;

      const activeApiKey = voiceProvider === 'elevenlabs'
        ? elevenLabsKey
        : openaiKey;

      const blob = await generateSpeechAudio(text, {
        voiceId: activeVoiceId,
        speed,
        apiKey: activeApiKey,
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
      if ((voiceProvider === 'elevenlabs' && !elevenLabsKey) || (voiceProvider === 'openai' && !openaiKey)) {
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

        {/* Provider Toggle (ElevenLabs vs OpenAI vs Local Windows) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          <button
            onClick={() => setVoiceProvider('elevenlabs')}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: voiceProvider === 'elevenlabs' ? 'rgba(192, 132, 252, 0.25)' : 'rgba(255,255,255,0.03)',
              border: voiceProvider === 'elevenlabs' ? '1px solid #c084fc' : '1px solid var(--border-color)',
              color: voiceProvider === 'elevenlabs' ? '#c084fc' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <Sparkles size={12} color="#c084fc" />
            <span>✨ ElevenLabs (Gratuit)</span>
          </button>

          <button
            onClick={() => setVoiceProvider('openai')}
            style={{
              padding: '6px 8px',
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
              gap: '5px'
            }}
          >
            <Sparkles size={12} color="#38bdf8" />
            <span>🤖 OpenAI TTS</span>
          </button>

          <button
            onClick={() => setVoiceProvider('local')}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: voiceProvider === 'local' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
              border: voiceProvider === 'local' ? '1px solid #10b981' : '1px solid var(--border-color)',
              color: voiceProvider === 'local' ? '#34d399' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <Zap size={12} color="#10b981" />
            <span>💻 Windows Local</span>
          </button>
        </div>

        {/* ElevenLabs Voices Selector */}
        {voiceProvider === 'elevenlabs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Voix Ultra-Réalistes ElevenLabs (Modèle Multilingue v2) :
              </label>
              {elevenQuota && elevenQuota.limit !== undefined && (
                <span style={{ fontSize: '10px', color: '#c084fc', fontWeight: 600 }}>
                  ✨ {Math.max(0, (elevenQuota.limit || 10000) - (elevenQuota.used || 0)).toLocaleString()} car. restants
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {ELEVENLABS_VOICE_PRESETS.map((v) => {
                const isSel = elevenVoiceId === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setElevenVoiceId(v.id)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      textAlign: 'left',
                      backgroundColor: isSel ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: isSel ? '1px solid #c084fc' : '1px solid var(--border-color)',
                      color: isSel ? '#c084fc' : 'var(--text-secondary)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: isSel ? '#c084fc' : '#ffffff' }}>{v.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{v.description}</div>
                  </button>
                );
              })}
            </div>

            {/* ElevenLabs API Key Drawer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <button
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Key size={11} />
                <span>{elevenLabsKey ? '✓ Clé API ElevenLabs configurée' : '⚠️ Configurer Clé API ElevenLabs (Gratuit 10k car./mois)'}</span>
              </button>
            </div>

            {showApiKeyInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                <input
                  type="password"
                  value={elevenLabsKey}
                  onChange={(e) => handleSaveElevenKey(e.target.value)}
                  placeholder="xi-api-key..."
                  className="form-input"
                  style={{ width: '100%', fontSize: '11px', padding: '3px 6px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>Forfait 10 000 caractères offerts à vie chaque mois.</span>
                  <a href="https://elevenlabs.io" target="_blank" rel="noreferrer" style={{ color: '#c084fc', textDecoration: 'underline' }}>
                    Créer mon compte gratuit sur elevenlabs.io
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OpenAI Voices Selector */}
        {voiceProvider === 'openai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Choix du Timbre de Voix OpenAI (TTS-1) :
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {AI_VOICE_PRESETS.map((v) => {
                const isSel = openaiVoiceId === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setOpenaiVoiceId(v.id)}
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

            {/* OpenAI API Key Drawer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <button
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Key size={11} />
                <span>{openaiKey ? '✓ Clé API OpenAI configurée' : '⚠️ Configurer Clé API OpenAI (pour mode HD)'}</span>
              </button>
            </div>

            {showApiKeyInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => handleSaveOpenaiKey(e.target.value)}
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
        )}

        {/* Windows Local Voices Selector */}
        {voiceProvider === 'local' && (
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
