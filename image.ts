// 画像を二値化する
export async function binarize(
  imageData: ImageData,
  threshold: number,
  invert: boolean
): Promise<ImageData> {
  const data = new Uint8ClampedArray(imageData.data);
  
  for (let i = 0; i < data.length; i += 4) {
    // グレースケール値を計算 (RGBの平均)
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    
    // 二値化
    const binary = gray > threshold ? 255 : 0;
    
    // 反転が必要な場合は値を反転
    const value = invert ? 255 - binary : binary;
    
    // RGBすべてに同じ値を設定
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    // アルファ値は変更しない
  }
  
  return new ImageData(data, imageData.width, imageData.height);
}

// エッジを検出する
export async function detectEdges(imageData: ImageData): Promise<ImageData> {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(data.length);
  
  // Sobelフィルタのカーネル
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];
  
  // 各ピクセルに対してSobelフィルタを適用
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      
      // 3x3の領域でフィルタを適用
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }
      
      // エッジの強度を計算
      const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      
      const idx = (y * width + x) * 4;
      output[idx] = magnitude;
      output[idx + 1] = magnitude;
      output[idx + 2] = magnitude;
      output[idx + 3] = 255;
    }
  }
  
  return new ImageData(output, width, height);
}

// 2つの画像を合成する
export async function composite(
  base: ImageData,
  overlay: ImageData
): Promise<ImageData> {
  const data = new Uint8ClampedArray(base.data);
  
  // オーバーレイ画像の各ピクセルを加算
  for (let i = 0; i < data.length; i += 4) {
    const alpha = overlay.data[i + 3] / 255;
    
    // アルファブレンディング
    data[i] = Math.min(255, data[i] + overlay.data[i] * alpha);
    data[i + 1] = Math.min(255, data[i + 1] + overlay.data[i + 1] * alpha);
    data[i + 2] = Math.min(255, data[i + 2] + overlay.data[i + 2] * alpha);
  }
  
  return new ImageData(data, base.width, base.height);
}
