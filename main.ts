import { binarize, detectEdges, composite } from './image';

// DOM要素の取得
const dropzone = document.getElementById('dropzone') as HTMLDivElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
const thresholdSlider = document.getElementById('threshold') as HTMLInputElement;
const thresholdNumber = document.getElementById('thresholdNumber') as HTMLInputElement;
const invertCheckbox = document.getElementById('invert') as HTMLInputElement;
const showEdgesCheckbox = document.getElementById('showEdges') as HTMLInputElement;
const processButton = document.getElementById('processButton') as HTMLButtonElement;
const downloadButton = document.getElementById('downloadButton') as HTMLButtonElement;
const statusElement = document.getElementById('status') as HTMLDivElement;
const progressBarInner = document.getElementById('progressBar') as HTMLDivElement;

// キャンバスのコンテキスト
const ctx = previewCanvas.getContext('2d')!;

// 画像処理の状態
let originalImage: ImageData | null = null;
let processedImage: ImageData | null = null;
let isDragging = false;
let startX = 0;
let startY = 0;
let offsetX = 0;
let offsetY = 0;
let scale = 1;

// プログレスバーの更新
function updateProgress(progress: number) {
  progressBarInner.style.width = `${progress * 100}%`;
}

// ズーム処理
function handleWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = -Math.sign(e.deltaY) * 0.1;
  const newScale = Math.max(0.1, Math.min(5, scale + delta));
  
  // マウス位置を中心にズーム
  const rect = previewCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const oldX = (mouseX - offsetX) / scale;
  const oldY = (mouseY - offsetY) / scale;
  const newX = (mouseX - offsetX) / newScale;
  const newY = (mouseY - offsetY) / newScale;
  
  offsetX += (oldX - newX) * newScale;
  offsetY += (oldY - newY) * newScale;
  scale = newScale;
  
  updateCanvasTransform();
}

// パン処理
function handleMouseDown(e: MouseEvent) {
  if (e.button === 0) { // 左クリックのみ
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    previewCanvas.style.cursor = 'grabbing';
  }
}

function handleMouseMove(e: MouseEvent) {
  if (isDragging) {
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    updateCanvasTransform();
  }
}

function handleMouseUp() {
  isDragging = false;
  previewCanvas.style.cursor = 'grab';
}

// キャンバスの変換行列を更新
function updateCanvasTransform() {
  previewCanvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

// 画像の読み込みと表示
function loadImage(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // キャンバスのサイズを画像に合わせる
      previewCanvas.width = img.width;
      previewCanvas.height = img.height;
      
      // 画像の描画
      ctx.drawImage(img, 0, 0);
      originalImage = ctx.getImageData(0, 0, img.width, img.height);
      
      // UI の有効化
      processButton.disabled = false;
      
      // 初期位置とスケールをリセット
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      updateCanvasTransform();
      
      // ステータス表示
      showStatus('画像を読み込みました', 'success');
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

// ドラッグ&ドロップ処理
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/')) {
    loadImage(file);
  }
});

// ファイル選択処理
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) {
    loadImage(file);
  }
});

// 閾値スライダーの同期
thresholdSlider.addEventListener('input', () => {
  thresholdNumber.value = thresholdSlider.value;
});

thresholdNumber.addEventListener('input', () => {
  thresholdSlider.value = thresholdNumber.value;
});

// 画像処理の実行
processButton.addEventListener('click', async () => {
  if (!originalImage) return;
  
  try {
    processButton.disabled = true;
    updateProgress(0);
    
    // 二値化処理
    const threshold = parseInt(thresholdSlider.value);
    const invert = invertCheckbox.checked;
    const binarized = await binarize(originalImage, threshold, invert);
    updateProgress(0.5);
    
    // エッジ検出と合成
    if (showEdgesCheckbox.checked) {
      const edges = await detectEdges(originalImage);
      processedImage = await composite(binarized, edges);
    } else {
      processedImage = binarized;
    }
    
    // 結果の表示
    if (processedImage) {
      ctx.putImageData(processedImage, 0, 0);
    }
    downloadButton.disabled = false;
    showStatus('処理が完了しました', 'success');
    updateProgress(1);
    
  } catch (error) {
    showStatus('処理中にエラーが発生しました', 'error');
    console.error(error);
  } finally {
    processButton.disabled = false;
    setTimeout(() => updateProgress(0), 1000);
  }
});

// 画像保存処理
downloadButton.addEventListener('click', () => {
  if (!processedImage) return;
  
  const link = document.createElement('a');
  link.download = 'processed-image.png';
  link.href = previewCanvas.toDataURL();
  link.click();
});

// ズーム/パンのイベントリスナー
previewCanvas.addEventListener('wheel', handleWheel);
previewCanvas.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', handleMouseUp);

// ステータス表示
function showStatus(message: string, type: 'success' | 'error') {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
}
