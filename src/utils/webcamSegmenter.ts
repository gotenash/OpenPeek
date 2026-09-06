export type WebcamBackgroundEffect = 'none' | 'blur-light' | 'blur-heavy' | 'remove';

type Results = any;

async function ensureMediaPipeLoaded(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).SelfieSegmentation) {
    return (window as any).SelfieSegmentation;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/mediapipe/selfie_segmentation/selfie_segmentation.js';
    script.async = true;
    script.onload = () => {
      resolve((window as any).SelfieSegmentation);
    };
    script.onerror = () => {
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
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
  private hasFirstFrame = false;

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

  public processFrame(videoElement: HTMLVideoElement, effect: WebcamBackgroundEffect): HTMLCanvasElement | null {
    if (effect === 'none') {
      return null;
    }

    this.currentEffect = effect;

    if (!this.isInitialized && !this.isInitializing) {
      this.initialize().catch(() => {});
    }

    if (!this.isInitialized || !this.outputCanvas || !this.tempCanvas || !this.selfieSegmentation) {
      return null;
    }

    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    if (vw === 0 || vh === 0) return null;

    if (this.outputCanvas.width !== vw || this.outputCanvas.height !== vh) {
      this.outputCanvas.width = vw;
      this.outputCanvas.height = vh;
      this.tempCanvas.width = vw;
      this.tempCanvas.height = vh;
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
    if (!this.outputCanvas || !this.tempCanvas) return;
    const outCtx = this.outputCanvas.getContext('2d');
    const tempCtx = this.tempCanvas.getContext('2d');
    if (!outCtx || !tempCtx) return;

    const w = this.outputCanvas.width;
    const h = this.outputCanvas.height;

    outCtx.save();
    outCtx.clearRect(0, 0, w, h);

    if (this.currentEffect === 'remove') {
      // Background transparent, only person visible
      outCtx.drawImage(results.segmentationMask, 0, 0, w, h);
      outCtx.globalCompositeOperation = 'source-in';
      outCtx.drawImage(results.image, 0, 0, w, h);
    } else {
      // 1. Draw blurred background
      outCtx.filter = this.currentEffect === 'blur-heavy' ? 'blur(26px)' : 'blur(12px)';
      outCtx.drawImage(results.image, 0, 0, w, h);
      outCtx.filter = 'none';

      // 2. Cut out sharp person using alpha mask on temp canvas
      tempCtx.clearRect(0, 0, w, h);
      tempCtx.drawImage(results.segmentationMask, 0, 0, w, h);
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.drawImage(results.image, 0, 0, w, h);
      tempCtx.globalCompositeOperation = 'source-over';

      // 3. Composite sharp person on top of blurred background
      outCtx.drawImage(this.tempCanvas, 0, 0, w, h);
    }

    outCtx.restore();
    this.hasFirstFrame = true;
  }

  public destroy() {
    if (this.selfieSegmentation) {
      try {
        this.selfieSegmentation.close();
      } catch (e) {}
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
