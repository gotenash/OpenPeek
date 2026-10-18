import type { SavedMedia } from '../../utils/db';
import { VideoTrimmerModal } from '../VideoTrimmerModal';
import { GifExportModal } from '../GifExportModal';
import { DeviceFrameModal } from '../DeviceFrameModal';
import { AutoRedactModal } from '../AutoRedactModal';
import { SubtitlesStudioModal } from '../SubtitlesStudioModal';
import { TutorialMakerModal } from '../TutorialMakerModal';

interface LibraryActionModalsProps {
  trimmingVideo: SavedMedia | null;
  onCloseTrimmer: () => void;
  gifModalVideo: SavedMedia | null;
  onCloseGif: () => void;
  frameModalVideo: SavedMedia | null;
  onCloseFrame: () => void;
  redactModalVideo: SavedMedia | null;
  onCloseRedact: () => void;
  subtitlesModalVideo: SavedMedia | null;
  onCloseSubtitles: () => void;
  tutorialModalMedia: SavedMedia | null;
  onCloseTutorial: () => void;
  onDataRefresh: () => void;
}

export function LibraryActionModals({
  trimmingVideo,
  onCloseTrimmer,
  gifModalVideo,
  onCloseGif,
  frameModalVideo,
  onCloseFrame,
  redactModalVideo,
  onCloseRedact,
  subtitlesModalVideo,
  onCloseSubtitles,
  tutorialModalMedia,
  onCloseTutorial,
  onDataRefresh
}: LibraryActionModalsProps) {
  return (
    <>
      {trimmingVideo && (
        <VideoTrimmerModal
          video={trimmingVideo}
          onClose={onCloseTrimmer}
          onTrimComplete={onDataRefresh}
        />
      )}

      {gifModalVideo && (
        <GifExportModal
          video={gifModalVideo}
          onClose={onCloseGif}
          onSavedToLibrary={onDataRefresh}
        />
      )}

      {frameModalVideo && (
        <DeviceFrameModal
          video={frameModalVideo}
          onClose={onCloseFrame}
          onSavedToLibrary={onDataRefresh}
        />
      )}

      {redactModalVideo && (
        <AutoRedactModal
          video={redactModalVideo}
          onClose={onCloseRedact}
          onSavedToLibrary={onDataRefresh}
        />
      )}

      {subtitlesModalVideo && (
        <SubtitlesStudioModal
          video={subtitlesModalVideo}
          onClose={onCloseSubtitles}
          onSavedToLibrary={onDataRefresh}
        />
      )}

      {tutorialModalMedia && (
        <TutorialMakerModal
          media={tutorialModalMedia}
          onClose={onCloseTutorial}
        />
      )}
    </>
  );
}
