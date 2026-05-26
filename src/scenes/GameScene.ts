import Phaser from 'phaser';
import {
  CELL, COLS, GAME_HEIGHT, GAME_WIDTH,
  MapDef, MAPS, ROWS, TOWERS, TowerType, WAVES_TO_WIN,
} from '../GameConfig';

import { Enemy, spawnEnemy } from '../entities/Enemy';
import { HitResult, Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { GridSystem } from '../systems/GridSystem';
import { WaveSystem } from '../systems/WaveSystem';

type GameState = 'prep' | 'wave' | 'gameover';

export class GameScene extends Phaser.Scene {
  private grid!:  GridSystem;
  private waves!: WaveSystem;

  private enemies:     Enemy[]      = [];
  private towers:      Tower[]      = [];
  private projectiles: Projectile[] = [];

  private path!: Phaser.Curves.Path;

  private mapDef!: MapDef;
  private gold:        number = 0;
  private lives:       number = 0;
  private bonusPoints: number = 0;

  private placingType:   TowerType | null = null;
  private ghostG!:       Phaser.GameObjects.Graphics;
  private selectedTower: Tower | null = null;
  private upgradePanel:  Phaser.GameObjects.GameObject[] = [];

  private state: GameState = 'prep';

  constructor() { super('GameScene'); }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  init(data: { map?: MapDef }): void {
    this.mapDef = data?.map ?? MAPS[2]; // default Cyber Storm
  }

  create(): void {
    // Particle texture
    const pg = this.add.graphics();
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(4, 4, 4);
    pg.generateTexture('particle', 8, 8);
    pg.destroy();

    // Fire particle texture (orange)
    const fg = this.add.graphics();
    fg.fillStyle(0xff6600, 1);
    fg.fillCircle(4, 4, 4);
    fg.generateTexture('fire_particle', 8, 8);
    fg.destroy();

    const wp = this.mapDef.path;
    this.path = new Phaser.Curves.Path(wp[0].x, wp[0].y);
    for (let i = 1; i < wp.length; i++) this.path.lineTo(wp[i].x, wp[i].y);

    this.gold  = this.mapDef.startGold;
    this.lives = this.mapDef.startLives;

    this.grid  = new GridSystem(this.mapDef.path);
    this.waves = new WaveSystem(
      this,
      type => this.doSpawnEnemy(type),
      ()   => { /* wait for enemies to clear */ },
    );

    this.drawMapBackground();
    this.drawPath();
    this.drawGrid();

    this.ghostG = this.add.graphics().setDepth(20);

    // Camera post-processing
    try {
      this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 0.10, 1, 6);
      this.cameras.main.postFX.addVignette(0.5, 0.5, 0.80, 0.20);
    } catch (_) { /* canvas fallback */ }

    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) { this.cancelPlacement(); this.deselectTower(); }
      else this.onPointerDown(p);
    });

    this.events.on('selectTower',     (t: TowerType) => { this.placingType = t; this.deselectTower(); });
    this.events.on('cancelPlacement', ()             => this.cancelPlacement());
    this.events.on('startWave',       ()             => { if (this.state === 'prep') this.startNextWave(); });

    this.scene.launch('UIScene');
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.time.delayedCall(2200, () => { if (this.state === 'prep') this.startNextWave(); });
    this.emitUI();
  }

  update(_t: number, delta: number): void {
    if (this.state === 'gameover') return;

    this.waves.update(delta);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.isDead) { this.enemies.splice(i, 1); continue; }
      const reachedEnd = e.update(delta);
      if (reachedEnd) {
        this.loseLife();
        e.die();
        this.enemies.splice(i, 1);
      }
    }

    for (const tower of this.towers) {
      const proj = tower.tryFire(this.time.now, this.enemies, this);
      if (proj) {
        proj.setDepth(15);
        this.projectiles.push(proj);
      }
      // Sweep kills after instant-hit towers (laser, ent stomp)
      if (tower.def.type === 'laser' || tower.def.type === 'booster') this.sweepDeadEnemies();
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.isDead) { this.projectiles.splice(i, 1); continue; }
      const hit = proj.update(delta);
      if (hit) {
        this.onProjectileHit(hit, proj.source);
        this.projectiles.splice(i, 1);
      }
    }

    if (this.state === 'wave' && !this.waves.isSpawning && this.enemies.length === 0) {
      this.onWaveCleared();
    }
  }

  // ─── Wave management ─────────────────────────────────────────────────────────

  private startNextWave(): void {
    this.state = 'wave';
    const interest = Math.floor(this.gold * 0.05);
    if (interest > 0) {
      this.gold += interest;
      this.spawnFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, `+${interest} Gold (Interest)`, '#ffdd88');
    }
    this.waves.startWave();
    this.cameras.main.shake(200, 0.004);
    this.showBanner(`The Enemy Advances — Wave ${this.waves.currentWave}`);
    this.emitUI();
  }

  private onWaveCleared(): void {
    if (this.waves.currentWave >= WAVES_TO_WIN) {
      this.triggerVictory();
      return;
    }
    this.state = 'prep';
    this.showBanner(`Wave ${this.waves.currentWave} / ${WAVES_TO_WIN} Cleared!`, '#aaddcc');
    this.emitUI();
    this.time.delayedCall(3500, () => { if (this.state === 'prep') this.startNextWave(); });
  }

  private triggerVictory(): void {
    this.state = 'gameover';
    this.showBanner(`VICTORY! Wave ${this.waves.currentWave} Complete!`, '#ffdd88');
    this.scene.get('UIScene').events.emit('victory', this.waves.currentWave);
  }

  private showBanner(text: string, color = '#ddcc88'): void {
    const res = Math.min(window.devicePixelRatio || 2, 3);
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, text, {
      fontSize: '40px', fontFamily: 'Georgia, serif', color,
      stroke: '#111100', strokeThickness: 6, shadow: { blur: 12, color: '#000000', fill: true },
    }).setResolution(res).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.tweens.add({
      targets: t, alpha: 1, y: GAME_HEIGHT / 2 - 85,
      ease: 'Cubic.Out', duration: 400,
      yoyo: true, hold: 1100,
      onComplete: () => t.destroy(),
    });
  }

  // ─── Enemy management ────────────────────────────────────────────────────────

  private doSpawnEnemy(type: Parameters<typeof spawnEnemy>[1]): void {
    const e = spawnEnemy(this, type, this.path, this.mapDef.enemyHpMult, this.mapDef.enemySpeedMult);
    e.setDepth(10);
    this.enemies.push(e);
  }

  private loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.cameras.main.shake(300, 0.009);
    this.emitUI();
    if (this.lives <= 0) this.triggerGameOver();
  }

  private sweepDeadEnemies(): void {
    for (const e of this.enemies) {
      if (!e.isDead && e.hp <= 0) this.killEnemy(e);
    }
  }

  private killEnemy(e: Enemy): void {
    if (e.isDead) return;
    this.gold        += e.def.reward;
    this.bonusPoints += e.def.bonusPoints;
    this.spawnDeathEffect(e.x, e.y, e.def.color, e.def.size, e.def.type);
    this.spawnFloatingText(e.x, e.y - 10, `+${e.def.reward}`, '#ffdd88');
    if (e.def.bonusPoints > 0) {
      this.spawnFloatingText(e.x, e.y - 28, `+${e.def.bonusPoints} Honour`, '#ddaaff');
    }
    e.die();
    this.emitUI();
  }

  // ─── Projectile hits ─────────────────────────────────────────────────────────

  private onProjectileHit(hit: HitResult, source: TowerType): void {
    const tower = this.towers.find(t => t.def.type === source && t.def.splashRadius > 0);
    if (tower && tower.def.splashRadius > 0) {
      tower.doSplash(hit.x, hit.y, this.enemies, this);
      for (const e of this.enemies) { if (!e.isDead && e.hp <= 0) this.killEnemy(e); }
    }
    if (!hit.enemy.isDead && hit.enemy.hp <= 0) this.killEnemy(hit.enemy);

    // Hit flash (colour depends on tower type)
    const tower2 = this.towers.find(t => t.def.type === source);
    if (tower2) {
      const flash = this.add.graphics().setDepth(18);
      flash.fillStyle(tower2.def.projColor, 0.7);
      flash.fillCircle(hit.x, hit.y, 8);
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 170, onComplete: () => flash.destroy() });
    }
  }

  // ─── Tower placement ─────────────────────────────────────────────────────────

  private cancelPlacement(): void {
    this.placingType = null;
    this.ghostG.clear();
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.placingType) { this.ghostG.clear(); return; }
    const { col, row } = this.grid.pixelToCell(pointer.x, pointer.y);
    const canAfford    = this.gold >= TOWERS[this.placingType].cost;
    const canPlace     = this.grid.isPlaceable(col, row) && canAfford;
    const { x, y }    = this.grid.cellToPixel(col, row);
    const def          = TOWERS[this.placingType];
    const color        = canPlace ? def.color : 0xff3300;

    this.ghostG.clear();
    this.ghostG.fillStyle(color, 0.18);
    this.ghostG.fillRect(x - CELL / 2, y - CELL / 2, CELL, CELL);
    this.ghostG.lineStyle(2, color, canPlace ? 0.6 : 0.35);
    this.ghostG.strokeRect(x - CELL / 2, y - CELL / 2, CELL, CELL);
    this.ghostG.fillStyle(color, 0.5);
    this.ghostG.fillCircle(x, y, 12);
    this.ghostG.lineStyle(1, color, 0.18);
    this.ghostG.strokeCircle(x, y, def.range);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.rightButtonDown()) return;

    const { col, row } = this.grid.pixelToCell(pointer.x, pointer.y);

    // Placement mode
    if (this.placingType) {
      if (!this.grid.isPlaceable(col, row)) return;
      const def = TOWERS[this.placingType];
      if (this.gold < def.cost) return;

      this.gold -= def.cost;
      this.grid.placeTower(col, row);

      const { x, y } = this.grid.cellToPixel(col, row);
      const tower = new Tower(this, x, y, def, col, row);
      tower.setDepth(8);
      this.towers.push(tower);
      this.recalcBoosts();
      this.emitUI();

      const flash = this.add.graphics().setDepth(25);
      flash.fillStyle(def.color, 0.4);
      flash.fillCircle(x, y, 30);
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 300, onComplete: () => flash.destroy() });
      return;
    }

    // Selection mode — check if clicking an existing tower
    const clicked = this.towers.find(t => t.col === col && t.row === row);
    if (clicked) {
      this.selectTower(clicked);
    } else {
      this.deselectTower();
    }
  }

  // ─── Tower selection & upgrade panel ────────────────────────────────────────

  private selectTower(tower: Tower): void {
    if (this.selectedTower === tower) { this.deselectTower(); return; }
    this.deselectTower();
    this.selectedTower = tower;
    tower.setRangeVisible(true);
    this.showUpgradePanel(tower);
  }

  private deselectTower(): void {
    if (this.selectedTower) {
      this.selectedTower.setRangeVisible(false);
      this.selectedTower = null;
    }
    this.hideUpgradePanel();
  }

  private hideUpgradePanel(): void {
    this.upgradePanel.forEach(o => o.destroy());
    this.upgradePanel = [];
  }

  private showUpgradePanel(tower: Tower): void {
    this.hideUpgradePanel();

    const res = Math.min(window.devicePixelRatio || 2, 3);
    const PW = 218, PH = 170;
    let px = tower.x - PW / 2;
    let py = tower.y - PH - 36;
    px = Phaser.Math.Clamp(px, 4, GAME_WIDTH - PW - 4);
    py = Phaser.Math.Clamp(py, 4, GAME_HEIGHT - PH - 100);

    const push = (go: Phaser.GameObjects.GameObject) => { this.upgradePanel.push(go); return go; };
    const txt = (x: number, y: number, t: string, style: Phaser.Types.GameObjects.Text.TextStyle) =>
      push(this.add.text(x, y, t, style).setResolution(res));

    const bg = push(this.add.graphics().setDepth(30)) as Phaser.GameObjects.Graphics;
    bg.fillStyle(0x0e0a04, 0.96);
    bg.fillRect(px, py, PW, PH);
    bg.lineStyle(2, 0x8b6940, 0.9);
    bg.strokeRect(px, py, PW, PH);
    bg.lineStyle(1, 0xddbb66, 0.25);
    bg.strokeRect(px + 3, py + 3, PW - 6, PH - 6);
    [[px, py], [px + PW, py], [px, py + PH], [px + PW, py + PH]].forEach(([cx, cy]) => {
      bg.fillStyle(0xddbb66, 0.4);
      bg.fillCircle(cx, cy, 4);
    });

    const cx = px + PW / 2;

    (txt(cx, py + 14, tower.def.name, {
      fontSize: '15px', fontFamily: 'Georgia, serif', color: '#ddbb66',
      stroke: '#000000', strokeThickness: 3,
    }) as Phaser.GameObjects.Text).setOrigin(0.5, 0).setDepth(31);

    const stars = '★'.repeat(tower.level) + '☆'.repeat(5 - tower.level);
    (txt(cx, py + 33, `Level ${tower.level}  ${stars}`, {
      fontSize: '13px', fontFamily: 'Georgia, serif',
      color: tower.level >= 5 ? '#ffee44' : tower.level >= 4 ? '#ddaa22' : '#aa8855',
    }) as Phaser.GameObjects.Text).setOrigin(0.5, 0).setDepth(31);

    const divG = push(this.add.graphics().setDepth(31)) as Phaser.GameObjects.Graphics;
    divG.lineStyle(1, 0x5a4020, 0.7);
    divG.lineBetween(px + 12, py + 54, px + PW - 12, py + 54);

    const dmg  = Math.round(tower.damage);
    const rng  = Math.round(tower.range);
    const rate = Math.round(tower.fireRate);
    (txt(px + 14,      py + 60, `DMG  ${dmg}`,      { fontSize: '12px', fontFamily: 'Courier New', color: '#cc6644' }) as Phaser.GameObjects.Text).setDepth(31);
    (txt(cx,           py + 60, `RNG  ${rng}`,      { fontSize: '12px', fontFamily: 'Courier New', color: '#4499cc' }) as Phaser.GameObjects.Text).setOrigin(0.5, 0).setDepth(31);
    (txt(px + PW - 14, py + 60, `RATE  ${rate}ms`,  { fontSize: '12px', fontFamily: 'Courier New', color: '#88cc44' }) as Phaser.GameObjects.Text).setOrigin(1, 0).setDepth(31);

    const divG2 = push(this.add.graphics().setDepth(31)) as Phaser.GameObjects.Graphics;
    divG2.lineStyle(1, 0x5a4020, 0.7);
    divG2.lineBetween(px + 12, py + 80, px + PW - 12, py + 80);

    if (tower.canUpgrade) {
      const nextDmg  = Math.round(tower.def.damage * [1,1.35,1.80,2.35,3.00][tower.level] * tower.boostMult);
      (txt(cx, py + 88, `→ Level ${tower.level + 1}:  DMG ${nextDmg}`, {
        fontSize: '12px', fontFamily: 'Courier New', color: '#aaddcc',
      }) as Phaser.GameObjects.Text).setOrigin(0.5, 0).setDepth(31);

      const cost = tower.nextUpgradeCost;
      const canAfford = this.gold >= cost;
      (txt(cx, py + 104, `Cost: ${cost} Gold`, {
        fontSize: '13px', fontFamily: 'Georgia, serif',
        color: canAfford ? '#ddbb66' : '#774422',
      }) as Phaser.GameObjects.Text).setOrigin(0.5, 0).setDepth(31);

      const btnW = 140, btnH = 34;
      const btnX = cx - btnW / 2;
      const btnY = py + PH - btnH - 10;

      const btnBg = push(this.add.graphics().setDepth(31)) as Phaser.GameObjects.Graphics;
      this.drawUpgradeBtn(btnBg, btnX, btnY, btnW, btnH, canAfford, false);

      const btnLabel = txt(cx, btnY + btnH / 2, 'UPGRADE', {
        fontSize: '16px', fontFamily: 'Georgia, serif',
        color: canAfford ? '#ddbb66' : '#554433',
        stroke: '#000000', strokeThickness: 3,
      }) as Phaser.GameObjects.Text;
      (btnLabel as Phaser.GameObjects.Text).setOrigin(0.5).setDepth(32);

      if (canAfford) {
        const zone = push(this.add.zone(cx, btnY + btnH / 2, btnW, btnH).setDepth(32).setInteractive({ useHandCursor: true }));
        (zone as Phaser.GameObjects.Zone).on('pointerover', () => {
          this.drawUpgradeBtn(btnBg, btnX, btnY, btnW, btnH, true, true);
          (btnLabel as Phaser.GameObjects.Text).setColor('#ffffff');
        });
        (zone as Phaser.GameObjects.Zone).on('pointerout', () => {
          this.drawUpgradeBtn(btnBg, btnX, btnY, btnW, btnH, true, false);
          (btnLabel as Phaser.GameObjects.Text).setColor('#ddbb66');
        });
        (zone as Phaser.GameObjects.Zone).on('pointerdown', () => this.purchaseUpgrade(tower));
      }
    } else {
      (txt(cx, py + 94, '— MAXIMUM LEVEL —', {
        fontSize: '14px', fontFamily: 'Georgia, serif', color: '#ffee44',
        stroke: '#000000', strokeThickness: 3,
      }) as Phaser.GameObjects.Text).setOrigin(0.5, 0).setDepth(31);
      (txt(cx, py + 116, 'This soldier fights at full power', {
        fontSize: '12px', fontFamily: 'Georgia, serif', color: '#6a5040', fontStyle: 'italic',
      }) as Phaser.GameObjects.Text).setOrigin(0.5, 0).setDepth(31);
    }
  }

  private drawUpgradeBtn(
    g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
    canAfford: boolean, hover: boolean,
  ): void {
    g.clear();
    g.fillStyle(hover ? 0x3a2810 : 0x1e1208, hover ? 0.95 : 0.85);
    g.fillRect(x, y, w, h);
    g.lineStyle(hover ? 2 : 1, canAfford ? (hover ? 0xffdd88 : 0x8b6940) : 0x443322, canAfford ? 0.9 : 0.4);
    g.strokeRect(x, y, w, h);
  }

  private purchaseUpgrade(tower: Tower): void {
    const cost = tower.nextUpgradeCost;
    if (this.gold < cost || !tower.canUpgrade) return;
    this.gold -= cost;
    tower.upgrade();
    this.recalcBoosts();
    this.emitUI();

    // Visual flash on the tower
    const flash = this.add.graphics().setDepth(25);
    flash.fillStyle(tower.def.color, 0.6);
    flash.fillCircle(tower.x, tower.y, 40);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 400, onComplete: () => flash.destroy() });

    this.spawnFloatingText(tower.x, tower.y - 30, `Level ${tower.level}!`, '#ffee44');

    // Refresh the panel with updated stats
    this.showUpgradePanel(tower);
  }

  private recalcBoosts(): void {
    for (const t of this.towers) t.boostMult = 1;
    for (const booster of this.towers.filter(t => t.def.type === 'booster')) {
      for (const t of this.towers) {
        if (t === booster) continue;
        if (Phaser.Math.Distance.Between(booster.x, booster.y, t.x, t.y) <= booster.range) {
          t.boostMult = Math.max(t.boostMult, 1 + booster.def.boostMult);
        }
      }
    }
  }

  // ─── Effects ─────────────────────────────────────────────────────────────────

  private spawnDeathEffect(x: number, y: number, color: number, size: number, type: string): void {
    // Expanding ring
    const ring = this.add.graphics().setDepth(18);
    ring.lineStyle(3, color, 0.85);
    ring.strokeCircle(x, y, size * 0.8);
    this.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 450, onComplete: () => ring.destroy() });

    // Appropriate particle colour
    const particleTex = type === 'red' || type === 'purple' ? 'fire_particle' : 'particle';

    try {
      const em = this.add.particles(x, y, particleTex, {
        speed:    { min: 50, max: 200 },
        angle:    { min: 0, max: 360 },
        scale:    { start: 0.9, end: 0 },
        alpha:    { start: 1, end: 0 },
        lifespan: 550,
        gravityY: 90,
        tint:     color,
        emitting: false,
      }).setDepth(18);
      em.explode(18, x, y);
      this.time.delayedCall(750, () => { if (em.active) em.destroy(); });
    } catch (_) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const dot = this.add.graphics().setDepth(18).setPosition(x, y);
        dot.fillStyle(color, 1);
        dot.fillCircle(0, 0, 3);
        this.tweens.add({ targets: dot, x: x + Math.cos(a) * 55, y: y + Math.sin(a) * 55 + 20, alpha: 0, duration: 500, onComplete: () => dot.destroy() });
      }
    }

    // Dark smoke puff
    const smoke = this.add.graphics().setDepth(17);
    smoke.fillStyle(0x221100, 0.5);
    smoke.fillCircle(x, y, size * 1.5);
    this.tweens.add({ targets: smoke, scaleX: 2.5, scaleY: 2.5, alpha: 0, y: y - 20, duration: 700, onComplete: () => smoke.destroy() });
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string): void {
    const res = Math.min(window.devicePixelRatio || 2, 3);
    const t = this.add.text(x, y, text, {
      fontSize: '16px', fontFamily: 'Georgia, serif', color,
      stroke: '#000000', strokeThickness: 3,
    }).setResolution(res).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t, y: y - 44, alpha: 0, duration: 900, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  // ─── Game over ───────────────────────────────────────────────────────────────

  private triggerGameOver(): void {
    this.state = 'gameover';
    this.cameras.main.shake(700, 0.015);
    this.scene.get('UIScene').events.emit('gameOver', this.waves.currentWave);
  }

  // ─── World drawing ───────────────────────────────────────────────────────────

  private drawMapBackground(): void {
    const bg = this.add.graphics().setDepth(0);
    const colors: Record<string, number> = {
      shire:      0x2a4a2a,  // Dark green
      moria:      0x1a2a3a,  // Dark blue
      mordor:     0x3a1a1a,  // Dark red
      lothlorien: 0x1a3a1a,  // Dark moss green
      helmsdeep:  0x2a2a2a,  // Dark gray
      pathdead:   0x2a1a3a,  // Dark purple
    };
    const bgColor = colors[this.mapDef.id] || 0x1a1a1a;
    bg.fillStyle(bgColor, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }


  private drawPath(): void {
    const g = this.add.graphics().setDepth(2);
    const wp = this.mapDef.path;
    const hw = CELL;

    for (let i = 0; i < wp.length - 1; i++) {
      const a = wp[i];
      const b = wp[i + 1];
      const x1 = Math.min(a.x, b.x) - hw;
      const y1 = Math.min(a.y, b.y) - hw;
      const w = Math.abs(b.x - a.x) + hw * 2;
      const h = Math.abs(b.y - a.y) + hw * 2;

      // Simple shadow
      g.fillStyle(0x000000, 0.2);
      g.fillRect(x1 - 2, y1 - 2, w + 4, h + 4);

      // Base tan color
      g.fillStyle(0x8b6f47, 1);
      g.fillRect(x1, y1, w, h);

      // Subtle texture dots
      const dotCount = Math.max(2, Math.floor((w * h) / 2000));
      for (let p = 0; p < dotCount; p++) {
        g.fillStyle(0x6a5230, 0.15);
        g.fillCircle(
          x1 + 8 + Math.random() * (w - 16),
          y1 + 8 + Math.random() * (h - 16),
          2 + Math.random() * 4,
        );
      }

      // Subtle border
      g.lineStyle(1, 0x5a4030, 0.3);
      g.strokeRect(x1, y1, w, h);
    }
  }

  private drawGrid(): void {
    const g = this.add.graphics().setDepth(2.5);
    g.lineStyle(1, 0xffffff, 0.08);
    for (let c = 0; c <= COLS; c++) g.lineBetween(c * CELL, 0, c * CELL, GAME_HEIGHT);
    for (let r = 0; r <= ROWS; r++) g.lineBetween(0, r * CELL, GAME_WIDTH, r * CELL);
  }

  // ─── UI sync ─────────────────────────────────────────────────────────────────

  private emitUI(): void {
    this.scene.get('UIScene').events.emit('stateUpdate', {
      gold:        this.gold,
      lives:       this.lives,
      bonusPoints: this.bonusPoints,
      wave:        this.waves.currentWave,
      state:       this.state,
    });
  }
}
