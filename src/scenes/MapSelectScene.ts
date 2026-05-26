import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MapDef, MAPS } from '../GameConfig';

const CARD_W  = 390;
const CARD_H  = 280;
// Image preview area at top of the card (~165px tall)
const PREVIEW_H = 165;

// Card column left-edges and row top-edges
const COL_X = [20, 450, 880];
const ROW_Y = [80, 390];

export class MapSelectScene extends Phaser.Scene {
  constructor() { super('MapSelectScene'); }

  create(): void {
    this.drawBackground();
    this.drawTitle();

    MAPS.forEach((map, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const cx  = COL_X[col];
      const cy  = ROW_Y[row];
      this.buildCard(map, cx, cy);
    });

    // Back button
    this.buildBackButton();

    // Entrance fade
    this.cameras.main.fadeIn(600, 0, 0, 0);

    try {
      this.cameras.main.postFX.addVignette(0.5, 0.5, 0.82, 0.40);
    } catch (_) { /* canvas fallback */ }
  }

  // ─── Scene background ────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics();

    // Dark neon background
    g.fillStyle(0x0a0a1a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Neon cyan glow at top
    g.fillStyle(0x00ffff, 0.06);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.12, 300);
    g.fillStyle(0x00ffff, 0.03);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.12, 180);

    // Neon magenta glow at bottom
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0xff00ff, 0.02 - i * 0.002);
      g.fillRect(0, GAME_HEIGHT - 60 - i * 50, GAME_WIDTH, 60 + i * 50);
    }

    // Bright neon stars
    for (let s = 0; s < 40; s++) {
      g.fillStyle(0x00ffff, Math.random() * 0.15 + 0.05);
      g.fillCircle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT / 3),
        1,
      );
    }
  }

  // ─── Title ───────────────────────────────────────────────────────────────────

  private drawTitle(): void {
    const res = Math.min(window.devicePixelRatio || 2, 3);
    const cx  = GAME_WIDTH / 2;

    this.add.text(cx, 18, 'SELECT YOUR ARENA', {
      fontSize: '32px', fontFamily: 'Courier New, monospace', color: '#00ffff',
      stroke: '#ff00ff', strokeThickness: 3,
    }).setResolution(res).setOrigin(0.5, 0);

    this.add.text(cx, 50, 'Choose a map to defend', {
      fontSize: '14px', fontFamily: 'Courier New, monospace', color: '#ff00ff',
      fontStyle: 'italic',
    }).setResolution(res).setOrigin(0.5, 0);

    // Neon divider lines
    const div = this.add.graphics();
    div.lineStyle(1, 0x00ffff, 0.5);
    div.lineBetween(cx - 260, 70, cx + 260, 70);
    div.fillStyle(0x00ffff, 0.6);
    div.fillCircle(cx, 70, 3);
  }

  // ─── Back button ─────────────────────────────────────────────────────────────

  private buildBackButton(): void {
    const res = Math.min(window.devicePixelRatio || 2, 3);

    const btnG = this.add.graphics();
    const drawBack = (hover: boolean) => {
      btnG.clear();
      btnG.fillStyle(hover ? 0xff00ff : 0x0a0a1a, hover ? 0.3 : 0.2);
      btnG.fillRect(8, 8, 100, 32);
      btnG.lineStyle(1, hover ? 0xff00ff : 0x00ffff, hover ? 0.8 : 0.6);
      btnG.strokeRect(8, 8, 100, 32);
    };
    drawBack(false);

    const backText = this.add.text(58, 24, '← Back', {
      fontSize: '14px', fontFamily: 'Courier New, monospace', color: '#00ffff',
    }).setResolution(res).setOrigin(0.5);

    const zone = this.add.zone(58, 24, 100, 32).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { drawBack(true); backText.setColor('#ff00ff'); });
    zone.on('pointerout',  () => { drawBack(false); backText.setColor('#00ffff'); });
    zone.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });
  }

  // ─── Card building ───────────────────────────────────────────────────────────

  private buildCard(map: MapDef, cardX: number, cardY: number): void {
    const res = Math.min(window.devicePixelRatio || 2, 3);

    // ── Card background ──
    const cardBg = this.add.graphics();
    const drawCardBg = (hover: boolean) => {
      cardBg.clear();
      // Base fill
      const bgBright = hover ? 1.08 : 1;
      cardBg.fillStyle(map.bgColor, hover ? 0.97 : 0.95);
      cardBg.fillRect(cardX, cardY, CARD_W, CARD_H);
      // Darker inner area for preview
      cardBg.fillStyle(0x000000, hover ? 0.22 : 0.30);
      cardBg.fillRect(cardX + 1, cardY + 1, CARD_W - 2, PREVIEW_H - 1);
      // Border
      cardBg.lineStyle(2, map.accentColor, hover ? 0.9 : 0.5);
      cardBg.strokeRect(cardX, cardY, CARD_W, CARD_H);
      // Inner subtle border
      cardBg.lineStyle(1, map.accentColor, hover ? 0.3 : 0.12);
      cardBg.strokeRect(cardX + 3, cardY + 3, CARD_W - 6, CARD_H - 6);
      void bgBright;
    };
    drawCardBg(false);

    // ── Map image preview ──
    this.drawMapPreview(map, cardX, cardY);

    // ── Info area ──
    this.drawCardInfo(map, cardX, cardY, res);

    // ── Interactive zone ──
    const zone = this.add.zone(cardX + CARD_W / 2, cardY + CARD_H / 2, CARD_W, CARD_H)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => drawCardBg(true));
    zone.on('pointerout',  () => drawCardBg(false));
    zone.on('pointerdown', () => this.selectMap(map));
  }

  // ─── Map image preview inside card ───────────────────────────────────────────

  private drawMapPreview(map: MapDef, cardX: number, cardY: number): void {
    const previewX = cardX + 8;
    const previewY = cardY + 8;
    const previewW = CARD_W - 16;
    const previewH = PREVIEW_H - 8;
    const centerX = previewX + previewW / 2;
    const centerY = previewY + previewH / 2;

    // Draw neon arcade-themed preview
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x000000, 0.3);
    g.fillRect(previewX, previewY, previewW, previewH);

    // Neon grid background
    g.lineStyle(1, map.accentColor, 0.15);
    const gridSize = 20;
    for (let x = previewX; x < previewX + previewW; x += gridSize) {
      g.lineBetween(x, previewY, x, previewY + previewH);
    }
    for (let y = previewY; y < previewY + previewH; y += gridSize) {
      g.lineBetween(previewX, y, previewX + previewW, y);
    }

    // Map-specific neon accent
    g.lineStyle(2, map.accentColor, 0.6);
    g.strokeRect(previewX + 2, previewY + 2, previewW - 4, previewH - 4);

    // Centered difficulty indicator
    const diffColor = map.difficulty <= 2 ? 0x00ff00 : map.difficulty <= 4 ? 0xffff00 : 0xff00ff;
    g.fillStyle(diffColor, 0.4);
    g.fillCircle(centerX, centerY, 30);
    g.lineStyle(2, diffColor, 0.8);
    g.strokeCircle(centerX, centerY, 30);

    // Difficulty level text
    const diffText = this.add.text(centerX, centerY, `L${map.difficulty}`, {
      fontSize: '28px', fontFamily: 'Courier New, monospace', color: '#00ffff',
      stroke: map.accentColor, strokeThickness: 2,
    }).setResolution(2).setOrigin(0.5).setDepth(2);
  }

  // ─── Card info area ───────────────────────────────────────────────────────────

  private drawCardInfo(map: MapDef, cardX: number, cardY: number, res: number): void {
    const infoY    = cardY + PREVIEW_H + 8;
    const margin   = 12;
    const textX    = cardX + margin;
    const accentHex = '#' + map.accentColor.toString(16).padStart(6, '0');

    // Map name
    this.add.text(textX, infoY, map.name, {
      fontSize: '18px', fontFamily: 'Georgia, serif', color: accentHex,
      stroke: '#000000', strokeThickness: 3,
    }).setResolution(res).setDepth(3);

    // Subtitle
    this.add.text(textX, infoY + 22, map.subtitle, {
      fontSize: '12px', fontFamily: 'Georgia, serif', color: '#7a6a4a',
      fontStyle: 'italic',
    }).setResolution(res).setDepth(3);

    // Difficulty dots
    const dotStr = '●'.repeat(map.difficulty) + '○'.repeat(6 - map.difficulty);
    const dotColors: string[] = ['#44cc44', '#88cc44', '#cccc44', '#cc8844', '#cc4444', '#aa2222'];
    this.add.text(textX, infoY + 40, dotStr, {
      fontSize: '14px', fontFamily: 'Arial, sans-serif',
      color: dotColors[map.difficulty - 1],
    }).setResolution(res).setDepth(3);

    // Difficulty label
    const diffLabels = ['Easy', 'Easy-Medium', 'Medium', 'Medium-Hard', 'Hard', 'Very Hard'];
    this.add.text(textX + 100, infoY + 41, diffLabels[map.difficulty - 1], {
      fontSize: '11px', fontFamily: 'Courier New', color: '#5a4a30',
    }).setResolution(res).setDepth(3);

    // Description
    this.add.text(textX, infoY + 60, map.description, {
      fontSize: '10px', fontFamily: 'Georgia, serif', color: '#4a3a24',
      wordWrap: { width: CARD_W - margin * 2 - 8 },
    }).setResolution(res).setDepth(3);

    // Divider line between preview and info
    const divG = this.add.graphics().setDepth(3);
    divG.lineStyle(1, map.accentColor, 0.25);
    divG.lineBetween(cardX + margin, cardY + PREVIEW_H, cardX + CARD_W - margin, cardY + PREVIEW_H);
  }

  // ─── Map selection ───────────────────────────────────────────────────────────

  private selectMap(map: MapDef): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { map });
    });
  }
}
