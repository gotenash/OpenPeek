import { useState, useRef, useEffect } from 'react';
import type { RecorderOptions } from '../../types/recorder';
import { repairWebmDuration } from '../../utils/webmDurationPatcher';

interface UseRecorderSecondaryCamProps {
  options: RecorderOptions;
  optionsRef: React.MutableRefObject<RecorderOptions>;
  isRecordingRef: React.MutableRefObject<boolean>;
  recordingStartTimeRef: React.MutableRefObject<number>;
  accumulatedTimeRef: React.MutableRefObject<number>;
}

export function useRecorderSecondaryCam({
  options,
  optionsRef,
  isRecordingRef,
  recordingStartTimeRef,
  accumulatedTimeRef
}: UseRecorderSecondaryCamProps) {
  const [isSecondaryCamRecording, setIsSecondaryCamRecording] = useState<boolean>(false);
  const [secondaryCamStream, setSecondaryCamStream] = useState<MediaStream | null>(null);
  const isSecondaryCamRecordingRef = useRef<boolean>(false);
  const secondaryCamStreamRef = useRef<MediaStream | null>(null);
  const secondaryCamRecorderRef = useRef<MediaRecorder | null>(null);
  const secondaryCamChunksRef = useRef<Blob[]>([]);
  const secondaryCamSegmentsRef = useRef<{ blob: Blob; startTime: number; duration: number }[]>([]);
  const secondaryCamStartTimestampRef = useRef<number>(0);

  useEffect(() => {
    isSecondaryCamRecordingRef.current = isSecondaryCamRecording;
  }, [isSecondaryCamRecording]);

  const initSecondaryCamStream = async () => {
    secondaryCamSegmentsRef.current = [];
    const opts = optionsRef.current;
    if (opts.enableSecondaryCam && opts.selectedSecondaryCamId) {
      try {
        const secStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: opts.selectedSecondaryCamId },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: opts.secondaryCamAudio ? true : false
        });
        secondaryCamStreamRef.current = secStream;
        setSecondaryCamStream(secStream);
      } catch (e) {
        console.warn('Secondary camera exact deviceId failed, fallback to ideal:', e);
        try {
          const secStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { ideal: opts.selectedSecondaryCamId }
            },
            audio: opts.secondaryCamAudio ? true : false
          });
          secondaryCamStreamRef.current = secStream;
          setSecondaryCamStream(secStream);
        } catch (err2) {
          console.warn('Secondary camera stream initialization failed:', err2);
        }
      }
    }
  };

  const toggleSecondaryCamRecording = async () => {
    if (!isRecordingRef.current) return;

    // If currently recording B-roll, stop current segment
    if (isSecondaryCamRecordingRef.current) {
      if (secondaryCamRecorderRef.current && secondaryCamRecorderRef.current.state !== 'inactive') {
        try {
          secondaryCamRecorderRef.current.stop();
        } catch (e) {
          console.warn('Error stopping secondary cam recorder:', e);
        }
      }
      setIsSecondaryCamRecording(false);
      isSecondaryCamRecordingRef.current = false;
      return;
    }

    // Start B-roll recording segment
    const stream = secondaryCamStreamRef.current;
    if (!stream) {
      console.warn('Cannot start secondary camera recording: stream is not available');
      return;
    }

    try {
      secondaryCamChunksRef.current = [];
      let totalElapsedMs = accumulatedTimeRef.current;
      if (recordingStartTimeRef.current > 0) {
        totalElapsedMs += (Date.now() - recordingStartTimeRef.current);
      }
      const startSec = Math.max(0, totalElapsedMs / 1000);
      secondaryCamStartTimestampRef.current = startSec;

      let mimeType: string = optionsRef.current.codec;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000
      });
      secondaryCamRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          secondaryCamChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = [...secondaryCamChunksRef.current];
        secondaryCamChunksRef.current = [];
        if (chunks.length > 0) {
          const rawBlob = new Blob(chunks, { type: mimeType });
          let totalEndMs = accumulatedTimeRef.current;
          if (recordingStartTimeRef.current > 0) {
            totalEndMs += (Date.now() - recordingStartTimeRef.current);
          }
          const endSec = Math.max(startSec + 0.5, totalEndMs / 1000);
          const duration = Math.max(0.5, endSec - startSec);
          let finalSecBlob = rawBlob;
          try {
            finalSecBlob = await repairWebmDuration(rawBlob, duration);
          } catch (err) {
            console.warn('[Recorder] Failed to repair secondary camera webm duration:', err);
          }
          secondaryCamSegmentsRef.current.push({
            blob: finalSecBlob,
            startTime: startSec,
            duration
          });
        }
      };

      recorder.start(100);
      setIsSecondaryCamRecording(true);
      isSecondaryCamRecordingRef.current = true;
    } catch (e) {
      console.error('Failed to start secondary camera recording segment:', e);
    }
  };

  const stopSecondaryCam = () => {
    if (secondaryCamRecorderRef.current && secondaryCamRecorderRef.current.state !== 'inactive') {
      try {
        secondaryCamRecorderRef.current.stop();
      } catch (err) {
        console.warn('[Recorder] Error stopping secondaryCamRecorder:', err);
      }
      secondaryCamRecorderRef.current = null;
    }
    if (secondaryCamStreamRef.current) {
      secondaryCamStreamRef.current.getTracks().forEach(t => t.stop());
      secondaryCamStreamRef.current = null;
      setSecondaryCamStream(null);
    }
    setIsSecondaryCamRecording(false);
    isSecondaryCamRecordingRef.current = false;
  };

  return {
    isSecondaryCamRecording,
    setIsSecondaryCamRecording,
    isSecondaryCamRecordingRef,
    secondaryCamStream,
    setSecondaryCamStream,
    secondaryCamStreamRef,
    secondaryCamRecorderRef,
    secondaryCamChunksRef,
    secondaryCamSegmentsRef,
    secondaryCamStartTimestampRef,
    initSecondaryCamStream,
    toggleSecondaryCamRecording,
    stopSecondaryCam,
    hasSecondaryCam: Boolean(options.enableSecondaryCam && options.selectedSecondaryCamId)
  };
}
