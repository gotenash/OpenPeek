import { useState } from 'react';
import { Key, Sparkles, Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Trash2, Check, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { testElevenLabsApiKey } from '../../utils/ttsEngine';

export function SettingsApiTab() {
  const { t } = useI18n();

  // Cloud AI & API Keys State
  const [whisperService, setWhisperService] = useState<'groq' | 'openai'>(() => {
    return (localStorage.getItem('openpeek_whisper_service') as 'groq' | 'openai') || 'groq';
  });
  const [groqKey, setGroqKey] = useState<string>(() => {
    return localStorage.getItem('openpeek_groq_key') || 
      (localStorage.getItem('openpeek_whisper_service') !== 'openai' ? localStorage.getItem('openpeek_whisper_key') || '' : '');
  });
  const [openaiKey, setOpenaiKey] = useState<string>(() => {
    return localStorage.getItem('openpeek_openai_key') || 
      (localStorage.getItem('openpeek_whisper_service') === 'openai' ? localStorage.getItem('openpeek_whisper_key') || '' : '');
  });
  const [elevenLabsKey, setElevenLabsKey] = useState<string>(() => {
    return localStorage.getItem('openpeek_elevenlabs_key') || '';
  });
  const [showGroqKey, setShowGroqKey] = useState<boolean>(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState<boolean>(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState<boolean>(false);
  const [testStatusGroq, setTestStatusGroq] = useState<{ state: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ state: 'idle' });
  const [testStatusOpenai, setTestStatusOpenai] = useState<{ state: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ state: 'idle' });
  const [testStatusElevenLabs, setTestStatusElevenLabs] = useState<{
    state: 'idle' | 'testing' | 'success' | 'error';
    message?: string;
    tier?: string;
    used?: number;
    limit?: number;
  }>({ state: 'idle' });
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  const testGroqKey = async () => {
    if (!groqKey.trim()) return;
    setTestStatusGroq({ state: 'testing' });
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${groqKey.trim()}`
        }
      });
      if (res.ok) {
        setTestStatusGroq({ state: 'success', message: t('settings.api.testSuccess') });
      } else {
        const err = await res.json().catch(() => ({}));
        setTestStatusGroq({
          state: 'error',
          message: `${t('settings.api.testError')}${err?.error?.message || `HTTP ${res.status}`}`
        });
      }
    } catch (e: any) {
      setTestStatusGroq({
        state: 'error',
        message: `${t('settings.api.testError')}${e.message || e}`
      });
    }
  };

  const testOpenaiKey = async () => {
    if (!openaiKey.trim()) return;
    setTestStatusOpenai({ state: 'testing' });
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiKey.trim()}`
        }
      });
      if (res.ok) {
        setTestStatusOpenai({ state: 'success', message: t('settings.api.testSuccess') });
      } else {
        const err = await res.json().catch(() => ({}));
        setTestStatusOpenai({
          state: 'error',
          message: `${t('settings.api.testError')}${err?.error?.message || `HTTP ${res.status}`}`
        });
      }
    } catch (e: any) {
      setTestStatusOpenai({
        state: 'error',
        message: `${t('settings.api.testError')}${e.message || e}`
      });
    }
  };

  const testElevenLabsKey = async () => {
    if (!elevenLabsKey.trim()) return;
    setTestStatusElevenLabs({ state: 'testing' });
    try {
      const result = await testElevenLabsApiKey(elevenLabsKey.trim());
      if (result.valid) {
        setTestStatusElevenLabs({
          state: 'success',
          message: `${t('settings.api.testSuccess')} (Plan : ${result.tier || 'Gratuit'})`,
          tier: result.tier,
          used: result.charactersUsed,
          limit: result.characterLimit
        });
      } else {
        setTestStatusElevenLabs({
          state: 'error',
          message: `${t('settings.api.testError')}${result.message || 'Clé invalide'}`
        });
      }
    } catch (e: any) {
      setTestStatusElevenLabs({
        state: 'error',
        message: `${t('settings.api.testError')}${e?.message || e}`
      });
    }
  };

  const handleSaveApiSettings = (
    newService = whisperService,
    newGroq = groqKey,
    newOpenai = openaiKey,
    newEleven = elevenLabsKey
  ) => {
    localStorage.setItem('openpeek_whisper_service', newService);
    localStorage.setItem('openpeek_groq_key', newGroq.trim());
    localStorage.setItem('openpeek_openai_key', newOpenai.trim());
    localStorage.setItem('openpeek_elevenlabs_key', newEleven.trim());

    // Synchronize openpeek_whisper_key for backward compatibility
    const activeKey = newService === 'groq' ? newGroq.trim() : newOpenai.trim();
    localStorage.setItem('openpeek_whisper_key', activeKey);

    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleClearKeys = () => {
    if (window.confirm(t('settings.api.clearConfirm'))) {
      setGroqKey('');
      setOpenaiKey('');
      setElevenLabsKey('');
      localStorage.removeItem('openpeek_groq_key');
      localStorage.removeItem('openpeek_openai_key');
      localStorage.removeItem('openpeek_whisper_key');
      localStorage.removeItem('openpeek_elevenlabs_key');
      setTestStatusGroq({ state: 'idle' });
      setTestStatusOpenai({ state: 'idle' });
      setTestStatusElevenLabs({ state: 'idle' });
      setSaveSuccessNotice(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header Card */}
      <div className="glass-panel settings-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="settings-card-title" style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} color="#a855f7" />
            <span>{t('settings.api.title')}</span>
          </h2>
          {saveSuccessNotice && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80', fontSize: '12px', fontWeight: 600 }}>
              <CheckCircle2 size={14} />
              <span>{t('settings.api.savedNotice')}</span>
            </div>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {t('settings.api.subtitle')}
        </p>
      </div>

      {/* Engine Selector Card */}
      <div className="glass-panel settings-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#38bdf8" />
          <span>{t('settings.api.defaultService')}</span>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Option Groq */}
          <div
            onClick={() => {
              setWhisperService('groq');
              handleSaveApiSettings('groq', groqKey, openaiKey);
            }}
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              border: whisperService === 'groq' ? '2px solid #a855f7' : '1px solid var(--border-color)',
              background: whisperService === 'groq' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: whisperService === 'groq' ? '#d8b4fe' : 'var(--text-primary)' }}>
                ⚡ {t('settings.api.groqTitle')}
              </span>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: '#a855f7', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Recommandé
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {t('settings.api.groqDesc')}
            </p>
          </div>

          {/* Option OpenAI */}
          <div
            onClick={() => {
              setWhisperService('openai');
              handleSaveApiSettings('openai', groqKey, openaiKey);
            }}
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              border: whisperService === 'openai' ? '2px solid #10b981' : '1px solid var(--border-color)',
              background: whisperService === 'openai' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: whisperService === 'openai' ? '#6ee7b7' : 'var(--text-primary)' }}>
                🤖 {t('settings.api.openaiTitle')}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {t('settings.api.openaiDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Groq Key Configuration Card */}
      <div className="glass-panel settings-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{t('settings.api.groqKeyLabel')}</span>
          </div>
          <span style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontWeight: 600,
            background: groqKey.trim() ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: groqKey.trim() ? '#4ade80' : 'var(--text-secondary)',
            border: groqKey.trim() ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-color)'
          }}>
            {groqKey.trim() ? t('settings.api.keyConfigured') : t('settings.api.keyNotConfigured')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={showGroqKey ? 'text' : 'password'}
              className="form-input"
              placeholder={t('settings.api.groqKeyPlaceholder')}
              value={groqKey}
              onChange={(e) => {
                setGroqKey(e.target.value);
                handleSaveApiSettings(whisperService, e.target.value, openaiKey);
              }}
              style={{
                width: '100%',
                padding: '8px 38px 8px 12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowGroqKey(!showGroqKey)}
              title={showGroqKey ? t('settings.api.hideKey') : t('settings.api.showKey')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              {showGroqKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="button"
            className="btn-toolbar"
            onClick={testGroqKey}
            disabled={!groqKey.trim() || testStatusGroq.state === 'testing'}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '110px',
              justifyContent: 'center'
            }}
          >
            {testStatusGroq.state === 'testing' ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>{t('settings.api.testing')}</span>
              </>
            ) : (
              <span>{t('settings.api.testConnection')}</span>
            )}
          </button>
        </div>

        {/* Test Status feedback */}
        {testStatusGroq.state === 'success' && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{testStatusGroq.message}</span>
          </div>
        )}
        {testStatusGroq.state === 'error' && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{testStatusGroq.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span>{t('settings.api.groqKeyHelp')}</span>
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#a855f7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          >
            <span>console.groq.com/keys</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* OpenAI Key Configuration Card */}
      <div className="glass-panel settings-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🤖</span>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{t('settings.api.openaiKeyLabel')}</span>
          </div>
          <span style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontWeight: 600,
            background: openaiKey.trim() ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: openaiKey.trim() ? '#4ade80' : 'var(--text-secondary)',
            border: openaiKey.trim() ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-color)'
          }}>
            {openaiKey.trim() ? t('settings.api.keyConfigured') : t('settings.api.keyNotConfigured')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={showOpenaiKey ? 'text' : 'password'}
              className="form-input"
              placeholder={t('settings.api.openaiKeyPlaceholder')}
              value={openaiKey}
              onChange={(e) => {
                setOpenaiKey(e.target.value);
                handleSaveApiSettings(whisperService, groqKey, e.target.value);
              }}
              style={{
                width: '100%',
                padding: '8px 38px 8px 12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              title={showOpenaiKey ? t('settings.api.hideKey') : t('settings.api.showKey')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              {showOpenaiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="button"
            className="btn-toolbar"
            onClick={testOpenaiKey}
            disabled={!openaiKey.trim() || testStatusOpenai.state === 'testing'}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '110px',
              justifyContent: 'center'
            }}
          >
            {testStatusOpenai.state === 'testing' ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>{t('settings.api.testing')}</span>
              </>
            ) : (
              <span>{t('settings.api.testConnection')}</span>
            )}
          </button>
        </div>

        {/* Test Status feedback */}
        {testStatusOpenai.state === 'success' && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{testStatusOpenai.message}</span>
          </div>
        )}
        {testStatusOpenai.state === 'error' && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{testStatusOpenai.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span>{t('settings.api.openaiKeyHelp')}</span>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          >
            <span>platform.openai.com/api-keys</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* ElevenLabs Key Configuration Card */}
      <div className="glass-panel settings-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>✨</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{t('settings.api.elevenlabsKeyLabel')}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('settings.api.elevenlabsFreeQuota')}</div>
            </div>
          </div>
          <span style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontWeight: 600,
            background: elevenLabsKey.trim() ? 'rgba(192, 132, 252, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: elevenLabsKey.trim() ? '#c084fc' : 'var(--text-secondary)',
            border: elevenLabsKey.trim() ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid var(--border-color)'
          }}>
            {elevenLabsKey.trim() ? t('settings.api.keyConfigured') : t('settings.api.keyNotConfigured')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={showElevenLabsKey ? 'text' : 'password'}
              className="form-input"
              placeholder={t('settings.api.elevenlabsKeyPlaceholder')}
              value={elevenLabsKey}
              onChange={(e) => {
                setElevenLabsKey(e.target.value);
                handleSaveApiSettings(whisperService, groqKey, openaiKey, e.target.value);
              }}
              style={{
                width: '100%',
                padding: '8px 38px 8px 12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
              title={showElevenLabsKey ? t('settings.api.hideKey') : t('settings.api.showKey')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              {showElevenLabsKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="button"
            className="btn-toolbar"
            onClick={testElevenLabsKey}
            disabled={!elevenLabsKey.trim() || testStatusElevenLabs.state === 'testing'}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '110px',
              justifyContent: 'center',
              color: '#c084fc',
              borderColor: 'rgba(192, 132, 252, 0.4)'
            }}
          >
            {testStatusElevenLabs.state === 'testing' ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>{t('settings.api.testing')}</span>
              </>
            ) : (
              <span>{t('settings.api.testConnection')}</span>
            )}
          </button>
        </div>

        {/* Test Status feedback */}
        {testStatusElevenLabs.state === 'success' && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(192, 132, 252, 0.1)', border: '1px solid rgba(192, 132, 252, 0.3)', color: '#c084fc', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              <span>{testStatusElevenLabs.message}</span>
            </div>
            {testStatusElevenLabs.limit !== undefined && (
              <div style={{ fontSize: '11px', color: '#e2e8f0', marginLeft: '24px' }}>
                Quota utilisé ce mois-ci : <strong>{testStatusElevenLabs.used?.toLocaleString() ?? 0} / {testStatusElevenLabs.limit?.toLocaleString()}</strong> caractères ({Math.max(0, (testStatusElevenLabs.limit ?? 10000) - (testStatusElevenLabs.used ?? 0)).toLocaleString()} restants)
              </div>
            )}
          </div>
        )}
        {testStatusElevenLabs.state === 'error' && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{testStatusElevenLabs.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span>{t('settings.api.elevenlabsKeyHelp')}</span>
          <a
            href="https://elevenlabs.io"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#c084fc', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          >
            <span>elevenlabs.io (Plan Gratuit)</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Action Row & Clear */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
        <button
          type="button"
          onClick={handleClearKeys}
          disabled={!groqKey.trim() && !openaiKey.trim() && !elevenLabsKey.trim()}
          className="btn-toolbar"
          style={{
            color: '#f87171',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '12px',
            opacity: (!groqKey.trim() && !openaiKey.trim() && !elevenLabsKey.trim()) ? 0.4 : 1,
            cursor: (!groqKey.trim() && !openaiKey.trim() && !elevenLabsKey.trim()) ? 'not-allowed' : 'pointer'
          }}
        >
          <Trash2 size={14} />
          <span>{t('settings.api.clearKeys')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSaveApiSettings(whisperService, groqKey, openaiKey, elevenLabsKey)}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <Check size={16} />
          <span>{t('settings.api.saveKeys')}</span>
        </button>
      </div>

      {/* Privacy & Security Card */}
      <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(34, 197, 94, 0.04)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
        <ShieldCheck size={22} color="#4ade80" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>
            {t('settings.api.privacyNoticeTitle')}
          </span>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('settings.api.privacyNoticeDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
