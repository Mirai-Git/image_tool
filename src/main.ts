import { grayscale, binarize, detectEdges, composite } from './image';
import type { ProcessOptions } from './types';

class ImageProcessor {
  private originalImage: ImageData | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dropzone: HTMLElement;
  private fileInput: HTMLInputElement;
  private thresholdSlider: HTMLInputElement;
  private thresholdNumber: HTMLInputElement;
  private invertCheckbox: HTMLInputElement;
  private showEdgesCheckbox: HTMLInputElement;
  private processButton: HTMLButtonElement;
  private downloadButton: HTMLButtonElement;
  private statusElement: HTMLElement;

  constructor() {
    // DOM要素の取得
    this.canvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.dropzone = document.getElementById('dropzone')!;
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    this.thresholdSlider = document.getElementById('threshold') as HTMLInputElement;
    this.thresholdNumber = document.getElementById('thresholdNumber') as HTMLInputElement;
    this.invertCheckbox = document.getElementById('invert') as HTMLInputElement;
    this.showEdgesCheckbox = document.getElementById('showEdges') as HTMLInputElement;
    this.processButton = document.getElementById('processButton') as HTMLButtonElement;
    this.downloadButton = document.getElementById('downloadButton') as HTMLButtonElement;
    this.statusElement = document.getElementById('status')!;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // ズーム＆パン
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;
      
      // 前の状態を保存
      const oldScale = this.scale;
      this.scale *= delta;
      this.scale = Math.min(Math.max(0.1, this.scale), 10);

      // マウス位置を中心にズーム
      const scaleRatio = this.scale / oldScale;
      const rect = this.canvas.getBoundingClientRect();
      const x = mouseX - rect.left;
      const y = mouseY - rect.top;
      
      this.canvas.style.transformOrigin = `${x}px ${y}px`;
      this.canvas.style.transform = `scale(${this.scale})`;
    });

    // パン（ドラッグで移動）
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.lastX;
      const deltaY = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      const rect = this.canvas.getBoundingClientRect();
      this.canvas.style.left = `${rect.left + deltaX}px`;
      this.canvas.style.top = `${rect.top + deltaY}px`;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // ドラッグ＆ドロップ
    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('drag-over');
    });

    this.dropzone.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('drag-over');
    });

    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('drag-over');
      const file = e.dataTransfer?.files[0];
      if (file) this.loadImage(file);
    });

    // ファイル選択
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      if (file) this.loadImage(file);
    });

    // 閾値の同期
    this.thresholdSlider.addEventListener('input', () => {
      this.thresholdNumber.value = this.thresholdSlider.value;
    });

    this.thresholdNumber.addEventListener('input', () => {
      this.thresholdSlider.value = this.thresholdNumber.value;
    });

    // 処理実行
    this.processButton.addEventListener('click', () => this.processImage());

    // ダウンロード
    this.downloadButton.addEventListener('click', () => this.downloadImage());
  }

  private async loadImage(file: File) {
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // キャンバスのサイズを設定
      const maxSize = 800;
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }
      this.canvas.width = width;
      this.canvas.height = height;

      // 画像を描画
      this.ctx.drawImage(img, 0, 0, width, height);
      this.originalImage = this.ctx.getImageData(0, 0, width, height);

      // UI更新
      this.dropzone.style.display = 'none';
      this.canvas.style.display = 'block';
      this.processButton.disabled = false;

      URL.revokeObjectURL(img.src);
    } catch (error) {
      this.showStatus('画像の読み込みに失敗しました', 'error');
    }
  }

  // プレビューのズーム状態
  private scale = 1;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  private async processImage() {
    if (!this.originalImage) return;

    try {
      // プログレス表示
      this.processButton.disabled = true;
      this.showProgress(0);

      // 処理を小さなステップに分割
      await new Promise<void>(resolve => {
        requestAnimationFrame(async () => {
          // グレイスケール変換
          this.showProgress(20);
          const grayImage = grayscale(this.originalImage!);

          // バイナリ化
          this.showProgress(40);
          const options: ProcessOptions = {
            threshold: parseInt(this.thresholdSlider.value),
            invert: this.invertCheckbox.checked
          };
          const { binary, imageData: binaryImage } = binarize(grayImage, options);

          this.showProgress(60);
          
          // 輪郭検出と合成
          if (this.showEdgesCheckbox.checked) {
            this.showProgress(80);
            const edges = detectEdges(grayImage);
            const result = composite(binaryImage, edges, edges);
            this.ctx.putImageData(result, 0, 0);
          } else {
            this.ctx.putImageData(binaryImage, 0, 0);
          }

          this.showProgress(100);
          this.downloadButton.disabled = false;
          this.showStatus('処理完了！', 'success');
          resolve();
        });
      });
    } catch (error) {
      this.showStatus('処理中にエラーが発生しました', 'error');
      console.error('Processing error:', error);
    } finally {
      this.processButton.disabled = false;
      this.hideProgress();
    }
  }

  private downloadImage() {
    try {
      const link = document.createElement('a');
      link.download = 'processed-image.png';
      link.href = this.canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      this.showStatus('画像の保存に失敗しました', 'error');
    }
  }

  private showStatus(message: string, type: 'error' | 'success') {
    this.statusElement.textContent = message;
    this.statusElement.className = `status ${type}`;
  }

  private progressBar: HTMLDivElement | null = null;

  private showProgress(percent: number) {
    if (!this.progressBar) {
      this.progressBar = document.createElement('div');
      this.progressBar.className = 'progress-bar';
      const bar = document.createElement('div');
      bar.className = 'progress-bar-inner';
      this.progressBar.appendChild(bar);
      this.canvas.parentElement?.appendChild(this.progressBar);
    }
    const inner = this.progressBar.querySelector('.progress-bar-inner') as HTMLDivElement;
    inner.style.width = `${percent}%`;
  }

  private hideProgress() {
    if (this.progressBar) {
      this.progressBar.remove();
      this.progressBar = null;
    }
  }

  private resetZoom() {
    this.scale = 1;
    this.canvas.style.transform = '';
    this.canvas.style.transformOrigin = '';
    this.canvas.style.left = '';
    this.canvas.style.top = '';
  }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
  new ImageProcessor();
});