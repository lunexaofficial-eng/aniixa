/**
 * Cloudflare R2 Storage Upload Service
 * Aniixa Chemical E-Commerce Platform
 * 
 * Provides production-ready multi-part upload streaming to Cloudflare R2
 * with live progress tracking, byte calculations, and speed indicators.
 */

export interface UploadProgressEvent {
  percent: number; // 0 to 100
  loaded: number;
  total: number;
  speedFormatted: string; // e.g. "4.2 MB/s"
  sizeFormatted: string; // e.g. "12.4 MB / 30.0 MB"
  etaSeconds?: number;
}

export type UploadStatus = 'idle' | 'uploading' | 'verifying' | 'completed' | 'error';

export interface R2UploadResult {
  success: boolean;
  url: string; // Primary CDN URL or resilient storage proxy
  proxyUrl: string; // Guaranteed local R2 stream proxy
  cdnUrl: string; // Cloudflare public CDN URL
  key: string; // R2 object key
  bucket: string; // R2 bucket name
  fileName: string;
  size: number;
  mimeType: string;
  storage: string;
}

export interface R2StatusInfo {
  configured: boolean;
  bucket?: string;
  publicUrl?: string;
  message?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatUploadSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 KB/s';
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

/**
 * Check if Cloudflare R2 is configured and active in the backend
 */
export async function checkR2Status(): Promise<R2StatusInfo> {
  try {
    const res = await fetch('/api/r2/status');
    if (res.ok) {
      return await res.json();
    }
    return { configured: false, message: 'Status konnte nicht abgerufen werden.' };
  } catch (err: any) {
    return { configured: false, message: err.message };
  }
}

export interface UploadOptions {
  folder?: 'thumbnails' | 'sds' | 'videos' | 'media';
  token?: string | null;
  onProgress?: (progress: UploadProgressEvent) => void;
  onStatusChange?: (status: UploadStatus, message?: string) => void;
}

export interface ActiveUploadHandle {
  promise: Promise<R2UploadResult>;
  cancel: () => void;
}

/**
 * Uploads a file directly to Cloudflare R2 bucket with live animated progress tracking
 */
export function uploadFileToR2(
  file: File,
  options: UploadOptions = {}
): ActiveUploadHandle {
  const { folder = 'media', token, onProgress, onStatusChange } = options;

  let xhrInstance: XMLHttpRequest | null = null;
  let isCancelled = false;

  const promise = new Promise<R2UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrInstance = xhr;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;
    let currentSpeed = 0;

    onStatusChange?.('uploading', 'Upload zu Cloudflare R2 gestartet...');

    xhr.upload.onprogress = (event) => {
      if (isCancelled) return;

      if (event.lengthComputable && event.total > 0) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;

        if (timeDiff >= 0.25 || event.loaded === event.total) {
          const loadedDiff = event.loaded - lastLoaded;
          currentSpeed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
          lastLoaded = event.loaded;
          lastTime = now;
        }

        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        const remainingBytes = event.total - event.loaded;
        const etaSeconds = currentSpeed > 0 ? Math.round(remainingBytes / currentSpeed) : undefined;

        onProgress?.({
          percent,
          loaded: event.loaded,
          total: event.total,
          speedFormatted: formatUploadSpeed(currentSpeed),
          sizeFormatted: `${formatFileSize(event.loaded)} / ${formatFileSize(event.total)}`,
          etaSeconds,
        });

        if (percent >= 99) {
          onStatusChange?.('verifying', 'R2-Speicherung wird verifiziert...');
        }
      }
    };

    xhr.onload = () => {
      if (isCancelled) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            onProgress?.({
              percent: 100,
              loaded: file.size,
              total: file.size,
              speedFormatted: formatUploadSpeed(currentSpeed),
              sizeFormatted: `${formatFileSize(file.size)} / ${formatFileSize(file.size)}`,
            });
            onStatusChange?.('completed', `Erfolgreich in Cloudflare R2 (${data.bucket}) gespeichert.`);
            resolve(data);
          } else {
            const err = new Error(data.error || 'Upload fehlgeschlagen');
            onStatusChange?.('error', err.message);
            reject(err);
          }
        } catch {
          const err = new Error('Ungültige Serverantwort');
          onStatusChange?.('error', err.message);
          reject(err);
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const err = new Error(errData.error || `HTTP ${xhr.status} Fehler`);
          onStatusChange?.('error', err.message);
          reject(err);
        } catch {
          const err = new Error(`Serverfehler (Status ${xhr.status})`);
          onStatusChange?.('error', err.message);
          reject(err);
        }
      }
    };

    xhr.onerror = () => {
      if (isCancelled) return;
      const err = new Error('Netzwerkfehler während des Uploads zu Cloudflare R2.');
      onStatusChange?.('error', err.message);
      reject(err);
    };

    xhr.onabort = () => {
      onStatusChange?.('idle', 'Upload abgebrochen.');
      reject(new Error('Upload wurde vom Benutzer abgebrochen.'));
    };

    xhr.open('POST', '/api/upload');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });

  return {
    promise,
    cancel: () => {
      isCancelled = true;
      if (xhrInstance) {
        xhrInstance.abort();
      }
    },
  };
}
