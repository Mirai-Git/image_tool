import type { ProcessOptions, BinaryMatrix, ProcessResult, EdgeDetectOptions } from './types.ts';

/**
 * ImageData をグレイスケールに変換
 * 輝度計算: Y = 0.299R + 0.587G + 0.114B
 */
export function grayscale(imageData: ImageData): ImageData {
  if (!imageData || !imageData.data) {
    throw new Error('Invalid ImageData');
  }
  const data = imageData.data;
  const gray = new Uint8ClampedArray(imageData.width * imageData.height * 4);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    gray[i] = y;     // R
    gray[i + 1] = y; // G
    gray[i + 2] = y; // B
    gray[i + 3] = data[i + 3]; // A はそのまま
  }

  return new ImageData(gray, imageData.width, imageData.height);
}

/**
 * グレイスケール ImageData を BinaryMatrix に変換
 * @param imageData グレイスケール画像
 * @param opts オプション（閾値、反転）
 */
export function binarize(
  imageData: ImageData,
  opts: ProcessOptions = {}
): ProcessResult {
  if (!imageData || !imageData.data) {
    throw new Error('Invalid ImageData');
  }
  const { threshold = 128, invert = false } = opts;
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // バイナリデータ（0/255）
  const binary = new Uint8ClampedArray(width * height);
  // 表示用 RGBA データ
  const output = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const p = i * 4;
      
      // グレイスケール値を取得（RGBは同じ値）
      const gray = data[p];
      // 閾値との比較（invert で反転）
      const value = (gray > threshold) !== invert ? 255 : 0;
      
      // バイナリデータを設定
      binary[i] = value;
      
      // 表示用データを設定（RGBすべて同じ値）
      output[p] = value;
      output[p + 1] = value;
      output[p + 2] = value;
      output[p + 3] = 255; // アルファは不透明
    }
  }

  return {
    binary,
    imageData: new ImageData(output, width, height)
  };
}

/**
 * エッジ検出（Sobel フィルタ）
 * Pillow の CONTOUR に近い結果を得るための実装
 */
export function detectEdges(
  imageData: ImageData,
  opts: EdgeDetectOptions = {}
): ImageData {
  const { strength = 1 } = opts;
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new Uint8ClampedArray(width * height * 4);

  // Sobel フィルタのカーネル
  const kernelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  const kernelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let px = 0;
      let py = 0;

      // 3x3 の畳み込み
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4;
          // グレイスケール値を使用（RGBは同じ値）
          const v = data[idx];
          px += v * kernelX[ky][kx];
          py += v * kernelY[ky][kx];
        }
      }

      // 勾配の大きさを計算
      const mag = Math.min(255, Math.round(
        Math.sqrt(px * px + py * py) * strength
      ));

      const idx = (y * width + x) * 4;
      output[idx] = mag;     // R
      output[idx + 1] = mag; // G
      output[idx + 2] = mag; // B
      output[idx + 3] = 255; // A
    }
  }

  return new ImageData(output, width, height);
}

/**
 * 2つの画像を合成（マスクあり）
 */
export function composite(
  baseImage: ImageData,
  overlayImage: ImageData,
  mask: ImageData
): ImageData {
  const width = baseImage.width;
  const height = baseImage.height;
  const output = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < output.length; i += 4) {
    const maskValue = mask.data[i] / 255; // 0-1 の値に正規化
    
    // 各チャンネルをマスク値で線形補間
    for (let c = 0; c < 3; c++) {
      output[i + c] = Math.round(
        baseImage.data[i + c] * (1 - maskValue) +
        overlayImage.data[i + c] * maskValue
      );
    }
    output[i + 3] = 255; // アルファは不透明
  }

  return new ImageData(output, width, height);
}