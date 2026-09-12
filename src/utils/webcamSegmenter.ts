export type WebcamBackgroundEffect = 'none' | 'blur-light' | 'blur-heavy' | 'remove';
export type WebcamVirtualBg = 'transparent' | 'greenscreen' | 'studio-dark' | 'neon-purple' | 'slate-clean' | 'warm-sunset' | 'emerald' | 'custom';

type Results = any;

async function ensureMediaPipeLoaded(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).SelfieSegmentation) {
    return (window as any).SelfieSegmentation;
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="selfie_segmentation.js"]');
    if (existing) {
      if ((window as any).SelfieSegmentation) {
        return resolve((window as any).SelfieSegmentation);
      }
      existing.addEventListener('load', () => resolve((window as any).SelfieSegmentation));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = '/mediapipe/selfie_segmentation/selfie_segmentation.js';
    script.async = true;
    script.onload = () => {
      resolve((window as any).SelfieSegmentation);
    };
    script.onerror = () => {
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
      cdnScript.async = true;
      cdnScript.onload = () => resolve((window as any).SelfieSegmentation);
      cdnScript.onerror = reject;
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(script);
  });
}

class WebcamSegmenter {
  private selfieSegmentation: any = null;
  private isInitialized = false;
  private isInitializing = false;
  private isProcessing = false;
  private outputCanvas: HTMLCanvasElement | null = null;
  private tempCanvas: HTMLCanvasElement | null = null;
  private lastProcessedTime = 0;
  private currentEffect: WebcamBackgroundEffect = 'blur-light';
  private currentVirtualBg: WebcamVirtualBg = 'transparent';
  private currentCustomBgImage: string | null = null;
  private customBgImgElement: HTMLImageElement | null = null;
  private hasFirstFrame = false;
  private currentVideoElement: HTMLVideoElement | null = null;

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      const Ctor = await ensureMediaPipeLoaded();
      if (!Ctor) {
        throw new Error('SelfieSegmentation constructor not found');
      }

      this.selfieSegmentation = new Ctor({
        locateFile: (file: string) => {
          return `/mediapipe/selfie_segmentation/${file}`;
        }
      });

      this.selfieSegmentation.setOptions({
        modelSelection: 1, // 1 = landscape (faster & higher accuracy for webcams)
        selfieMode: false
      });

      this.outputCanvas = document.createElement('canvas');
      this.tempCanvas = document.createElement('canvas');

      this.selfieSegmentation.onResults((results: Results) => {
        this.renderResults(results);
        this.isProcessing = false;
      });

      await this.selfieSegmentation.initialize();
      this.isInitialized = true;
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.warn('MediaPipe SelfieSegmentation local init failed, fallback to CDN assets:', err);
      try {
        const Ctor = await ensureMediaPipeLoaded();
        this.selfieSegmentation = new Ctor({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });
        this.selfieSegmentation.setOptions({
          modelSelection: 1,
          selfieMode: false
        });
        this.outputCanvas = document.createElement('canvas');
        this.tempCanvas = document.createElement('canvas');
        this.selfieSegmentation.onResults((results: Results) => {
          this.renderResults(results);
          this.isProcessing = false;
        });
        await this.selfieSegmentation.initialize();
        this.isInitialized = true;
        this.isInitializing = false;
        return true;
      } catch (fallbackErr) {
        console.error('Failed to initialize SelfieSegmentation:', fallbackErr);
        this.isInitializing = false;
        return false;
      }
    }
  }

  public setEffect(effect: WebcamBackgroundEffect) {
    this.currentEffect = effect;
  }

  public getEffect(): WebcamBackgroundEffect {
    return this.currentEffect;
  }

  public setVirtualBackground(virtualBg: WebcamVirtualBg, customBgImage?: string) {
    this.currentVirtualBg = virtualBg;
    if (customBgImage !== undefined && customBgImage !== this.currentCustomBgImage) {
      this.currentCustomBgImage = customBgImage;
      if (customBgImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = customBgImage;
        this.customBgImgElement = img;
      } else {
        this.customBgImgElement = null;
      }
    }
  }

  public processFrame(
    videoElement: HTMLVideoElement, 
    effect: WebcamBackgroundEffect,
    virtualBg: WebcamVirtualBg = 'transparent',
    customBgImage?: string
  ): HTMLCanvasElement | null {
    if (effect === 'none') {
      return null;
    }

    this.currentEffect = effect;
    this.currentVirtualBg = virtualBg;
    this.currentVideoElement = videoElement;

    if (customBgImage !== undefined && customBgImage !== this.currentCustomBgImage) {
      this.currentCustomBgImage = customBgImage;
      if (customBgImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = customBgImage;
        this.customBgImgElement = img;
      } else {
        this.customBgImgElement = null;
      }
    }

    if (!this.isInitialized && !this.isInitializing) {
      this.initialize().catch(() => {});
    }

    if (!this.isInitialized || !this.outputCanvas || !this.selfieSegmentation) {
      return null;
    }

    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    if (vw === 0 || vh === 0) return null;

    if (this.outputCanvas.width !== vw || this.outputCanvas.height !== vh) {
      this.outputCanvas.width = vw;
      this.outputCanvas.height = vh;
      if (this.tempCanvas) {
        this.tempCanvas.width = vw;
        this.tempCanvas.height = vh;
      }
    }

    // Process frame at maximum ~30fps to conserve GPU/CPU
    const now = performance.now();
    if (!this.isProcessing && (now - this.lastProcessedTime >= 30)) {
      this.isProcessing = true;
      this.lastProcessedTime = now;
      this.selfieSegmentation.send({ image: videoElement }).catch(() => {
        this.isProcessing = false;
      });
    }

    return this.hasFirstFrame ? this.outputCanvas : null;
  }

  private renderResults(results: Results) {
    if (!this.outputCanvas) return;
    const outCtx = this.outputCanvas.getContext('2d');
    if (!outCtx) return;

    const w = this.outputCanvas.width;
    const h = this.outputCanvas.height;
    const imgSource = results.image || this.currentVideoElement;
    if (!imgSource) return;

    outCtx.save();
    outCtx.clearRect(0, 0, w, h);

    if (this.currentEffect === 'remove') {
      // 1. Draw sharp person using segmentation mask
      outCtx.drawImage(results.segmentationMask, 0, 0, w, h);
      outCtx.globalCompositeOperation = 'source-in';
      outCtx.drawImage(imgSource, 0, 0, w, h);

      // 2. Draw chosen virtual background behind the person
      if (this.currentVirtualBg && this.currentVirtualBg !== 'transparent') {
        outCtx.globalCompositeOperation = 'destination-over';

        if (this.currentVirtualBg === 'greenscreen') {
          outCtx.fillStyle = '#00ff00';
          outCtx.fillRect(0, 0, w, h);
        } else if (this.currentVirtualBg === 'studio-dark') {
          const grad = outCtx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#1e1b4b');
          grad.addColorStop(1, '#0f172a');
          outCtx.fillStyle = grad;
          outCtx.fillRect(0, 0, w, h);
        } else if (this.currentVirtualBg === 'neon-purple') {
          const grad = outCtx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#3b0764');
          grad.addColorStop(1, '#18052e');
          outCtx.fillStyle = grad;
          outCtx.fillRect(0, 0, w, h);
        } else if (this.currentVirtualBg === 'slate-clean') {
          const grad = outCtx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#1e293b');
          grad.addColorStop(1, '#334155');
          outCtx.fillStyle = grad;
          outCtx.fillRect(0, 0, w, h);
        } else if (this.currentVirtualBg === 'warm-sunset') {
          const grad = outCtx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#451a03');
          grad.addColorStop(1, '#1c1917');
          outCtx.fillStyle = grad;
          outCtx.fillRect(0, 0, w, h);
        } else if (this.currentVirtualBg === 'emerald') {
          const grad = outCtx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#064e3b');
          grad.addColorStop(1, '#022c22');
          outCtx.fillStyle = grad;
          outCtx.fillRect(0, 0, w, h);
        } else if (this.currentVirtualBg === 'custom' && this.customBgImgElement && this.customBgImgElement.complete && this.customBgImgElement.naturalWidth > 0) {
          const iw = this.customBgImgElement.naturalWidth;
          const ih = this.customBgImgElement.naturalHeight;
          const scale = Math.max(w / iw, h / ih);
          const dw = iw * scale;
          const dh = ih * scale;
          const dx = (w - dw) / 2;
          const dy = (h - dh) / 2;
          outCtx.drawImage(this.customBgImgElement, dx, dy, dw, dh);
        }
      }
    } else {
      // 1. Draw sharp person using segmentation mask
      outCtx.drawImage(results.segmentationMask, 0, 0, w, h);
      outCtx.globalCompositeOperation = 'source-in';
      outCtx.drawImage(imgSource, 0, 0, w, h);

      // 2. Draw blurred background behind the person
      outCtx.globalCompositeOperation = 'destination-over';
      outCtx.filter = this.currentEffect === 'blur-heavy' ? 'blur(22px)' : 'blur(10px)';
      outCtx.drawImage(imgSource, 0, 0, w, h);
      outCtx.filter = 'none';
    }

    outCtx.restore();
    this.hasFirstFrame = true;
  }

  public destroy() {
    if (this.selfieSegmentation) {
      try {
        this.selfieSegmentation.close();
      } catch (e) {
        console.warn('[WebcamSegmenter] Failed to cleanly close selfie segmentation instance:', e);
      }
      this.selfieSegmentation = null;
    }
    this.isInitialized = false;
    this.isInitializing = false;
    this.isProcessing = false;
    this.outputCanvas = null;
    this.tempCanvas = null;
  }
}

export const webcamSegmenter = new WebcamSegmenter();
