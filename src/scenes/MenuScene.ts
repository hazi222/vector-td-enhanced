import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../GameConfig';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create(): void {
    this.drawBackground();
    this.drawMountains();
    this.buildUI();

    try {
      this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 0.14, 1, 8);
      this.cameras.main.postFX.addVignette(0.5, 0.5, 0.78, 0.55);
    } catch (_) { /* canvas fallback */ }
  }

  // ─── Background ───────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics();

    g.fillStyle(0x08030a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Horizon glow
    for (let i = 0; i < 7; i++) {
      g.fillStyle(0xff3300, 0.035 - i * 0.004);
      g.fillRect(0, GAME_HEIGHT - 60 - i * 50, GAME_WIDTH, 60 + i * 50);
    }

    // Eye of Sauron ambient glow — centred upper area
    g.fillStyle(0xcc1100, 0.07);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, 320);
    g.fillStyle(0xff3300, 0.05);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, 200);
    g.fillStyle(0xff6600, 0.04);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, 100);

    // Smoke streaks
    g.lineStyle(1, 0x221100, 0.25);
    for (let s = 0; s < 14; s++) {
      const sy  = Phaser.Math.Between(20, GAME_HEIGHT - 80);
      const sx1 = Phaser.Math.Between(0, GAME_WIDTH / 2);
      const sx2 = sx1 + Phaser.Math.Between(60, 240);
      g.lineBetween(sx1, sy, sx2, sy + Phaser.Math.Between(-6, 6));
    }

    // Embers
    for (let e = 0; e < 55; e++) {
      const ex = Phaser.Math.Between(0, GAME_WIDTH);
      const ey = Phaser.Math.Between(GAME_HEIGHT * 0.4, GAME_HEIGHT);
      g.fillStyle(0xff6600, Math.random() * 0.45 + 0.05);
      g.fillCircle(ex, ey, Math.random() < 0.3 ? 1.5 : 0.7);
    }

    // Faint stars
    for (let st = 0; st < 18; st++) {
      g.fillStyle(0xffffee, Math.random() * 0.07 + 0.02);
      g.fillCircle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT / 3), 0.8);
    }
  }

  private drawMountains(): void {
    const g = this.add.graphics();

    // Far ridge
    const far = [
      [0, 500], [100, 390], [210, 440], [340, 340], [480, 410],
      [600, 350], [720, 420], [860, 360], [980, 410], [1120, 330], [1280, 420], [1280, 520],
    ];
    g.fillStyle(0x120608, 1);
    g.fillPoints(far.map(([x, y]) => ({ x, y })), true);

    // Near ridge
    const near = [
      [0, 560], [90, 510], [200, 535], [310, 490], [430, 520],
      [550, 475], [670, 510], [800, 465], [920, 505], [1060, 470],
      [1180, 500], [1280, 475], [1280, 560],
    ];
    g.fillStyle(0x1a0a08, 1);
    g.fillPoints(near.map(([x, y]) => ({ x, y })), true);

    // Lava cracks
    g.lineStyle(1, 0xff3300, 0.2);
    [[340, 340, 360, 380], [600, 350, 615, 385], [1120, 330, 1108, 365]].forEach(([x1, y1, x2, y2]) => {
      g.lineBetween(x1, y1, x2, y2);
    });

    // Path/road hint at bottom leading off into the distance (perspective taper)
    g.fillStyle(0x1e1208, 0.7);
    g.fillPoints([
      { x: GAME_WIDTH / 2 - 18, y: GAME_HEIGHT },
      { x: GAME_WIDTH / 2 + 18, y: GAME_HEIGHT },
      { x: GAME_WIDTH / 2 + 70, y: GAME_HEIGHT * 0.62 },
      { x: GAME_WIDTH / 2 - 70, y: GAME_HEIGHT * 0.62 },
    ], true);
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────

  private buildUI(): void {
    const cx  = GAME_WIDTH / 2;
    const cy  = GAME_HEIGHT / 2;
    const res = Math.min(window.devicePixelRatio || 2, 3);

    // ── Decorative frame ──
    const frame = this.add.graphics();
    frame.lineStyle(2, 0x8b6940, 0.7);
    frame.strokeRect(cx - 290, cy - 170, 580, 340);
    frame.lineStyle(1, 0xddbb66, 0.25);
    frame.strokeRect(cx - 284, cy - 164, 568, 328);
    // Corner ornaments
    [[-286, -166], [286, -166], [-286, 166], [286, 166]].forEach(([dx, dy]) => {
      frame.fillStyle(0xddbb66, 0.5);
      frame.fillCircle(cx + dx, cy + dy, 5);
      frame.lineStyle(1, 0xddbb66, 0.4);
      frame.strokeCircle(cx + dx, cy + dy, 9);
    });

    // ── Eye of Sauron ──
    const eye = this.add.graphics();
    eye.fillStyle(0xff4400, 0.18);
    eye.fillCircle(cx, cy - 118, 38);
    eye.fillStyle(0xff6600, 0.22);
    eye.fillCircle(cx, cy - 118, 24);
    eye.fillStyle(0xff8800, 0.3);
    eye.fillCircle(cx, cy - 118, 14);
    eye.fillStyle(0xffaa00, 0.6);
    eye.fillCircle(cx, cy - 118, 7);
    // Pupil slit
    eye.fillStyle(0x000000, 0.9);
    eye.fillRect(cx - 2, cy - 130, 4, 24);
    // Rays
    eye.lineStyle(1, 0xff5500, 0.2);
    for (let r = 0; r < 8; r++) {
      const a = (r / 8) * Math.PI * 2;
      eye.lineBetween(cx + Math.cos(a) * 16, cy - 118 + Math.sin(a) * 16,
                      cx + Math.cos(a) * 44, cy - 118 + Math.sin(a) * 44);
    }

    // Pulse tween on eye
    this.tweens.add({
      targets: eye, alpha: { from: 0.7, to: 1 },
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    // ── Title ──
    this.add.text(cx, cy - 68, 'THE DEFENSE OF', {
      fontSize: '20px', fontFamily: 'Georgia, serif', color: '#aa8855',
      letterSpacing: 6,
    }).setResolution(res).setOrigin(0.5);

    this.add.text(cx, cy - 38, 'MIDDLE-EARTH', {
      fontSize: '58px', fontFamily: 'Georgia, serif', color: '#ddbb66',
      stroke: '#110800', strokeThickness: 8,
      shadow: { blur: 24, color: '#ff4400', fill: true },
    }).setResolution(res).setOrigin(0.5);

    this.add.text(cx, cy + 24, 'A Tower Defense Game', {
      fontSize: '16px', fontFamily: 'Georgia, serif', color: '#7a6040',
      fontStyle: 'italic',
    }).setResolution(res).setOrigin(0.5);

    // ── Divider ──
    const div = this.add.graphics();
    div.lineStyle(1, 0x8b6940, 0.55);
    div.lineBetween(cx - 180, cy + 42, cx + 180, cy + 42);
    div.fillStyle(0xddbb66, 0.4);
    div.fillCircle(cx, cy + 42, 3);

    // ── Start button ──
    const btnW = 220;
    const btnH = 52;
    const btnY = cy + 82;

    const btnBg = this.add.graphics();
    this.drawBtn(btnBg, cx, btnY, btnW, btnH, false);

    const btnText = this.add.text(cx, btnY, 'Begin the Defense', {
      fontSize: '22px', fontFamily: 'Georgia, serif', color: '#ddbb66',
      stroke: '#110800', strokeThickness: 3,
    }).setResolution(res).setOrigin(0.5);

    const zone = this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      this.drawBtn(btnBg, cx, btnY, btnW, btnH, true);
      btnText.setColor('#ffffff');
    });
    zone.on('pointerout', () => {
      this.drawBtn(btnBg, cx, btnY, btnW, btnH, false);
      btnText.setColor('#ddbb66');
    });
    zone.on('pointerdown', () => this.startGame());

    // ── Controls hint ──
    this.add.text(cx, cy + 132, 'Keys 1-4 to select tower  •  Left-click to place  •  Right-click to cancel', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#4a3820',
    }).setResolution(res).setOrigin(0.5);

    // ── Quote ──
    this.add.text(cx, GAME_HEIGHT - 28,
      '"Even the smallest person can change the course of the future."',
      { fontSize: '13px', fontFamily: 'Georgia, serif', color: '#3a2a14', fontStyle: 'italic' }
    ).setResolution(res).setOrigin(0.5);

    // Entrance animation — fade in from black
    this.cameras.main.fadeIn(1200, 0, 0, 0);
  }

  private drawBtn(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, hover: boolean): void {
    g.clear();
    g.fillStyle(hover ? 0x3a2810 : 0x1e1208, hover ? 0.95 : 0.85);
    g.fillRect(cx - w / 2, cy - h / 2, w, h);
    g.lineStyle(hover ? 2 : 1, hover ? 0xddbb66 : 0x8b6940, hover ? 0.95 : 0.65);
    g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    // Inner corner marks
    const cs = 6;
    g.lineStyle(1, hover ? 0xddbb66 : 0x664422, hover ? 0.7 : 0.4);
    [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2],
     [cx - w / 2, cy + h / 2], [cx + w / 2, cy + h / 2]].forEach(([ex, ey], i) => {
      const sx = i % 2 === 0 ? 1 : -1;
      const sy = i < 2 ? 1 : -1;
      g.lineBetween(ex, ey, ex + sx * cs, ey);
      g.lineBetween(ex, ey, ex, ey + sy * cs);
    });
  }

  private startGame(): void {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MapSelectScene');
    });
  }
}
