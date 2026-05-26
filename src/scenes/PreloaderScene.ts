import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../GameConfig';

export class PreloaderScene extends Phaser.Scene {
  constructor() { super('PreloaderScene'); }

  preload(): void {
    this.drawBackground();
    this.drawUI();

    // Map images removed - using minimalist geometric design with solid colors
  }

  create(): void {
    this.scene.start('MenuScene');
  }

  // Removed: Tower sprite background processing (towers now use geometric graphics rendering)
  private removeBackground(key: string, frameW: number, frameH: number): void {
    if (!this.textures.exists(key)) return;
    const tex = this.textures.get(key);
    const src = tex.getSourceImage() as HTMLImageElement;
    const w = src.width;
    const h = src.height;

    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(src, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data    = imgData.data;

    const isBg = (idx: number): boolean => {
      const o = idx * 4;
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const maxC = r > g ? (r > b ? r : b) : (g > b ? g : b);
      const minC = r < g ? (r < b ? r : b) : (g < b ? g : b);
      return (r + g + b) >= 540 && (maxC - minC) <= 30;
    };

    const visited = new Uint8Array(w * h);
    const stack: number[] = [];

    // Seed from all edge pixels that look like background
    for (let x = 0; x < w; x++) {
      if (isBg(x)) stack.push(x);
      const bot = (h - 1) * w + x;
      if (isBg(bot)) stack.push(bot);
    }
    for (let y = 1; y < h - 1; y++) {
      const left  = y * w;
      const right = y * w + w - 1;
      if (isBg(left))  stack.push(left);
      if (isBg(right)) stack.push(right);
    }

    while (stack.length > 0) {
      const idx = stack.pop()!;
      if (visited[idx]) continue;
      visited[idx] = 1;
      data[idx * 4 + 3] = 0;

      const x = idx % w;
      const y = (idx - x) / w;

      if (x > 0)     { const n = idx - 1; if (!visited[n] && isBg(n)) stack.push(n); }
      if (x < w - 1) { const n = idx + 1; if (!visited[n] && isBg(n)) stack.push(n); }
      if (y > 0)     { const n = idx - w; if (!visited[n] && isBg(n)) stack.push(n); }
      if (y < h - 1) { const n = idx + w; if (!visited[n] && isBg(n)) stack.push(n); }
    }

    ctx.putImageData(imgData, 0, 0);

    this.textures.remove(key);
    this.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth:  frameW,
      frameHeight: frameH,
    });
  }

  // ─── Visuals ────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics();

    // Dark neon backdrop
    g.fillStyle(0x0a0a1a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Neon cyan glow at top
    g.fillStyle(0x00ffff, 0.06);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.22, 320);
    g.fillStyle(0x00ffff, 0.03);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.22, 200);

    // Neon magenta glow at bottom
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0xff00ff, 0.02 - i * 0.002);
      g.fillRect(0, GAME_HEIGHT - 60 - i * 50, GAME_WIDTH, 60 + i * 50);
    }

    // Bright neon stars
    for (let s = 0; s < 22; s++) {
      g.fillStyle(0x00ffff, Math.random() * 0.15 + 0.05);
      g.fillCircle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT / 3),
        1,
      );
    }
  }

  private drawUI(): void {
    const res = Math.min(window.devicePixelRatio || 2, 3);
    const cx  = GAME_WIDTH / 2;
    const cy  = GAME_HEIGHT / 2;

    // ── "LOADING..." text ──
    this.add.text(cx, cy - 50, 'LOADING...', {
      fontSize: '36px', fontFamily: 'Georgia, serif', color: '#ddbb66',
      stroke: '#110800', strokeThickness: 6,
      shadow: { blur: 18, color: '#ff4400', fill: true },
    }).setResolution(res).setOrigin(0.5);

    // ── Progress bar geometry ──
    const barW = 400;
    const barH = 20;
    const barX = cx - barW / 2;
    const barY = cy + 10;

    // Frame
    const frameG = this.add.graphics();
    frameG.fillStyle(0x110800, 1);
    frameG.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    frameG.lineStyle(2, 0x8b6940, 0.85);
    frameG.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);
    frameG.lineStyle(1, 0xddbb66, 0.25);
    frameG.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // Fill bar (drawn dynamically)
    const fillG = this.add.graphics();

    // Percent text
    const pctText = this.add.text(cx, barY + barH + 22, '0%', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#aa8855',
    }).setResolution(res).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      fillG.clear();
      fillG.fillStyle(0xddbb66, 0.95);
      fillG.fillRect(barX, barY, barW * value, barH);
      // Inner highlight
      fillG.fillStyle(0xffeecc, 0.30);
      fillG.fillRect(barX, barY, barW * value, Math.max(3, barH * 0.25));
      pctText.setText(`${Math.round(value * 100)}%`);
    });

    // Arcade tagline
    this.add.text(cx, GAME_HEIGHT - 30,
      'DIGITAL DEFENSE. NEON RHYTHM. ARCADE GLORY.',
      { fontSize: '12px', fontFamily: 'Courier New', color: '#00ffff', fontStyle: 'italic' }
    ).setResolution(res).setOrigin(0.5);
  }
}
