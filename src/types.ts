/**
 * 画像処理のオプション
 */
export interface ProcessOptions {
  /** バイナリ化の閾値（0-255） */
  threshold?: number;
  /** 出力を反転するか */
  invert?: boolean;
}

/**
 * バイナリ化された画像データ
 * width * height の長さを持つ Uint8ClampedArray
 * 各要素は 0 または 255
 */
export type BinaryMatrix = Uint8ClampedArray;

/**
 * 処理結果
 */
export interface ProcessResult {
  /** バイナリ化された画像データ */
  binary: BinaryMatrix;
  /** 表示用の ImageData */
  imageData: ImageData;
}

/**
 * エッジ検出のオプション
 */
export interface EdgeDetectOptions {
  /** エッジの強度（1-5） */
  strength?: number;
  /** ぼかしの強度（0-2） */
  blur?: number;
}