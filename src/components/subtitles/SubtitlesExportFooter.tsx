import { Check, Layers, Download, Film, Sparkles } from 'lucide-react';

interface SubtitlesExportFooterProps {
  isExporting: boolean;
  exportType: 'video' | 'gif';
  exportProgress: number;
  exportedBlob: Blob | null;
  savedSuccess: boolean;
  cuesLength: number;
  onClose: () => void;
  onSaveToLibrary: () => void;
  onDownloadExported: () => void;
  onExportGif: () => void;
  onExportVideo: () => void;
}

export function SubtitlesExportFooter({
  isExporting,
  exportType,
  exportProgress,
  exportedBlob,
  savedSuccess,
  cuesLength,
  onClose,
  onSaveToLibrary,
  onDownloadExported,
  onExportGif,
  onExportVideo
}: SubtitlesExportFooterProps) {
  return (
    <>
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
                onClick={onSaveToLibrary}
                disabled={savedSuccess}
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {savedSuccess ? <Check size={14} color="#4ade80" /> : <Layers size={14} />}
                <span>{savedSuccess ? 'Enregistré' : 'Sauvegarder'}</span>
              </button>

              <button
                className="btn-primary"
                onClick={onDownloadExported}
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
                onClick={onExportGif}
                disabled={isExporting || cuesLength === 0}
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fde047' }}
              >
                <Film size={14} />
                <span>Exporter en GIF</span>
              </button>

              <button
                className="btn-primary"
                onClick={onExportVideo}
                disabled={isExporting || cuesLength === 0}
                style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
              >
                {isExporting ? <Sparkles size={14} className="spinning" /> : <Sparkles size={14} />}
                <span>Exporter Vidéo Sous-titrée</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
