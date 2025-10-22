import { vi } from 'vitest';

// ImageData のモック
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

// グローバルに ImageData を定義
vi.stubGlobal('ImageData', MockImageData);