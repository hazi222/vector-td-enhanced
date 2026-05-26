import { CELL, COLS, ROWS } from '../GameConfig';

export type CellState = 'free' | 'path' | 'tower';

export class GridSystem {
  private grid: CellState[][];
  private pathWaypoints: { x: number; y: number }[];

  constructor(path: { x: number; y: number }[]) {
    this.pathWaypoints = path;
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill('free') as CellState[]);
    this.markPath();
  }

  private markPath(): void {
    // hw must match the hw used in GameScene.drawPath()
    const hw = CELL;
    const wp = this.pathWaypoints;
    for (let s = 0; s < wp.length - 1; s++) {
      const a = wp[s];
      const b = wp[s + 1];
      // Compute the exact rectangle this segment occupies (same as drawPath)
      const minCol = Math.max(0,        Math.floor((Math.min(a.x, b.x) - hw) / CELL));
      const maxCol = Math.min(COLS - 1, Math.floor((Math.max(a.x, b.x) + hw - 1) / CELL));
      const minRow = Math.max(0,        Math.floor((Math.min(a.y, b.y) - hw) / CELL));
      const maxRow = Math.min(ROWS - 1, Math.floor((Math.max(a.y, b.y) + hw - 1) / CELL));
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          this.grid[row][col] = 'path';
        }
      }
    }
  }

  isPlaceable(col: number, row: number): boolean {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return this.grid[row][col] === 'free';
  }

  placeTower(col: number, row: number): void {
    this.grid[row][col] = 'tower';
  }

  removeTower(col: number, row: number): void {
    this.grid[row][col] = 'free';
  }

  getCellState(col: number, row: number): CellState {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return 'path';
    return this.grid[row][col];
  }

  pixelToCell(px: number, py: number): { col: number; row: number } {
    return { col: Math.floor(px / CELL), row: Math.floor(py / CELL) };
  }

  cellToPixel(col: number, row: number): { x: number; y: number } {
    return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
  }
}
