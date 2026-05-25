import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TowerType, TOWERS } from '../GameConfig';

interface UIState {
  gold:        number;
  lives:       number;
  bonusPoints: number;
  wave:        number;
  state:       'prep' | 'wave' | 'gameover';
}

const PANEL_H  = 96;
const PANEL_Y  = GAME_HEIGHT - PANEL_H;
const BTN_W    = 74;
const BTN_H    = 78;
const BTN_GAP  = 8;

const TOWER_ORDER: TowerType[] = ['laser', 'rocket', 'slow', 'booster'];

// Parchment/medieval colour palette
const C = {
  panelBg:    0x110a04,
  panelBdr:   0x8b6940,
  gold:       '#ddbb66',
  goldDim:    '#886633',
  lives:      '#cc6644',
  wave:       '#aaddcc',
  honour:     '#cc99ff',
  label:      '#7a6040',
  hint:       '#4a3820',
  btnActive:  0x3a2810,
  btnBorder:  0x8b6940,
};

export class UIScene extends Phaser.Scene {
  private goldText!:   Phaser.GameObjects.Text;
  private livesText!:  Phaser.GameObjects.Text;
  private waveText!:   Phaser.GameObjects.Text;
  private honourText!: Phaser.GameObjects.Text;
  private hintText!:   Phaser.GameObjects.Text;
  private btnGraphics: Phaser.GameObjects.Graphics[] = [];
  private selectedType: TowerType | null = null;
  private uiState: UIState = { gold: 200, lives: 20, bonusPoints: 0, wave: 0, state: 'prep' };

  constructor() { super({ key: 'UIScene', active: false }); }

  create(): void {
    this.drawPanel();
    this.buildTowerButtons();
    this.buildHUD();

    this.events.on('stateUpdate', (s: UIState) => { this.uiState = s; this.refreshHUD(); });
    this.events.on('gameOver',    (wave: number) => this.showGameOver(wave));

    this.input.keyboard?.on('keydown-ESC', () => {
      this.selectedType = null;
      this.refreshButtons();
      this.events.emit('cancelPlacement');
    });
  }

  // ─── Panel ────────────────────────────────────────────────────────────────────

  private drawPanel(): void {
    const g = this.add.graphics();

    // Stone/leather panel background
    g.fillStyle(C.panelBg, 0.97);
    g.fillRect(0, PANEL_Y, GAME_WIDTH, PANEL_H);

    // Top border – ornate gold line
    g.lineStyle(3, C.panelBdr, 0.9);
    g.lineBetween(0, PANEL_Y, GAME_WIDTH, PANEL_Y);
    g.lineStyle(1, 0xddbb66, 0.2);
    g.lineBetween(0, PANEL_Y + 3, GAME_WIDTH, PANEL_Y + 3);

    // Decorative corner ornaments
    this.drawCornerOrnament(g, 4, PANEL_Y + 4);
    this.drawCornerOrnament(g, GAME_WIDTH - 4, PANEL_Y + 4);

    // Vertical section divider before stats
    const divX = GAME_WIDTH - 360;
    g.lineStyle(1, C.panelBdr, 0.45);
    g.lineBetween(divX, PANEL_Y + 10, divX, PANEL_Y + PANEL_H - 10);

    // Game title / subtitle at top centre of panel
    this.add.text(GAME_WIDTH / 2, PANEL_Y + 6, 'THE DEFENSE OF MIDDLE-EARTH', {
      fontSize: '10px', fontFamily: 'Georgia, serif', color: C.label,
      letterSpacing: 2,
    }).setOrigin(0.5, 0);
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
      const def  = TOWERS[type];
      const cx   = startX + i * (BTN_W + BTN_GAP) + BTN_W / 2;

      const bg = this.add.graphics();
      this.btnGraphics.push(bg);
      this.drawButton(bg, cx, cy, type, false);

      // Tower name
      this.add.text(cx, PANEL_Y + 18, def.name, {
        fontSize: '10px', fontFamily: 'Georgia, serif', color: C.gold,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);

      // Cost
      this.add.text(cx, cy + BTN_H / 2 - 8, `⚙ ${def.cost}g`, {
        fontSize: '10px', fontFamily: 'Courier New', color: C.goldDim,
      }).setOrigin(0.5);

      // Keyboard shortcut
      this.add.text(cx + BTN_W / 2 - 3, PANEL_Y + 16, `${i + 1}`, {
        fontSize: '9px', fontFamily: 'Courier New', color: C.hint,
      }).setOrigin(1, 1);

      // Effectiveness hint
      this.add.text(cx, cy - BTN_H / 2 + 8, def.description.split('.')[0], {
        fontSize: '8px', fontFamily: 'Courier New', color: C.hint,
        wordWrap: { width: BTN_W + 4 }, align: 'center',
      }).setOrigin(0.5, 0);

      // Hitzone
      const zone = this.add.zone(cx, cy, BTN_W + 4, BTN_H + 4).setInteractive();
      zone.on('pointerdown', () => {
        this.selectedType = this.selectedType === type ? null : type;
        this.refreshButtons();
        if (this.selectedType) this.events.emit('selectTower', this.selectedType);
        else this.events.emit('cancelPlacement');
      });

      this.input.keyboard?.on(`keydown-${i + 1}`, () => {
        this.selectedType = this.selectedType === type ? null : type;
        this.refreshButtons();
        if (this.selectedType) this.events.emit('selectTower', this.selectedType);
        else this.events.emit('cancelPlacement');
      });
    });
  }

  private drawButton(g: Phaser.GameObjects.Graphics, cx: number, cy: number, type: TowerType, selected: boolean): void {
    const def      = TOWERS[type];
    const color    = def.color;
    const hw       = BTN_W / 2;
    const hh       = BTN_H / 2;
    const canAfford = this.uiState.gold >= def.cost;
    g.clear();

    // Background
    const bgAlpha = selected ? 0.5 : 0.25;
    g.fillStyle(selected ? color : C.btnActive, bgAlpha);
    g.fillRect(cx - hw, cy - hh, BTN_W, BTN_H);

    // Ornate border
    const bColor = canAfford ? (selected ? color : C.btnBorder) : 0x443322;
    const bAlpha = canAfford ? (selected ? 1 : 0.6) : 0.3;
    g.lineStyle(selected ? 2 : 1, bColor, bAlpha);
    g.strokeRect(cx - hw, cy - hh, BTN_W, BTN_H);

    // Inner corner marks
    if (canAfford) {
      const cs = 5;
      g.lineStyle(1, color, selected ? 0.8 : 0.35);
      [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx - hw, cy + hh], [cx + hw, cy + hh]].forEach(([ex, ey], idx) => {
        const sx = idx % 2 === 0 ? 1 : -1;
        const sy = idx < 2 ? 1 : -1;
        g.lineBetween(ex, ey, ex + sx * cs, ey);
        g.lineBetween(ex, ey, ex, ey + sy * cs);
      });
    }

    // Icon glow dot
    if (canAfford) {
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

  // ─── HUD ──────────────────────────────────────────────────────────────────────

  private buildHUD(): void {
    const rx  = GAME_WIDTH - 345;
    const mid = PANEL_Y + PANEL_H / 2 + 2;

    const lbl = (text: string, x: number, y: number) =>
      this.add.text(x, y, text, { fontSize: '10px', fontFamily: 'Georgia, serif', color: C.label }).setOrigin(0, 0.5);

    lbl('ASSAULT',  rx,       mid - 26);
    lbl('TREASURY', rx + 90,  mid - 26);
    lbl('GARRISON', rx + 190, mid - 26);
    lbl('HONOUR',   rx,       mid + 16);

    this.waveText  = this.add.text(rx,       mid - 8, '—',   { fontSize: '22px', fontFamily: 'Georgia, serif', color: C.wave   }).setOrigin(0, 0.5);
    this.goldText  = this.add.text(rx + 90,  mid - 8, '200', { fontSize: '20px', fontFamily: 'Georgia, serif', color: C.gold   }).setOrigin(0, 0.5);
    this.livesText = this.add.text(rx + 190, mid - 8, '20',  { fontSize: '20px', fontFamily: 'Georgia, serif', color: C.lives  }).setOrigin(0, 0.5);
    this.honourText = this.add.text(rx,       mid + 28, '0 pts', { fontSize: '13px', fontFamily: 'Georgia, serif', color: C.honour }).setOrigin(0, 0.5);

    this.hintText = this.add.text(GAME_WIDTH / 2, PANEL_Y + 8, '', {
      fontSize: '10px', fontFamily: 'Courier New', color: C.hint,
    }).setOrigin(0.5, 0);
  }

  private refreshHUD(): void {
    const s = this.uiState;
    this.waveText.setText(s.wave > 0 ? `${s.wave}` : '—');
    this.goldText.setText(`${s.gold}`);
    this.livesText.setText(`${s.lives}`);
    this.honourText.setText(`${s.bonusPoints} pts`);

    const hint = s.state === 'wave'
      ? `Wave ${s.wave} — Hold the Line!  •  Keys 1-4 select tower  •  ESC / Right-click cancel`
      : s.state === 'prep'
        ? 'The enemy regroups...  •  Keys 1-4 select tower  •  Click field to build'
        : 'Middle-Earth has fallen.';
    this.hintText.setText(hint);

    this.livesText.setColor(s.lives <= 5 ? '#ff3300' : s.lives <= 10 ? '#ff8800' : C.lives);
    this.refreshButtons();
  }

  // ─── Game over ────────────────────────────────────────────────────────────────

  private showGameOver(wave: number): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Decorative frame
    const fr = this.add.graphics();
    fr.lineStyle(2, 0x8b6940, 0.8);
    fr.strokeRect(cx - 260, cy - 110, 520, 220);
    fr.lineStyle(1, 0xddbb66, 0.3);
    fr.strokeRect(cx - 254, cy - 104, 508, 208);

    this.add.text(cx, cy - 70, 'MIDDLE-EARTH HAS FALLEN', {
      fontSize: '38px', fontFamily: 'Georgia, serif', color: '#cc3300',
      stroke: '#330000', strokeThickness: 6,
      shadow: { blur: 20, color: '#ff2200', fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, cy - 18, `The enemy broke through on Wave ${wave}`, {
      fontSize: '18px', fontFamily: 'Georgia, serif', color: '#aa8855',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 14, `"Not all tears are an evil."`, {
      fontSize: '14px', fontFamily: 'Georgia, serif', color: '#776644',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    const btn = this.add.text(cx, cy + 60, '[ Rally and Try Again ]', {
      fontSize: '20px', fontFamily: 'Georgia, serif', color: '#ddbb66',
      stroke: '#221100', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#ddbb66'));
    btn.on('pointerdown', () => this.scene.manager.start('GameScene'));
  }
}
