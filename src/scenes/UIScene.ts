import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TowerType, TOWERS } from '../GameConfig';

interface UIState {
  gold:        number;
  lives:       number;
  bonusPoints: number;
  wave:        number;
  state:       'prep' | 'wave' | 'gameover';
}

const PANEL_H  = 90;
const PANEL_Y  = GAME_HEIGHT - PANEL_H;
const BTN_SIZE = 70;
const BTN_GAP  = 10;

const TOWER_ORDER: TowerType[] = ['laser', 'rocket', 'slow', 'booster'];

export class UIScene extends Phaser.Scene {
  private goldText!:   Phaser.GameObjects.Text;
  private livesText!:  Phaser.GameObjects.Text;
  private waveText!:   Phaser.GameObjects.Text;
  private bonusText!:  Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private btnGraphics: Phaser.GameObjects.Graphics[] = [];
  private btnLabels:   Phaser.GameObjects.Text[]     = [];
  private selectedType: TowerType | null = null;
  private uiState: UIState = { gold: 200, lives: 20, bonusPoints: 0, wave: 0, state: 'prep' };

  constructor() { super({ key: 'UIScene', active: false }); }

  create(): void {
    this.drawPanel();
    this.buildTowerButtons();
    this.buildHUD();

    // Listen from GameScene
    this.events.on('stateUpdate', (s: UIState) => { this.uiState = s; this.refreshHUD(); });
    this.events.on('gameOver',    (wave: number) => this.showGameOver(wave));

    // Keyboard shortcut: Escape cancels placement
    this.input.keyboard?.on('keydown-ESC', () => {
      this.selectedType = null;
      this.refreshButtons();
      this.events.emit('cancelPlacement');
    });
  }

  // ─── Panel ────────────────────────────────────────────────────────────────────

  private drawPanel(): void {
    const g = this.add.graphics();

    // Background panel
    g.fillStyle(0x070714, 0.95);
    g.fillRect(0, PANEL_Y, GAME_WIDTH, PANEL_H);

    // Top border glow
    g.lineStyle(1, 0x2244aa, 0.6);
    g.lineBetween(0, PANEL_Y, GAME_WIDTH, PANEL_Y);
    g.lineStyle(1, 0x4488ff, 0.2);
    g.lineBetween(0, PANEL_Y + 1, GAME_WIDTH, PANEL_Y + 1);

    // Section dividers
    const divX = GAME_WIDTH - 340;
    g.lineStyle(1, 0x1a2a44, 0.7);
    g.lineBetween(divX, PANEL_Y + 8, divX, PANEL_Y + PANEL_H - 8);
  }

  // ─── Tower buttons ────────────────────────────────────────────────────────────

  private buildTowerButtons(): void {
    const startX = 20;
    const y      = PANEL_Y + PANEL_H / 2;

    TOWER_ORDER.forEach((type, i) => {
      const def  = TOWERS[type];
      const cx   = startX + i * (BTN_SIZE + BTN_GAP) + BTN_SIZE / 2;

      const bg = this.add.graphics();
      this.btnGraphics.push(bg);
      this.drawButton(bg, cx, y, type, false);

      // Cost label
      const costLabel = this.add.text(cx, y + BTN_SIZE / 2 - 12, `$${def.cost}`, {
        fontSize: '11px', fontFamily: 'Courier New', color: '#aaaaaa',
      }).setOrigin(0.5);

      // Name label
      const nameLabel = this.add.text(cx, y - BTN_SIZE / 2 + 6, def.name, {
        fontSize: '10px', fontFamily: 'Courier New', color: '#cccccc',
      }).setOrigin(0.5);

      // Keyboard hint (1-4)
      this.add.text(cx + BTN_SIZE / 2 - 4, y - BTN_SIZE / 2 - 2, `${i + 1}`, {
        fontSize: '10px', fontFamily: 'Courier New', color: '#556677',
      }).setOrigin(1, 1);

      // Tooltip description below
      const desc = this.add.text(cx, y + BTN_SIZE / 2 + 2, def.description, {
        fontSize: '9px', fontFamily: 'Courier New', color: '#556677',
        wordWrap: { width: BTN_SIZE + 10 }, align: 'center',
      }).setOrigin(0.5, 0).setVisible(false);
      this.btnLabels.push(desc);

      // Hitzone
      const zone = this.add.zone(cx, y, BTN_SIZE + 4, BTN_SIZE + 4).setInteractive();
      zone.on('pointerover', () => { desc.setVisible(true); });
      zone.on('pointerout',  () => { desc.setVisible(false); });
      zone.on('pointerdown', () => {
        this.selectedType = this.selectedType === type ? null : type;
        this.refreshButtons();
        if (this.selectedType) {
          this.events.emit('selectTower', this.selectedType);
        } else {
          this.events.emit('cancelPlacement');
        }
      });

      // Keyboard shortcuts 1-4
      this.input.keyboard?.on(`keydown-${i + 1}`, () => {
        this.selectedType = this.selectedType === type ? null : type;
        this.refreshButtons();
        if (this.selectedType) this.events.emit('selectTower', this.selectedType);
        else this.events.emit('cancelPlacement');
      });
    });
  }

  private drawButton(g: Phaser.GameObjects.Graphics, cx: number, cy: number, type: TowerType, selected: boolean): void {
    const def   = TOWERS[type];
    const color = def.color;
    const half  = BTN_SIZE / 2;
    const affordable = this.uiState.gold >= def.cost;

    g.clear();

    // Background
    g.fillStyle(selected ? color : 0x0d1020, selected ? 0.25 : 1);
    g.fillRoundedRect(cx - half, cy - half, BTN_SIZE, BTN_SIZE, 6);

    // Border
    const borderAlpha = affordable ? (selected ? 1 : 0.6) : 0.25;
    g.lineStyle(selected ? 2 : 1, selected ? color : (affordable ? color : 0x333355), borderAlpha);
    g.strokeRoundedRect(cx - half, cy - half, BTN_SIZE, BTN_SIZE, 6);

    // Inner icon glow dot
    if (affordable) {
      g.fillStyle(color, 0.8);
      g.fillCircle(cx, cy - 8, selected ? 12 : 10);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(cx, cy - 8, selected ? 5 : 4);
    } else {
      g.fillStyle(0x334455, 0.5);
      g.fillCircle(cx, cy - 8, 10);
    }

    // Selected ring pulse indicator
    if (selected) {
      g.lineStyle(1, color, 0.4);
      g.strokeCircle(cx, cy - 8, 18);
    }
  }

  private refreshButtons(): void {
    TOWER_ORDER.forEach((type, i) => {
      const def  = TOWERS[type];
      const cx   = 20 + i * (BTN_SIZE + BTN_GAP) + BTN_SIZE / 2;
      const cy   = PANEL_Y + PANEL_H / 2;
      this.drawButton(this.btnGraphics[i], cx, cy, type, this.selectedType === type);
    });
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────────

  private buildHUD(): void {
    const rx  = GAME_WIDTH - 320;
    const mid = PANEL_Y + PANEL_H / 2;

    const style = (color: string = '#88aacc') => ({
      fontSize: '13px', fontFamily: 'Courier New', color,
    });

    this.add.text(rx,       mid - 28, 'WAVE',   style('#556677')).setOrigin(0, 0.5);
    this.add.text(rx + 90,  mid - 28, 'GOLD',   style('#556677')).setOrigin(0, 0.5);
    this.add.text(rx + 185, mid - 28, 'LIVES',  style('#556677')).setOrigin(0, 0.5);
    this.add.text(rx,       mid + 14, 'BONUS',  style('#556677')).setOrigin(0, 0.5);

    this.waveText  = this.add.text(rx,       mid - 10, '0',  { fontSize: '22px', fontFamily: 'Courier New', color: '#00ff88' }).setOrigin(0, 0.5);
    this.goldText  = this.add.text(rx + 90,  mid - 10, '200', { fontSize: '18px', fontFamily: 'Courier New', color: '#ffdd44' }).setOrigin(0, 0.5);
    this.livesText = this.add.text(rx + 185, mid - 10, '20', { fontSize: '18px', fontFamily: 'Courier New', color: '#ff6666' }).setOrigin(0, 0.5);
    this.bonusText = this.add.text(rx,       mid + 26, '0 BP', { fontSize: '13px', fontFamily: 'Courier New', color: '#cc88ff' }).setOrigin(0, 0.5);

    // Status / hint text
    this.statusText = this.add.text(GAME_WIDTH / 2, PANEL_Y + 14, 'PRESS 1–4 TO SELECT A TOWER • RIGHT CLICK TO CANCEL', {
      fontSize: '11px', fontFamily: 'Courier New', color: '#334455',
    }).setOrigin(0.5, 0);
  }

  private refreshHUD(): void {
    const s = this.uiState;
    this.waveText.setText(s.wave > 0 ? `${s.wave}` : '—');
    this.goldText.setText(`${s.gold}`);
    this.livesText.setText(`${s.lives}`);
    this.bonusText.setText(`${s.bonusPoints} BP`);

    const stateHint = s.state === 'wave' ? `WAVE ${s.wave} IN PROGRESS` : s.state === 'prep' ? 'NEXT WAVE INCOMING…' : 'GAME OVER';
    this.statusText.setText(`${stateHint}  •  1-4 SELECT TOWER  •  ESC / RMB CANCEL`);

    // Red flash on low lives
    this.livesText.setColor(s.lives <= 5 ? '#ff2222' : s.lives <= 10 ? '#ff8800' : '#ff6666');

    // Refresh button affordability
    this.refreshButtons();
  }

  // ─── Game over overlay ────────────────────────────────────────────────────────

  private showGameOver(wave: number): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.text(cx, cy - 60, 'GAME OVER', {
      fontSize: '64px', fontFamily: 'Courier New', color: '#ff2222',
      stroke: '#440000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, cy + 10, `You survived ${wave} wave${wave !== 1 ? 's' : ''}`, {
      fontSize: '24px', fontFamily: 'Courier New', color: '#aaaacc',
    }).setOrigin(0.5);

    // Restart button
    const restartBtn = this.add.text(cx, cy + 70, '[ RESTART ]', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#00ff88',
      stroke: '#003322', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerover', () => restartBtn.setColor('#ffffff'));
    restartBtn.on('pointerout',  () => restartBtn.setColor('#00ff88'));
    restartBtn.on('pointerdown', () => this.scene.manager.start('GameScene'));
  }
}
