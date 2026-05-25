import { CELL, COLS, PATH_PX, ROWS } from '../GameConfig';

export type CellState = 'free' | 'path' | 'tower';

export class GridSystem {
  private grid: CellState[][];

  constructor() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill('free') as CellState[]);
    this.markPath();
  }

  private markPath(): void {
    const waypoints = PATH_PX;
    for (let s = 0; s < waypoints.length - 1; s++) {
      const a = waypoints[s];
      const b = waypoints[s + 1];
      // Walk along segment and mark cells within 1 cell width of centre
      const steps = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / (CELL * 0.25));
      for (let t = 0; t <= steps; t++) {
        const px = a.x + (b.x - a.x) * (t / steps);
        const py = a.y + (b.y - a.y) * (t / steps);
        // Mark this cell and its neighbours (path is 1-cell wide corridor)
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const col = Math.floor(px / CELL) + dc;
            const row = Math.floor(py / CELL) + dr;
            if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
              this.grid[row][col] = 'path';
            }
          }
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
