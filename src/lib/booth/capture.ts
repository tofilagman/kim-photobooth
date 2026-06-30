// Swappable capture sources. The booth UI talks only to this interface, so we
// can run on a plain webcam today and drop in a tethered DSLR later without
// touching the flow. WebcamSource captures in-browser; DslrSource delegates to
// server-side gphoto2 endpoints.

export interface CaptureSource {
	readonly kind: 'webcam' | 'dslr';
	/** Acquire the device / verify the camera is reachable. */
	start(): Promise<void>;
	/** Wire up a live preview element. Returns true if preview is available. */
	attach(video: HTMLVideoElement): boolean;
	/** Capture one still; resolves to a data URL (un-mirrored, full frame). */
	capture(): Promise<string>;
	/** Release the device. */
	stop(): void;
}

export class WebcamSource implements CaptureSource {
	readonly kind = 'webcam' as const;
	private stream: MediaStream | null = null;
	private video: HTMLVideoElement | null = null;

	async start(): Promise<void> {
		this.stream = await navigator.mediaDevices.getUserMedia({
			video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
			audio: false
		});
	}

	attach(video: HTMLVideoElement): boolean {
		this.video = video;
		if (this.stream) {
			video.srcObject = this.stream;
			video.play().catch(() => {});
		}
		return true;
	}

	async capture(): Promise<string> {
		const v = this.video;
		if (!v || !v.videoWidth) throw new Error('camera not ready');
		const canvas = document.createElement('canvas');
		canvas.width = v.videoWidth;
		canvas.height = v.videoHeight;
		const ctx = canvas.getContext('2d')!;
		// Draw un-mirrored so text/scenes read naturally in the print.
		ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL('image/jpeg', 0.92);
	}

	stop(): void {
		this.stream?.getTracks().forEach((t) => t.stop());
		this.stream = null;
		if (this.video) this.video.srcObject = null;
	}
}

/**
 * Tethered-DSLR source backed by server-side gphoto2 endpoints.
 * Endpoints are stubbed for now (see /api/camera) — this proves the seam.
 */
export class DslrSource implements CaptureSource {
	readonly kind = 'dslr' as const;

	async start(): Promise<void> {
		const res = await fetch('/api/camera/status');
		if (!res.ok) throw new Error('DSLR not available');
	}

	attach(video: HTMLVideoElement): boolean {
		// gphoto2 live view will be an MJPEG stream; not wired yet.
		void video;
		return false;
	}

	async capture(): Promise<string> {
		const res = await fetch('/api/camera/capture', { method: 'POST' });
		if (!res.ok) throw new Error('capture failed');
		const { dataUrl } = (await res.json()) as { dataUrl: string };
		return dataUrl;
	}

	stop(): void {
		/* nothing to release client-side */
	}
}

export function createCaptureSource(kind: 'webcam' | 'dslr'): CaptureSource {
	return kind === 'dslr' ? new DslrSource() : new WebcamSource();
}
