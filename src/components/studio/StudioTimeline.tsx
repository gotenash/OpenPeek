import React, { useRef, useState, useMemo, useEffect } from 'react';
import type {
  TimelineClip,
  TimelineProject,
  TimelineTitle,
  TimelineImageOverlay,
  TimelineZoomEffect,
  TimelineVoiceover
} from '../../utils/videoCompositor';
import { StudioVideoTrack } from './StudioVideoTrack';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTransitionsOverlay } from './TimelineTransitionsOverlay';
import { TimelineAuxTracks } from './TimelineAuxTracks';

function formatTime(secs: number): string {
  const safe = typeof secs === 'number' && !isNaN(secs) && secs >= 0 ? secs : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface StudioTimelineProps {
  project: TimelineProject;
  setProject: React.Dispatch<React.SetStateAction<TimelineProject>>;
  currentTime: number;
  totalDuration: number;
  safeDur: number;
  timelineScale: number;
  setTimelineScale: React.Dispatch<React.SetStateAction<number>>;
  timelineViewMode: 'spatial' | 'filmstrip' | 'compact';
  setTimelineViewMode: (mode: 'spatial' | 'filmstrip' | 'compact') => void;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  selectedElement: { type: string; id: string } | null;
  setSelectedElement: (el: any) => void;
  clipTimelineOffsets: Map<string, { start: number; end: number; duration: number }>;
  clipFilmstrips?: any;
  onSeek: (time: number) => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onSplitAtPlayhead: () => void;
  canSplitAtPlayhead: boolean;
  onDeleteSelected: () => void;
  onUpdateClipTiming: (clipId: string, newStart: number, newDur: number) => void;
  onUpdateClipTrim: (clipId: string, start: number, end: number) => void;
  onUpdateClipSpeed: (clipId: string, speed: number) => void;
  onUpdateClipVolume: (clipId: string, vol: number) => void;
  onUpdateClipTransition: (clipId: string, transition: any, duration: number) => void;
  onToggleClipTrack: (clipId: string, targetTrack: 1 | 2) => void;
  onRemoveClip: (clipId: string) => void;
  onOpenEditSlide: (clip: TimelineClip) => void;
  onOpenAddSlide: (track: 1 | 2) => void;
  onOpenVideoPicker: (track: 1 | 2) => void;
  onOpenAddImage: (track: 1 | 2) => void;
  onOpenSilenceRemover?: (clip: TimelineClip) => void;
  // Spatial lanes callbacks
  isRecordingVoiceover: boolean;
  onToggleRecordVoiceover: () => void;
  onUpdateVoiceoverTiming: (id: string, startTime: number, duration: number) => void;
  onOpenEditVoiceover: (vo: TimelineVoiceover) => void;
  onRemoveVoiceover: (id: string) => void;
  onUpdateTitleTiming: (id: string, startTime: number, duration: number) => void;
  onOpenEditTitle: (title: TimelineTitle) => void;
  onRemoveTitle: (id: string) => void;
  onOpenAddTitleAtTime: (time: number) => void;
  onUpdateImageTiming: (id: string, startTime: number, duration: number) => void;
  onOpenEditImage: (image: TimelineImageOverlay) => void;
  onRemoveImage: (id: string) => void;
  onOpenAddImageAtTime: (time: number) => void;
  onUpdateZoomTiming: (id: string, startTime: number, duration: number) => void;
  onOpenEditZoom: (zoom: TimelineZoomEffect) => void;
  onRemoveZoom: (id: string) => void;
  onOpenAddZoomAtTime: (time: number) => void;
  onRemoveBackgroundMusic: () => void;
  onUpdateMusicVolume: (volume: number) => void;
  onOpenChutierAudio: () => void;
  onRemoveChapter: (id: string) => void;
}

export function StudioTimeline({
  project,
  setProject,
  currentTime,
  totalDuration,
  safeDur,
  timelineScale,
  setTimelineScale,
  timelineViewMode,
  setTimelineViewMode,
  selectedClipId,
  setSelectedClipId,
  selectedElement,
  setSelectedElement,
  clipTimelineOffsets,
  clipFilmstrips,
  onSeek,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onSplitAtPlayhead,
  canSplitAtPlayhead,
  onDeleteSelected,
  onUpdateClipTiming,
  onUpdateClipTrim,
  onUpdateClipSpeed,
  onUpdateClipVolume,
  onUpdateClipTransition,
  onToggleClipTrack,
  onRemoveClip,
  onOpenEditSlide,
  onOpenAddSlide,
  onOpenVideoPicker,
  onOpenAddImage,
  onOpenSilenceRemover,
  isRecordingVoiceover,
  onToggleRecordVoiceover,
  onUpdateVoiceoverTiming,
  onOpenEditVoiceover,
  onRemoveVoiceover,
  onUpdateTitleTiming,
  onOpenEditTitle,
  onRemoveTitle,
  onOpenAddTitleAtTime,
  onUpdateImageTiming,
  onOpenEditImage,
  onRemoveImage,
  onOpenAddImageAtTime,
  onUpdateZoomTiming,
  onOpenEditZoom,
  onRemoveZoom,
  onOpenAddZoomAtTime,
  onRemoveBackgroundMusic,
  onUpdateMusicVolume,
  onOpenChutierAudio,
  onRemoveChapter
}: StudioTimelineProps) {
  const timelineRulerRef = useRef<HTMLDivElement>(null);
  const timelineScrollContainerRef = useRef<HTMLDivElement>(null);
  const videoLaneRef = useRef<HTMLDivElement>(null);
  const videoLane2Ref = useRef<HTMLDivElement>(null);
  const isScrubbingRulerRef = useRef(false);

  const [activeClipDragId, setActiveClipDragId] = useState<string | null>(null);
  const [clipDragFeedback, setClipDragFeedback] = useState<string | null>(null);
  const clipDragInfoRef = useRef<{
    clipId: string;
    action: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    initialStart: number;
    initialDuration: number;
    laneWidth: number;
    speed: number;
  } | null>(null);

  const rulerTicks = useMemo(() => {
    if (totalDuration <= 0) return [];
    const ticks: { pct: number; label: string }[] = [];
    const baseInterval = totalDuration > 120 ? 30 : totalDuration > 60 ? 15 : totalDuration > 30 ? 10 : totalDuration > 10 ? 5 : 2;
    const interval = Math.max(1, Math.round(baseInterval / Math.max(1, timelineScale * 0.75)));
    for (let t = 0; t <= totalDuration; t += interval) {
      ticks.push({
        pct: (t / safeDur) * 100,
        label: formatTime(t)
      });
    }
    return ticks;
  }, [totalDuration, timelineScale, safeDur]);

  const detectedOverlaps = useMemo(() => {
    const overlaps: {
      id: string;
      clip1: TimelineClip;
      clip2: TimelineClip;
      start: number;
      end: number;
      duration: number;
    }[] = [];

    const v1Clips = (project.clips || []).filter(c => c.track !== 2);
    const v2Clips = (project.clips || []).filter(c => c.track === 2);

    for (const c1 of v1Clips) {
      const off1 = clipTimelineOffsets.get(c1.id);
      if (!off1) continue;
      for (const c2 of v2Clips) {
        const off2 = clipTimelineOffsets.get(c2.id);
        if (!off2) continue;
        const oStart = Math.max(off1.start, off2.start);
        const oEnd = Math.min(off1.end, off2.end);
        const oDur = oEnd - oStart;
        if (oDur > 0.05) {
          overlaps.push({
            id: `ovl_${c1.id}_${c2.id}`,
            clip1: c1,
            clip2: c2,
            start: oStart,
            end: oEnd,
            duration: oDur
          });
        }
      }
    }
    return overlaps;
  }, [project.clips, clipTimelineOffsets]);

  // Support Ctrl + MouseWheel to adjust timelineScale smoothly
  useEffect(() => {
    const el = timelineScrollContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        setTimelineScale(prev => Math.max(1, Math.min(8, Math.round(prev * factor * 10) / 10)));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setTimelineScale]);

  // Auto-scroll timeline to keep playhead in view during playback or seeking when zoomed
  useEffect(() => {
    if (timelineScale <= 1 || totalDuration <= 0 || !timelineScrollContainerRef.current) return;
    const container = timelineScrollContainerRef.current;
    const playheadPct = currentTime / totalDuration;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const playheadX = 160 + playheadPct * Math.max(0, scrollWidth - 160);
    const visibleLeft = container.scrollLeft;
    const visibleRight = container.scrollLeft + clientWidth;

    if (playheadX > visibleRight - 40) {
      container.scrollLeft = playheadX - clientWidth / 2;
    } else if (playheadX < visibleLeft + 170 && container.scrollLeft > 0) {
      container.scrollLeft = Math.max(0, playheadX - 170);
    }
  }, [currentTime, timelineScale, totalDuration]);

  const handleRulerSeek = (clientX: number) => {
    if (!timelineRulerRef.current || totalDuration <= 0) return;
    const rect = timelineRulerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekTime = (clickX / rect.width) * totalDuration;
    onSeek(seekTime);
    const clipAtPos = (project.clips || []).find((c) => {
      const off = clipTimelineOffsets.get(c.id);
      return off && seekTime >= off.start && seekTime <= off.end;
    });
    if (clipAtPos) {
      setSelectedClipId(clipAtPos.id);
    }
  };

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (totalDuration <= 0) return;
    isScrubbingRulerRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    handleRulerSeek(e.clientX);
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRulerRef.current) return;
    handleRulerSeek(e.clientX);
  };

  const handleRulerPointerUp = () => {
    isScrubbingRulerRef.current = false;
  };

  const handleVideoLaneSeek = (clientX: number, targetLane?: HTMLElement | null) => {
    const lane = targetLane || videoLaneRef.current || videoLane2Ref.current;
    if (!lane || totalDuration <= 0) return;
    const rect = lane.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekTime = (clickX / rect.width) * totalDuration;
    onSeek(seekTime);
    const clipAtPos = (project.clips || []).find((c) => {
      const off = clipTimelineOffsets.get(c.id);
      return off && seekTime >= off.start && seekTime <= off.end;
    });
    if (clipAtPos) {
      setSelectedClipId(clipAtPos.id);
      setSelectedElement({ type: 'clip', id: clipAtPos.id });
    }
  };

  const handleVideoLanePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (totalDuration <= 0) return;
    isScrubbingRulerRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    handleVideoLaneSeek(e.clientX, e.currentTarget);
  };

  const handleVideoLanePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRulerRef.current) return;
    handleVideoLaneSeek(e.clientX, e.currentTarget);
  };

  const handleVideoLanePointerUp = () => {
    isScrubbingRulerRef.current = false;
  };

  const handleStartClipDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    clipId: string,
    action: 'move' | 'resize-left' | 'resize-right',
    laneEl: HTMLDivElement | null
  ) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button')) {
      return;
    }
    e.stopPropagation();
    if (!laneEl || totalDuration <= 0) return;
    const laneRect = laneEl.getBoundingClientRect();
    const clip = (project.clips || []).find(c => c.id === clipId);
    if (!clip) return;
    const off = clipTimelineOffsets.get(clipId) || { start: 0, end: 10, duration: 10 };
    const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;

    clipDragInfoRef.current = {
      clipId,
      action,
      startX: e.clientX,
      initialStart: off.start,
      initialDuration: off.duration,
      laneWidth: Math.max(10, laneRect.width),
      speed
    };

    setSelectedClipId(clipId);
    setSelectedElement({ type: 'clip', id: clipId });
    setActiveClipDragId(clipId);
    setClipDragFeedback(`${off.start.toFixed(1)}s → ${off.end.toFixed(1)}s (${off.duration.toFixed(1)}s)`);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      console.debug('[Timeline] setPointerCapture ignored on clip:', err);
    }
  };

  const handleClipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = clipDragInfoRef.current;
    if (!drag || totalDuration <= 0) return;

    const dx = e.clientX - drag.startX;
    const dt = (dx / drag.laneWidth) * totalDuration;

    if (drag.action === 'move') {
      const newStart = Math.max(0, Math.round((drag.initialStart + dt) * 10) / 10);
      onUpdateClipTiming(drag.clipId, newStart, drag.initialDuration);
      onSeek(newStart);
      setClipDragFeedback(`Position: ${newStart.toFixed(1)}s (Fin: ${(newStart + drag.initialDuration).toFixed(1)}s)`);
    } else if (drag.action === 'resize-right') {
      const newDur = Math.max(0.5, Math.round((drag.initialDuration + dt) * 10) / 10);
      onUpdateClipTiming(drag.clipId, drag.initialStart, newDur);
      onSeek(drag.initialStart + newDur);
      setClipDragFeedback(`Durée: ${newDur.toFixed(1)}s (Fin: ${(drag.initialStart + newDur).toFixed(1)}s)`);
    } else if (drag.action === 'resize-left') {
      const maxStart = drag.initialStart + drag.initialDuration - 0.5;
      const newStart = Math.max(0, Math.min(maxStart, Math.round((drag.initialStart + dt) * 10) / 10));
      const newDur = Math.max(0.5, Math.round((drag.initialDuration - (newStart - drag.initialStart)) * 10) / 10);
      onUpdateClipTiming(drag.clipId, newStart, newDur);
      onSeek(newStart);
      setClipDragFeedback(`Position: ${newStart.toFixed(1)}s | Durée: ${newDur.toFixed(1)}s`);
    }
  };

  const handleClipPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (clipDragInfoRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        console.debug('[Timeline] releasePointerCapture ignored on clip:', err);
      }
      clipDragInfoRef.current = null;
      setActiveClipDragId(null);
      setClipDragFeedback(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <TimelineToolbar
        timelineViewMode={timelineViewMode}
        setTimelineViewMode={setTimelineViewMode}
        timelineScale={timelineScale}
        setTimelineScale={setTimelineScale}
        canUndo={canUndo}
        onUndo={onUndo}
        canRedo={canRedo}
        onRedo={onRedo}
        canSplitAtPlayhead={canSplitAtPlayhead}
        onSplitAtPlayhead={onSplitAtPlayhead}
        selectedElement={selectedElement}
        selectedClipId={selectedClipId}
        onDeleteSelected={onDeleteSelected}
        detectedOverlaps={detectedOverlaps}
        onSeek={onSeek}
        setSelectedClipId={setSelectedClipId}
        setSelectedElement={setSelectedElement}
      />

      {/* Synchronized Horizontally Scrollable Timeline Body */}
      <div
        ref={timelineScrollContainerRef}
        className="timeline-scroll-viewport"
      >
        <div style={{
          minWidth: `${Math.round(timelineScale * 100)}%`,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingBottom: '4px'
        }}>
          {/* Master Timeline Ruler with Time Markers & Unified Playhead Header */}
          <TimelineRuler
            currentTime={currentTime}
            totalDuration={totalDuration}
            safeDur={safeDur}
            rulerTicks={rulerTicks}
            timelineRulerRef={timelineRulerRef}
            onRulerSeek={handleRulerSeek}
            onRulerPointerDown={handleRulerPointerDown}
            onRulerPointerMove={handleRulerPointerMove}
            onRulerPointerUp={handleRulerPointerUp}
          />

          {/* Track V2: Piste Vidéo 2 (Incrustation / PiP) */}
          <StudioVideoTrack
            trackNumber={2}
            clips={project.clips}
            totalDuration={totalDuration}
            currentTime={currentTime}
            safeDur={safeDur}
            timelineViewMode={timelineViewMode}
            selectedClipId={selectedClipId}
            clipTimelineOffsets={clipTimelineOffsets}
            clipFilmstrips={clipFilmstrips}
            activeClipDragId={activeClipDragId}
            clipDragFeedback={clipDragFeedback}
            videoLaneRef={videoLane2Ref}
            onVideoLaneSeek={handleVideoLaneSeek}
            onVideoLanePointerDown={handleVideoLanePointerDown}
            onVideoLanePointerMove={handleVideoLanePointerMove}
            onVideoLanePointerUp={handleVideoLanePointerUp}
            onStartClipDrag={handleStartClipDrag}
            onClipPointerMove={handleClipPointerMove}
            onClipPointerUp={handleClipPointerUp}
            onSelectClip={(id) => {
              setSelectedClipId(id);
              setSelectedElement({ type: 'clip', id });
            }}
            onSeek={onSeek}
            onOpenEditSlide={onOpenEditSlide}
            onToggleClipTrack={onToggleClipTrack}
            onUpdateClipTrim={onUpdateClipTrim}
            onUpdateClipSpeed={onUpdateClipSpeed}
            onUpdateClipVolume={onUpdateClipVolume}
            onUpdateClipTransition={onUpdateClipTransition}
            onRemoveClip={onRemoveClip}
            onOpenVideoPicker={() => onOpenVideoPicker(2)}
            onOpenAddSlide={() => onOpenAddSlide(2)}
            onOpenAddImage={() => onOpenAddImage(2)}
            onOpenSilenceRemover={onOpenSilenceRemover}
          />

          {/* Visual Overlap Indicator / Transition Connector between Track 2 & Track 1 */}
          <TimelineTransitionsOverlay
            detectedOverlaps={detectedOverlaps}
            safeDur={safeDur}
            onSeek={onSeek}
            onUpdateClipTransition={onUpdateClipTransition}
          />

          {/* Track V1: Piste Vidéo Principale */}
          <StudioVideoTrack
            trackNumber={1}
            clips={project.clips}
            totalDuration={totalDuration}
            currentTime={currentTime}
            safeDur={safeDur}
            timelineViewMode={timelineViewMode}
            selectedClipId={selectedClipId}
            clipTimelineOffsets={clipTimelineOffsets}
            clipFilmstrips={clipFilmstrips}
            activeClipDragId={activeClipDragId}
            clipDragFeedback={clipDragFeedback}
            videoLaneRef={videoLaneRef}
            onVideoLaneSeek={handleVideoLaneSeek}
            onVideoLanePointerDown={handleVideoLanePointerDown}
            onVideoLanePointerMove={handleVideoLanePointerMove}
            onVideoLanePointerUp={handleVideoLanePointerUp}
            onStartClipDrag={handleStartClipDrag}
            onClipPointerMove={handleClipPointerMove}
            onClipPointerUp={handleClipPointerUp}
            onSelectClip={(id) => {
              setSelectedClipId(id);
              setSelectedElement({ type: 'clip', id });
            }}
            onSeek={onSeek}
            onOpenEditSlide={onOpenEditSlide}
            onToggleClipTrack={onToggleClipTrack}
            onUpdateClipTrim={onUpdateClipTrim}
            onUpdateClipSpeed={onUpdateClipSpeed}
            onUpdateClipVolume={onUpdateClipVolume}
            onUpdateClipTransition={onUpdateClipTransition}
            onRemoveClip={onRemoveClip}
            onOpenVideoPicker={() => onOpenVideoPicker(1)}
            onOpenAddSlide={() => onOpenAddSlide(1)}
            onOpenAddImage={() => onOpenAddImage(1)}
            onOpenSilenceRemover={onOpenSilenceRemover}
          />

          {/* Secondary & Aux Tracks: Voiceovers, Titles, Overlays, Zooms, Music, Chapters */}
          <TimelineAuxTracks
            project={project}
            setProject={setProject}
            currentTime={currentTime}
            totalDuration={totalDuration}
            selectedElement={selectedElement}
            setSelectedElement={setSelectedElement}
            setSelectedClipId={setSelectedClipId}
            onSeek={onSeek}
            isRecordingVoiceover={isRecordingVoiceover}
            onToggleRecordVoiceover={onToggleRecordVoiceover}
            onUpdateVoiceoverTiming={onUpdateVoiceoverTiming}
            onOpenEditVoiceover={onOpenEditVoiceover}
            onRemoveVoiceover={onRemoveVoiceover}
            onUpdateTitleTiming={onUpdateTitleTiming}
            onOpenEditTitle={onOpenEditTitle}
            onRemoveTitle={onRemoveTitle}
            onOpenAddTitleAtTime={onOpenAddTitleAtTime}
            onUpdateImageTiming={onUpdateImageTiming}
            onOpenEditImage={onOpenEditImage}
            onRemoveImage={onRemoveImage}
            onOpenAddImageAtTime={onOpenAddImageAtTime}
            onUpdateZoomTiming={onUpdateZoomTiming}
            onOpenEditZoom={onOpenEditZoom}
            onRemoveZoom={onRemoveZoom}
            onOpenAddZoomAtTime={onOpenAddZoomAtTime}
            onRemoveBackgroundMusic={onRemoveBackgroundMusic}
            onUpdateMusicVolume={onUpdateMusicVolume}
            onOpenChutierAudio={onOpenChutierAudio}
            onRemoveChapter={onRemoveChapter}
          />
        </div>
      </div>
    </div>
  );
}
