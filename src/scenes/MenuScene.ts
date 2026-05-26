import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../GameConfig';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create(): void {
    this.drawBackground();
    this.buildUI();

    try {
      this.cameras.main.postFX.addBloom(0x00ffff, 0.8, 0.8, 0.10, 1, 5);
    } catch (_) { /* canvas fallback */ }
  }

  // ─── Background ───────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics();

    // Dark neon background
    g.fillStyle(0x0a0a1a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Neon cyan glow at top
    g.fillStyle(0x00ffff, 0.08);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, 350);
    g.fillStyle(0x00ffff, 0.04);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, 200);

    // Neon magenta glow at bottom
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0xff00ff, 0.02 - i * 0.002);
      g.fillRect(0, GAME_HEIGHT - 60 - i * 50, GAME_WIDTH, 60 + i * 50);
    }

    // Bright neon stars
    for (let st = 0; st < 30; st++) {
      g.fillStyle(0x00ffff, Math.random() * 0.15 + 0.05);
      g.fillCircle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT / 2), 1);
    }
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────

  private buildUI(): void {
    const cx  = GAME_WIDTH / 2;
    const cy  = GAME_HEIGHT / 2;
    const res = Math.min(window.devicePixelRatio || 2, 3);

    // ── Neon frame ──
    const frame = this.add.graphics();
    frame.lineStyle(2, 0x00ffff, 0.6);
    frame.strokeRect(cx - 290, cy - 170, 580, 340);
    frame.lineStyle(1, 0xff00ff, 0.3);
    frame.strokeRect(cx - 284, cy - 164, 568, 328);

    // ── Title ──
    this.add.text(cx, cy - 68, 'DIGITAL DEFENSE', {
      fontSize: '48px', fontFamily: 'Courier New, monospace', color: '#00ffff',
      stroke: '#ff00ff', strokeThickness: 3,
    }).setResolution(res).setOrigin(0.5);

    this.add.text(cx, cy + 8, 'Neon Arcade Tower Defense', {
      fontSize: '18px', fontFamily: 'Courier New, monospace', color: '#ff00ff',
      fontStyle: 'italic',
    }).setResolution(res).setOrigin(0.5);

    // ── Divider ──
    const div = this.add.graphics();
    div.lineStyle(1, 0x00ffff, 0.5);
    div.lineBetween(cx - 200, cy + 42, cx + 200, cy + 42);

    // ── Start button ──
    const btnW = 220;
    const btnH = 52;
    const btnY = cy + 82;

    const btnBg = this.add.graphics();
    this.drawBtn(btnBg, cx, btnY, btnW, btnH, false);

    const btnText = this.add.text(cx, btnY, 'START GAME', {
      fontSize: '20px', fontFamily: 'Courier New, monospace', color: '#00ffff',
      stroke: '#ff00ff', strokeThickness: 2,
    }).setResolution(res).setOrigin(0.5);

    const zone = this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      this.drawBtn(btnBg, cx, btnY, btnW, btnH, true);
      btnText.setColor('#ff00ff');
    });
    zone.on('pointerout', () => {
      this.drawBtn(btnBg, cx, btnY, btnW, btnH, false);
      btnText.setColor('#00ffff');
    });
    zone.on('pointerdown', () => this.startGame());

    // ── Controls hint ──
    this.add.text(cx, cy + 132, 'Keys 1-4 to select tower  •  Left-click to place  •  Right-click to cancel', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#00ffff',
    }).setResolution(res).setOrigin(0.5);

    // ── Tagline ──
    this.add.text(cx, GAME_HEIGHT - 28,
      'NEON RHYTHM. ARCADE GLORY. GEOMETRIC DEFENSE.',
      { fontSize: '12px', fontFamily: 'Courier New, monospace', color: '#ff00ff', fontStyle: 'italic' }
    ).setResolution(res).setOrigin(0.5);

    // Entrance animation — fade in from black
    this.cameras.main.fadeIn(1200, 0, 0, 0);
  }

  private drawBtn(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, hover: boolean): void {
    g.clear();
    g.fillStyle(hover ? 0xff00ff : 0x0a0a1a, hover ? 0.3 : 0.2);
    g.fillRect(cx - w / 2, cy - h / 2, w, h);
    g.lineStyle(hover ? 2 : 1, hover ? 0xff00ff : 0x00ffff, hover ? 0.8 : 0.6);
    g.strokeRect(cx - w / 2, cy - h / 2, w, h);
  }

  private startGame(): void {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MapSelectScene');
    });
  }
}
