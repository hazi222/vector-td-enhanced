import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TowerType, TOWERS } from '../GameConfig';

interface UIState {
  gold:        number;
  lives:       number;
  bonusPoints: number;
  wave:        number;
  state:       'prep' | 'wave' | 'gameover';
}

const PANEL_H  = 128;
const PANEL_Y  = GAME_HEIGHT - PANEL_H;
const BTN_W    = 100;
const BTN_H    = 104;
const BTN_GAP  = 10;
const RES      = Math.min(window.devicePixelRatio || 2, 3);

const ACTION_BX = GAME_WIDTH / 2;
const ACTION_BY = PANEL_Y + 64;
const ACTION_BW = 200;
const ACTION_BH = 48;

const TOWER_ORDER: TowerType[] = ['laser', 'rocket', 'slow', 'booster'];

const C = {
  panelBg:   0x110a04,
  panelBdr:  0x8b6940,
  gold:      '#ddbb66',
  goldDim:   '#886633',
  lives:     '#cc6644',
  wave:      '#aaddcc',
  honour:    '#cc99ff',
  label:     '#7a6040',
  hint:      '#4a3820',
  btnActive: 0x3a2810,
  btnBorder: 0x8b6940,
};

// Helper: create sharp text with auto device-pixel-ratio resolution
function mkText(
  scene: Phaser.Scene,
  x: number, y: number, text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, style).setResolution(RES);
}

export class UIScene extends Phaser.Scene {
  private goldText!:       Phaser.GameObjects.Text;
  private livesText!:      Phaser.GameObjects.Text;
  private waveText!:       Phaser.GameObjects.Text;
  private honourText!:     Phaser.GameObjects.Text;
  private hintText!:       Phaser.GameObjects.Text;
  private actionBtnG!:     Phaser.GameObjects.Graphics;
  private actionBtnLabel!: Phaser.GameObjects.Text;
  private pauseOverlay!:   Phaser.GameObjects.Text;
  private btnGraphics:     Phaser.GameObjects.Graphics[] = [];
  private selectedType:    TowerType | null = null;
  private isPaused = false;
  private uiState: UIState = { gold: 200, lives: 20, bonusPoints: 0, wave: 0, state: 'prep' };

  constructor() { super({ key: 'UIScene', active: false }); }

  create(): void {
    this.drawPanel();
    this.buildTowerButtons();
    this.buildHUD();
    this.buildActionButton();

    this.events.on('stateUpdate', (s: UIState) => {
      const prevState = this.uiState.state;
      this.uiState = s;
      if (prevState === 'wave' && s.state === 'prep' && this.isPaused) {
        this.isPaused = false;
        this.scene.resume('GameScene');
        this.pauseOverlay.setVisible(false);
      }
      this.refreshHUD();
    });
    this.events.on('gameOver', (wave: number) => this.showGameOver(wave));

    this.input.keyboard?.on('keydown-ESC', () => {
      this.selectedType = null;
      this.refreshButtons();
      this.toGame('cancelPlacement');
    });
  }

  private toGame(event: string, data?: unknown): void {
    this.scene.get('GameScene').events.emit(event, data);
  }

  // ─── Panel ────────────────────────────────────────────────────────────────────

  private drawPanel(): void {
    const g = this.add.graphics();
    g.fillStyle(C.panelBg, 0.97);
    g.fillRect(0, PANEL_Y, GAME_WIDTH, PANEL_H);
    g.lineStyle(3, C.panelBdr, 0.9);
    g.lineBetween(0, PANEL_Y, GAME_WIDTH, PANEL_Y);
    g.lineStyle(1, 0xddbb66, 0.2);
    g.lineBetween(0, PANEL_Y + 3, GAME_WIDTH, PANEL_Y + 3);
    this.drawCornerOrnament(g, 4, PANEL_Y + 4);
    this.drawCornerOrnament(g, GAME_WIDTH - 4, PANEL_Y + 4);

    const leftDiv = 18 + TOWER_ORDER.length * (BTN_W + BTN_GAP) + 6;
    g.lineStyle(1, C.panelBdr, 0.35);
    g.lineBetween(leftDiv, PANEL_Y + 10, leftDiv, PANEL_Y + PANEL_H - 10);

    const rightDiv = GAME_WIDTH - 360;
    g.lineStyle(1, C.panelBdr, 0.45);
    g.lineBetween(rightDiv, PANEL_Y + 10, rightDiv, PANEL_Y + PANEL_H - 10);
  }

  private drawCornerOrnament(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.lineStyle(1, 0xddbb66, 0.5);
    g.strokeCircle(x, y + 6, 6);
    g.fillStyle(0xddbb66, 0.3);
    g.fillCircle(x, y + 6, 3);
  }

  // ─── Tower buttons ────────────────────────────────────────────────────────────

  private buildTowerButtons(): void {
    const startX = 18;
    const cy     = PANEL_Y + PANEL_H / 2 + 4;

    TOWER_ORDER.forEach((type, i) => {
      const def = TOWERS[type];
      const cx  = startX + i * (BTN_W + BTN_GAP) + BTN_W / 2;

      const bg = this.add.graphics();
      this.btnGraphics.push(bg);
      this.drawButton(bg, cx, cy, type, false);

      mkText(this, cx - BTN_W / 2 + 8, cy - BTN_H / 2 + 8, `${i + 1}`, {
        fontSize: '24px', fontFamily: 'Courier New', color: C.hint,
      }).setOrigin(0, 0);

      mkText(this, cx, cy - BTN_H / 2 + 28, def.name, {
        fontSize: '24px', fontFamily: 'Georgia, serif', color: C.gold,
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 0);

      mkText(this, cx, cy + BTN_H / 2 - 20, `${def.cost}g`, {
        fontSize: '26px', fontFamily: 'Courier New', color: C.goldDim,
      }).setOrigin(0.5, 1);

      const zone = this.add.zone(cx, cy, BTN_W + 4, BTN_H + 4).setInteractive();
      zone.on('pointerdown', () => {
        this.selectedType = this.selectedType === type ? null : type;
        this.refreshButtons();
        if (this.selectedType) this.toGame('selectTower', this.selectedType);
        else this.toGame('cancelPlacement');
      });

      this.input.keyboard?.on(`keydown-${i + 1}`, () => {
        this.selectedType = this.selectedType === type ? null : type;
        this.refreshButtons();
        if (this.selectedType) this.toGame('selectTower', this.selectedType);
        else this.toGame('cancelPlacement');
      });
    });
  }

  private drawButton(g: Phaser.GameObjects.Graphics, cx: number, cy: number, type: TowerType, selected: boolean): void {
    const def       = TOWERS[type];
    const color     = def.color;
    const hw        = BTN_W / 2;
    const hh        = BTN_H / 2;
    const canAfford = this.uiState.gold >= def.cost;
    g.clear();

    g.fillStyle(selected ? color : C.btnActive, selected ? 0.5 : 0.25);
    g.fillRect(cx - hw, cy - hh, BTN_W, BTN_H);

    const bColor = canAfford ? (selected ? color : C.btnBorder) : 0x443322;
    const bAlpha = canAfford ? (selected ? 1 : 0.6) : 0.3;
    g.lineStyle(selected ? 2 : 1, bColor, bAlpha);
    g.strokeRect(cx - hw, cy - hh, BTN_W, BTN_H);

    if (canAfford) {
      const cs = 5;
      g.lineStyle(1, color, selected ? 0.8 : 0.35);
      [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx - hw, cy + hh], [cx + hw, cy + hh]].forEach(([ex, ey], idx) => {
        const sx = idx % 2 === 0 ? 1 : -1;
        const sy = idx < 2 ? 1 : -1;
        g.lineBetween(ex, ey, ex + sx * cs, ey);
        g.lineBetween(ex, ey, ex, ey + sy * cs);
      });
      g.fillStyle(color, 0.7);
      g.fillCircle(cx, cy - 6, selected ? 11 : 9);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(cx - 3, cy - 9, selected ? 4 : 3);
    } else {
      g.fillStyle(0x332211, 0.6);
      g.fillCircle(cx, cy - 6, 9);
    }
  }

  private refreshButtons(): void {
    TOWER_ORDER.forEach((type, i) => {
      const cx = 18 + i * (BTN_W + BTN_GAP) + BTN_W / 2;
      const cy = PANEL_Y + PANEL_H / 2 + 4;
      this.drawButton(this.btnGraphics[i], cx, cy, type, this.selectedType === type);
    });
  }

  // ─── Action button ────────────────────────────────────────────────────────────

  private buildActionButton(): void {
    this.actionBtnG = this.add.graphics();
    this.drawActionBtnBg(false);

    this.actionBtnLabel = mkText(this, ACTION_BX, ACTION_BY, '▶  Send Wave', {
      fontSize: '32px', fontFamily: 'Georgia, serif',
      color: C.gold, stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    const zone = this.add.zone(ACTION_BX, ACTION_BY, ACTION_BW, ACTION_BH)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => this.drawActionBtnBg(true));
    zone.on('pointerout',  () => this.drawActionBtnBg(false));
    zone.on('pointerdown', () => this.onActionBtnClick());

    this.input.keyboard?.on('keydown-SPACE', () => this.onActionBtnClick());

    this.pauseOverlay = mkText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'PAUSED', {
      fontSize: '120px', fontFamily: 'Georgia, serif', color: '#ddbb66',
      stroke: '#000000', strokeThickness: 12,
      shadow: { blur: 32, color: '#ff4400', fill: true },
    }).setOrigin(0.5).setDepth(100).setVisible(false);
  }

  private drawActionBtnBg(hover: boolean): void {
    const disabled = this.uiState.state === 'gameover';
    const g = this.actionBtnG;
    g.clear();
    g.fillStyle(!disabled && hover ? 0x3a2810 : 0x1a1008, !disabled && hover ? 0.95 : 0.85);
    g.fillRect(ACTION_BX - ACTION_BW / 2, ACTION_BY - ACTION_BH / 2, ACTION_BW, ACTION_BH);
    const borderColor = disabled ? 0x443322 : (hover ? 0xddbb66 : 0x8b6940);
    const borderAlpha = disabled ? 0.3 : (hover ? 0.95 : 0.7);
    g.lineStyle(hover ? 2 : 1, borderColor, borderAlpha);
    g.strokeRect(ACTION_BX - ACTION_BW / 2, ACTION_BY - ACTION_BH / 2, ACTION_BW, ACTION_BH);
    if (!disabled) {
      const cs = 5, hw = ACTION_BW / 2, hh = ACTION_BH / 2;
      g.lineStyle(1, hover ? 0xddbb66 : 0x664422, hover ? 0.7 : 0.4);
      [[ACTION_BX - hw, ACTION_BY - hh], [ACTION_BX + hw, ACTION_BY - hh],
       [ACTION_BX - hw, ACTION_BY + hh], [ACTION_BX + hw, ACTION_BY + hh]].forEach(([ex, ey], i) => {
        const sx = i % 2 === 0 ? 1 : -1, sy = i < 2 ? 1 : -1;
        g.lineBetween(ex, ey, ex + sx * cs, ey);
        g.lineBetween(ex, ey, ex, ey + sy * cs);
      });
    }
  }

  private onActionBtnClick(): void {
    const state = this.uiState.state;
    if (state === 'gameover') return;
    if (state === 'prep') {
      this.toGame('startWave');
    } else if (state === 'wave') {
      if (!this.isPaused) {
        this.isPaused = true;
        this.scene.pause('GameScene');
        this.pauseOverlay.setVisible(true);
      } else {
        this.isPaused = false;
        this.scene.resume('GameScene');
        this.pauseOverlay.setVisible(false);
      }
      this.refreshActionBtn();
    }
  }

  private refreshActionBtn(): void {
    const state = this.uiState.state;
    const label = state === 'gameover' ? '—'
      : state === 'wave' ? (this.isPaused ? '▶  Resume' : '⏸  Pause')
      : '▶  Send Wave';
    this.actionBtnLabel.setText(label);
    this.drawActionBtnBg(false);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────────

  private buildHUD(): void {
    const rx  = GAME_WIDTH - 460;
    const mid = PANEL_Y + PANEL_H / 2 + 2;

    const lbl = (text: string, x: number, y: number) =>
      mkText(this, x, y, text, { fontSize: '22px', fontFamily: 'Georgia, serif', color: C.label }).setOrigin(0, 0.5);

    lbl('ASSAULT',  rx,       mid - 36);
    lbl('TREASURY', rx + 120, mid - 36);
    lbl('GARRISON', rx + 250, mid - 36);
    lbl('HONOUR',   rx,       mid + 24);

    this.waveText   = mkText(this, rx,       mid - 12, '—',      { fontSize: '52px', fontFamily: 'Georgia, serif', color: C.wave   }).setOrigin(0, 0.5);
    this.goldText   = mkText(this, rx + 120, mid - 12, '200',    { fontSize: '48px', fontFamily: 'Georgia, serif', color: C.gold   }).setOrigin(0, 0.5);
    this.livesText  = mkText(this, rx + 250, mid - 12, '20',     { fontSize: '48px', fontFamily: 'Georgia, serif', color: C.lives  }).setOrigin(0, 0.5);
    this.honourText = mkText(this, rx,       mid + 40, '0 pts', { fontSize: '28px', fontFamily: 'Georgia, serif', color: C.honour }).setOrigin(0, 0.5);

    this.hintText = mkText(this, ACTION_BX, PANEL_Y + 12, '', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#6a5030',
    }).setOrigin(0.5, 0);
  }

  private refreshHUD(): void {
    const s = this.uiState;
    this.waveText.setText(s.wave > 0 ? `${s.wave}` : '—');
    this.goldText.setText(`${s.gold}`);
    this.livesText.setText(`${s.lives}`);
    this.honourText.setText(`${s.bonusPoints} pts`);

    const hint = s.state === 'wave'
      ? `Wave ${s.wave} — Hold the Line!  •  SPACE to pause  •  ESC / Right-click cancel`
      : s.state === 'prep'
        ? 'The enemy regroups...  •  SPACE to send wave early  •  Keys 1-4 to build'
        : 'Middle-Earth has fallen.';
    this.hintText.setText(hint);

    this.livesText.setColor(s.lives <= 5 ? '#ff3300' : s.lives <= 10 ? '#ff8800' : C.lives);
    this.refreshButtons();
    this.refreshActionBtn();
  }

  // ─── Game over ────────────────────────────────────────────────────────────────

  private showGameOver(wave: number): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.scene.resume('GameScene');
      this.pauseOverlay.setVisible(false);
    }

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const fr = this.add.graphics();
    fr.lineStyle(2, 0x8b6940, 0.8);
    fr.strokeRect(cx - 260, cy - 110, 520, 220);
    fr.lineStyle(1, 0xddbb66, 0.3);
    fr.strokeRect(cx - 254, cy - 104, 508, 208);

    mkText(this, cx, cy - 70, 'MIDDLE-EARTH HAS FALLEN', {
      fontSize: '40px', fontFamily: 'Georgia, serif', color: '#cc3300',
      stroke: '#330000', strokeThickness: 6,
      shadow: { blur: 20, color: '#ff2200', fill: true },
    }).setOrigin(0.5);

    mkText(this, cx, cy - 18, `The enemy broke through on Wave ${wave}`, {
      fontSize: '20px', fontFamily: 'Georgia, serif', color: '#aa8855',
    }).setOrigin(0.5);

    mkText(this, cx, cy + 14, `"Not all tears are an evil."`, {
      fontSize: '16px', fontFamily: 'Georgia, serif', color: '#776644', fontStyle: 'italic',
    }).setOrigin(0.5);

    const btn = mkText(this, cx, cy + 60, '[ Rally and Try Again ]', {
      fontSize: '22px', fontFamily: 'Georgia, serif', color: '#ddbb66',
      stroke: '#221100', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#ddbb66'));
    btn.on('pointerdown', () => this.scene.manager.start('GameScene'));
  }
}
