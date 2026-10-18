import type { RecorderOptions } from '../../hooks/useRecorder';

export interface AudioPipelineResult {
  audioContext: AudioContext;
  audioDestination: MediaStreamAudioDestinationNode;
  analyser: AnalyserNode;
  audioNodes: AudioNode[];
  micStream: MediaStream | null;
  systemAudioSource: MediaStreamAudioSourceNode | null;
  micSource: MediaStreamAudioSourceNode | null;
}

export async function setupAudioPipeline(
  opts: RecorderOptions,
  sysAudioStream: MediaStream | null,
  onMicLevelChange?: (level: number) => void,
  isRecordingActive?: () => boolean
): Promise<AudioPipelineResult> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass();
  const audioDestination = audioContext.createMediaStreamDestination();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;

  const audioNodes: AudioNode[] = [];
  let systemAudioSource: MediaStreamAudioSourceNode | null = null;
  let micSource: MediaStreamAudioSourceNode | null = null;
  let micStream: MediaStream | null = null;

  // 1. Connect system audio if present
  if (sysAudioStream && sysAudioStream.getAudioTracks().length > 0) {
    const sysSource = audioContext.createMediaStreamSource(sysAudioStream);
    sysSource.connect(audioDestination);
    sysSource.connect(analyser);
    systemAudioSource = sysSource;
    audioNodes.push(sysSource);
  }

  // 2. Connect microphone audio with DSP Filter Chain
  if (opts.recordMic) {
    const micConstraints = {
      audio: opts.selectedMicId 
        ? { 
            deviceId: opts.selectedMicId, 
            echoCancellation: true, 
            noiseSuppression: opts.enableNoiseSuppression !== false, 
            autoGainControl: true 
          }
        : { 
            echoCancellation: true, 
            noiseSuppression: opts.enableNoiseSuppression !== false, 
            autoGainControl: true 
          }
    };

    try {
      micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
    } catch (e) {
      console.warn('Failed to get mic with preferred deviceId, falling back to default:', e);
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          echoCancellation: true, 
          noiseSuppression: opts.enableNoiseSuppression !== false, 
          autoGainControl: true 
        }
      });
    }

    const micTrack = micStream.getAudioTracks()[0];
    if (micTrack) {
      micTrack.onmute = () => console.warn('Microphone audio track was muted by system or USB hardware');
      micTrack.onunmute = () => console.log('Microphone audio track unmuted and active');
    }

    const mSource = audioContext.createMediaStreamSource(micStream);
    micSource = mSource;
    audioNodes.push(mSource);

    let lastNode: AudioNode = mSource;

    // DSP Filter 1: Anti-Rumble High-Pass Filter (Cuts 0-85Hz HVAC/Fan rumble and desk bumps)
    if (opts.enableNoiseSuppression !== false) {
      const highPass = audioContext.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 85;
      highPass.Q.value = 0.7;
      lastNode.connect(highPass);
      lastNode = highPass;
      audioNodes.push(highPass);
    }

    // DSP Filter 2: Studio Vocal Presence & Clarity Boost
    if (opts.enableVocalEnhancer !== false) {
      const vocalPresence = audioContext.createBiquadFilter();
      vocalPresence.type = 'peaking';
      vocalPresence.frequency.value = 3200;
      vocalPresence.Q.value = 1.2;
      vocalPresence.gain.value = 3.5;
      lastNode.connect(vocalPresence);
      lastNode = vocalPresence;
      audioNodes.push(vocalPresence);

      // DSP Filter 3: Studio Dynamics Compressor & Limiter
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 10;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;
      lastNode.connect(compressor);
      lastNode = compressor;
      audioNodes.push(compressor);
    }

    // DSP Filter 4: Output Gain Control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = opts.micGain !== undefined ? opts.micGain : 1.15;
    lastNode.connect(gainNode);
    lastNode = gainNode;
    audioNodes.push(gainNode);

    lastNode.connect(audioDestination);
    lastNode.connect(analyser);

    // Monitor mic audio levels
    if (onMicLevelChange) {
      const micAnalyser = audioContext.createAnalyser();
      micAnalyser.fftSize = 32;
      lastNode.connect(micAnalyser);
      audioNodes.push(micAnalyser);
      const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (isRecordingActive && !isRecordingActive()) return;
        micAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        onMicLevelChange(average / 255);
        requestAnimationFrame(updateLevel);
      };
      setTimeout(updateLevel, 100);
    }
  }

  return {
    audioContext,
    audioDestination,
    analyser,
    audioNodes,
    micStream,
    systemAudioSource,
    micSource
  };
}
