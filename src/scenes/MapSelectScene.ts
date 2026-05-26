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

    // Dark gothic parchment
    g.fillStyle(0x08030a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Subtle red/orange horizon glow
    for (let i = 0; i < 7; i++) {
      g.fillStyle(0xff3300, 0.025 - i * 0.003);
      g.fillRect(0, GAME_HEIGHT - 60 - i * 50, GAME_WIDTH, 60 + i * 50);
    }

    // Upper ambient glow
    g.fillStyle(0xcc1100, 0.05);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.12, 280);
    g.fillStyle(0xff3300, 0.03);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.12, 180);

    // Faint stars
    for (let s = 0; s < 30; s++) {
      g.fillStyle(0xffffee, Math.random() * 0.06 + 0.015);
      g.fillCircle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT / 3),
        0.7,
      );
    }

    // Smoke streaks
    g.lineStyle(1, 0x221100, 0.18);
    for (let s = 0; s < 10; s++) {
      const sy  = Phaser.Math.Between(20, GAME_HEIGHT - 80);
      const sx1 = Phaser.Math.Between(0, GAME_WIDTH / 2);
      const sx2 = sx1 + Phaser.Math.Between(60, 220);
      g.lineBetween(sx1, sy, sx2, sy + Phaser.Math.Between(-5, 5));
    }
  }

  // ─── Title ───────────────────────────────────────────────────────────────────

  private drawTitle(): void {
    const res = Math.min(window.devicePixelRatio || 2, 3);
    const cx  = GAME_WIDTH / 2;

    this.add.text(cx, 18, 'CHOOSE YOUR BATTLEFIELD', {
      fontSize: '26px', fontFamily: 'Georgia, serif', color: '#ddbb66',
      stroke: '#110800', strokeThickness: 5,
      shadow: { blur: 16, color: '#ff4400', fill: true },
    }).setResolution(res).setOrigin(0.5, 0);

    this.add.text(cx, 50, 'Where shall the line be drawn?', {
      fontSize: '14px', fontFamily: 'Georgia, serif', color: '#7a6040',
      fontStyle: 'italic',
    }).setResolution(res).setOrigin(0.5, 0);

    // Decorative divider lines
    const div = this.add.graphics();
    div.lineStyle(1, 0x8b6940, 0.55);
    div.lineBetween(cx - 260, 70, cx + 260, 70);
    div.fillStyle(0xddbb66, 0.4);
    div.fillCircle(cx, 70, 3);
    div.fillCircle(cx - 260, 70, 2);
    div.fillCircle(cx + 260, 70, 2);
  }

  // ─── Back button ─────────────────────────────────────────────────────────────

  private buildBackButton(): void {
    const res = Math.min(window.devicePixelRatio || 2, 3);

    const btnG = this.add.graphics();
    const drawBack = (hover: boolean) => {
      btnG.clear();
      btnG.fillStyle(hover ? 0x2a1c0e : 0x150e06, hover ? 0.9 : 0.8);
      btnG.fillRect(8, 8, 100, 32);
      btnG.lineStyle(1, hover ? 0xddbb66 : 0x8b6940, hover ? 0.9 : 0.6);
      btnG.strokeRect(8, 8, 100, 32);
    };
    drawBack(false);

    const backText = this.add.text(58, 24, '← Back', {
      fontSize: '15px', fontFamily: 'Georgia, serif', color: '#aa8855',
    }).setResolution(res).setOrigin(0.5);

    const zone = this.add.zone(58, 24, 100, 32).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { drawBack(true); backText.setColor('#ddbb66'); });
    zone.on('pointerout',  () => { drawBack(false); backText.setColor('#aa8855'); });
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
    const key = `map_${map.id}`;
    const previewCenterX = cardX + CARD_W / 2;
    const previewCenterY = cardY + 8 + PREVIEW_H / 2;

    const img = this.add.image(previewCenterX, previewCenterY, key);
    img.setOrigin(0.5, 0.5);
    img.setDisplaySize(CARD_W - 16, PREVIEW_H - 8);
    img.setDepth(1);

    // Subtle accent-coloured border around the preview
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(1, map.accentColor, 0.35);
    g.strokeRect(cardX + 8, cardY + 8, CARD_W - 16, PREVIEW_H - 8);
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
