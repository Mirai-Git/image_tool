import { describe, it, expect } from 'vitest';
import { grayscale, binarize, detectEdges, composite } from '../image.js';
import type { ProcessOptions } from '../types.js';

/**
 * ImageDataを作成するヘルパー関数
 */
function createImageData(width: number, height: number, data: Uint8ClampedArray): ImageData {
  // NodeJSではImageDataが使えないため、モックオブジェクトを作成
  return {
    width,
    height,
    data,
    colorSpace: 'srgb'
  } as ImageData;
}

describe('image processing core functions', () => {
  describe('grayscale', () => {
    it('converts RGB to grayscale using luma formula', () => {
      // 3x3 のシンプルな画像を作成
      // R=255, G=B=0 の赤ピクセル
      const input = createImageData(3, 3, new Uint8ClampedArray([
        255, 0, 0, 255,    // 赤ピクセル
        0, 255, 0, 255,    // 緑ピクセル
        0, 0, 255, 255,    // 青ピクセル
        128, 128, 128, 255, // グレーピクセル
        255, 255, 255, 255, // 白ピクセル
        0, 0, 0, 255,      // 黒ピクセル
        255, 128, 0, 255,  // オレンジピクセル
        128, 255, 0, 255,  // 黄緑ピクセル
        0, 128, 255, 255   // 水色ピクセル
      ]));

      const result = grayscale(input);

      // 期待値の計算（輝度計算: Y = 0.299R + 0.587G + 0.114B）
      const expectedValues = [
        Math.round(0.299 * 255), // 赤
        Math.round(0.587 * 255), // 緑
        Math.round(0.114 * 255), // 青
        128, // グレー
        255, // 白
        0,   // 黒
        Math.round(0.299 * 255 + 0.587 * 128), // オレンジ
        Math.round(0.587 * 255 + 0.299 * 128), // 黄緑
        Math.round(0.114 * 255 + 0.587 * 128)  // 水色
      ];

      // 各ピクセルをチェック
      for (let i = 0; i < 9; i++) {
        const offset = i * 4;
        // RGB値が同じになっているか
        expect(result.data[offset]).toBe(expectedValues[i]);
        expect(result.data[offset + 1]).toBe(expectedValues[i]);
        expect(result.data[offset + 2]).toBe(expectedValues[i]);
        // アルファ値は保持されているか
        expect(result.data[offset + 3]).toBe(255);
      }
    });
  });

  describe('binarize', () => {
    it('converts grayscale to binary using threshold', () => {
      // 3x3 のグレースケール画像（すべてのRGBが同じ値）
      const input = createImageData(3, 3, new Uint8ClampedArray([
        200, 200, 200, 255, // 明るいグレー
        100, 100, 100, 255, // 暗いグレー
        150, 150, 150, 255, // 中間グレー
        50, 50, 50, 255,    // とても暗いグレー
        250, 250, 250, 255, // ほぼ白
        0, 0, 0, 255,       // 黒
        128, 128, 128, 255, // 中間値
        180, 180, 180, 255, // やや明るいグレー
        75, 75, 75, 255     // やや暗いグレー
      ]));

      const options: ProcessOptions = {
        threshold: 128,
        invert: false
      };

      const result = binarize(input, options);

      // 閾値128での期待値
      const expectedBinary = [
        255, // 200 > 128
        0,   // 100 < 128
        255, // 150 > 128
        0,   // 50 < 128
        255, // 250 > 128
        0,   // 0 < 128
        0,   // 128 = 128 (閾値以下を0とする)
        255, // 180 > 128
        0    // 75 < 128
      ];

      // バイナリデータと表示用ImageDataの両方をチェック
      expectedBinary.forEach((expected, i) => {
        // binary配列のチェック
        expect(result.binary[i]).toBe(expected);

        // imageDataのチェック（RGBすべて同じ値）
        const offset = i * 4;
        expect(result.imageData.data[offset]).toBe(expected);
        expect(result.imageData.data[offset + 1]).toBe(expected);
        expect(result.imageData.data[offset + 2]).toBe(expected);
        expect(result.imageData.data[offset + 3]).toBe(255); // アルファは255
      });
    });

    it('inverts binary output when invert option is true', () => {
      // 2x2 のシンプルなグレースケール画像
      const input = createImageData(2, 2, new Uint8ClampedArray([
        200, 200, 200, 255, // 明るいグレー
        100, 100, 100, 255, // 暗いグレー
        150, 150, 150, 255, // 中間グレー
        50, 50, 50, 255     // とても暗いグレー
      ]));

      const options: ProcessOptions = {
        threshold: 128,
        invert: true
      };

      const result = binarize(input, options);

      // 閾値128で反転した期待値
      const expectedBinary = [
        0,   // 200 > 128 → 255 → 反転で0
        255, // 100 < 128 → 0 → 反転で255
        0,   // 150 > 128 → 255 → 反転で0
        255  // 50 < 128 → 0 → 反転で255
      ];

      expectedBinary.forEach((expected, i) => {
        expect(result.binary[i]).toBe(expected);
        const offset = i * 4;
        expect(result.imageData.data[offset]).toBe(expected);
        expect(result.imageData.data[offset + 1]).toBe(expected);
        expect(result.imageData.data[offset + 2]).toBe(expected);
      });
    });
  });

  describe('detectEdges', () => {
    // 基本的なエッジ検出
    it('detects vertical edges', () => {
      const input = createImageData(4, 4, new Uint8ClampedArray([
        0, 0, 0, 255,   255, 255, 255, 255,   255, 255, 255, 255,   0, 0, 0, 255,
        0, 0, 0, 255,   255, 255, 255, 255,   255, 255, 255, 255,   0, 0, 0, 255,
        0, 0, 0, 255,   255, 255, 255, 255,   255, 255, 255, 255,   0, 0, 0, 255,
        0, 0, 0, 255,   255, 255, 255, 255,   255, 255, 255, 255,   0, 0, 0, 255
      ]));

      const result = detectEdges(input);

      // エッジ部分（白黒の境界）で高い値が検出されることを確認
      for (let y = 1; y < 3; y++) {
        for (let x = 1; x < 3; x++) {
          const idx = (y * 4 + x) * 4;
          if (x === 1 || x === 2) { // エッジ部分
            expect(result.data[idx]).toBeGreaterThan(100);
          } else { // 非エッジ部分
            expect(result.data[idx]).toBeLessThan(50);
          }
        }
      }
    });

    // 均一な画像でのエッジ検出
    it('handles uniform images', () => {
      const input = createImageData(4, 4, new Uint8ClampedArray(4 * 4 * 4).fill(128));
      const result = detectEdges(input);
      
      // 均一な画像ではエッジが検出されないことを確認
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBeLessThan(10);
      }
    });
  });

  describe('composite', () => {
    it('combines binary and edge images correctly', () => {
      // 2x2の画像を作成
      const base = createImageData(2, 2, new Uint8ClampedArray([
        255, 255, 255, 255,  // 白
        255, 255, 255, 255,  // 白
        255, 255, 255, 255,  // 白
        255, 255, 255, 255   // 白
      ]));

      const overlay = createImageData(2, 2, new Uint8ClampedArray([
        0, 0, 0, 255,        // 黒
        0, 0, 0, 255,        // 黒
        0, 0, 0, 255,        // 黒
        0, 0, 0, 255         // 黒
      ]));

      const mask = createImageData(2, 2, new Uint8ClampedArray([
        128, 128, 128, 255,  // 50%マスク
        255, 255, 255, 255,  // 100%マスク
        0, 0, 0, 255,        // 0%マスク
        64, 64, 64, 255      // 25%マスク
      ]));

      const result = composite(base, overlay, mask);

      // マスク値に応じた合成を確認
      expect(result.data[0]).toBe(128);  // 50%マスク（255 * 0.5 + 0 * 0.5）
      expect(result.data[4]).toBe(0);    // 100%マスク（0）
      expect(result.data[8]).toBe(255);  // 0%マスク（255）
      expect(result.data[12]).toBe(192); // 25%マスク（255 * 0.75 + 0 * 0.25）
    });
  });
});