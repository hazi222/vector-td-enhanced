import Phaser from 'phaser';
import {
  CELL, COLS, GAME_HEIGHT, GAME_WIDTH,
  PATH_PX, ROWS, STARTING_GOLD, STARTING_LIVES, TOWERS, TowerType,
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

  private gold:        number = STARTING_GOLD;
  private lives:       number = STARTING_LIVES;
  private bonusPoints: number = 0;

  private placingType: TowerType | null = null;
  private ghostG!:     Phaser.GameObjects.Graphics;

  private state: GameState = 'prep';

  constructor() { super('GameScene'); }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  create(): void {
    // Particle texture (white circle – created off-screen then destroyed)
    const pg = this.add.graphics();
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(4, 4, 4);
    pg.generateTexture('particle', 8, 8);
    pg.destroy();

    // Build Phaser Path
    this.path = new Phaser.Curves.Path(PATH_PX[0].x, PATH_PX[0].y);
    for (let i = 1; i < PATH_PX.length; i++) this.path.lineTo(PATH_PX[i].x, PATH_PX[i].y);

    this.grid  = new GridSystem();
    this.waves = new WaveSystem(
      this,
      type => this.doSpawnEnemy(type),
      ()   => { /* wait for enemies to clear */ },
    );

    this.drawBackground();
    this.drawPath();
    this.drawGrid();

    this.ghostG = this.add.graphics().setDepth(20);

    // Camera post-processing (WebGL only)
    try {
      this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 0.18, 1, 10);
      this.cameras.main.postFX.addVignette(0.5, 0.5, 0.85, 0.35);
    } catch (_) { /* canvas fallback – no bloom */ }

    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.cancelPlacement();
      else this.onPointerDown(p);
    });

    // Events from UIScene
    this.events.on('selectTower',     (t: TowerType) => { this.placingType = t; });
    this.events.on('cancelPlacement', ()             => this.cancelPlacement());
    this.events.on('startWave',       ()             => { if (this.state === 'prep') this.startNextWave(); });

    this.scene.launch('UIScene');

    // Auto-start first wave
    this.time.delayedCall(1800, () => { if (this.state === 'prep') this.startNextWave(); });

    this.emitUI();
  }

  update(_t: number, delta: number): void {
    if (this.state === 'gameover') return;

    this.waves.update(delta);

    // Update enemies
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

    // Towers fire
    for (const tower of this.towers) {
      const proj = tower.tryFire(this.time.now, this.enemies, this);
      if (proj) {
        proj.setDepth(15);
        this.projectiles.push(proj);

        // After laser fires, check kills (damage already applied inside tryFire)
        if (tower.def.type === 'laser') this.sweepDeadEnemies();
      }
    }

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.isDead) { this.projectiles.splice(i, 1); continue; }

      const hit = proj.update(delta);
      if (hit) {
        this.onProjectileHit(hit, proj.source);
        this.projectiles.splice(i, 1);
      }
    }

    // Check wave cleared
    if (this.state === 'wave' && !this.waves.isSpawning && this.enemies.length === 0) {
      this.onWaveCleared();
    }
  }

  // ─── Wave management ─────────────────────────────────────────────────────────

  private startNextWave(): void {
    this.state = 'wave';

    // Interest
    const interest = Math.floor(this.gold * 0.05);
    if (interest > 0) {
      this.gold += interest;
      this.spawnFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, `+${interest} INTEREST`, '#ffdd44');
    }

    this.waves.startWave();
    this.cameras.main.shake(180, 0.004);
    this.showBanner(`WAVE ${this.waves.currentWave}`);
    this.emitUI();
  }

  private onWaveCleared(): void {
    this.state = 'prep';
    this.showBanner('WAVE CLEAR!', '#00ffcc');
    this.emitUI();
    this.time.delayedCall(3500, () => { if (this.state === 'prep') this.startNextWave(); });
  }

  private showBanner(text: string, color = '#00ff88'): void {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, text, {
      fontSize: '46px', fontFamily: 'Courier New', color,
      stroke: '#001a00', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.tweens.add({
      targets: t, alpha: 1, y: GAME_HEIGHT / 2 - 90,
      ease: 'Cubic.Out', duration: 350,
      yoyo: true, hold: 900,
      onComplete: () => t.destroy(),
    });
  }

  // ─── Enemy management ────────────────────────────────────────────────────────

  private doSpawnEnemy(type: Parameters<typeof spawnEnemy>[1]): void {
    const e = spawnEnemy(this, type, this.path);
    e.setDepth(10);
    this.enemies.push(e);
  }

  private loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.cameras.main.shake(280, 0.008);
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
    this.spawnDeathEffect(e.x, e.y, e.def.color, e.def.size);
    this.spawnFloatingText(e.x, e.y - 10, `+${e.def.reward}`, '#ffff44');
    if (e.def.bonusPoints > 0) {
      this.spawnFloatingText(e.x, e.y - 28, `+${e.def.bonusPoints} BP`, '#ff88ff');
    }
    e.die();
    this.emitUI();
  }

  // ─── Projectile hits ─────────────────────────────────────────────────────────

  private onProjectileHit(hit: HitResult, source: TowerType): void {
    // Find tower that fired (to get splash radius)
    const tower = this.towers.find(t => t.def.type === source && t.def.splashRadius > 0);

    if (tower && tower.def.splashRadius > 0) {
      // Splash – hit.enemy already took primary damage in Projectile.update
      const splashHit = tower.doSplash(hit.x, hit.y, this.enemies, this);
      for (const e of splashHit) { if (!e.isDead && e.hp <= 0) this.killEnemy(e); }
    }

    // Check primary target
    if (!hit.enemy.isDead && hit.enemy.hp <= 0) this.killEnemy(hit.enemy);

    // Hit flash
    const tower2 = this.towers.find(t => t.def.type === source);
    if (tower2) {
      const flash = this.add.graphics().setDepth(18);
      flash.fillStyle(tower2.def.projColor, 0.7);
      flash.fillCircle(hit.x, hit.y, 7);
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 160, onComplete: () => flash.destroy() });
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
    const color        = canPlace ? def.color : 0xff2222;
    const alpha        = canPlace ? 0.55 : 0.28;

    this.ghostG.clear();
    this.ghostG.fillStyle(color, alpha * 0.2);
    this.ghostG.fillRect(x - CELL / 2, y - CELL / 2, CELL, CELL);
    this.ghostG.lineStyle(2, color, alpha);
    this.ghostG.strokeRect(x - CELL / 2, y - CELL / 2, CELL, CELL);
    this.ghostG.fillStyle(color, alpha * 0.7);
    this.ghostG.fillCircle(x, y, 13);
    // Range ring
    this.ghostG.lineStyle(1, color, 0.2);
    this.ghostG.strokeCircle(x, y, def.range);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.placingType || pointer.rightButtonDown()) return;

    const { col, row } = this.grid.pixelToCell(pointer.x, pointer.y);
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

    // Placement flash
    const flash = this.add.graphics().setDepth(25);
    flash.fillStyle(def.color, 0.5);
    flash.fillCircle(x, y, 28);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 2.2, scaleY: 2.2, duration: 280, onComplete: () => flash.destroy() });
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

  private spawnDeathEffect(x: number, y: number, color: number, size: number): void {
    // Expanding ring
    const ring = this.add.graphics().setDepth(18);
    ring.lineStyle(2, color, 0.9);
    ring.strokeCircle(x, y, size);
    this.tweens.add({ targets: ring, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 380, onComplete: () => ring.destroy() });

    // Particle burst
    try {
      const em = this.add.particles(x, y, 'particle', {
        speed:    { min: 55, max: 210 },
        angle:    { min: 0, max: 360 },
        scale:    { start: 0.85, end: 0 },
        alpha:    { start: 1, end: 0 },
        lifespan: 480,
        gravityY: 70,
        tint:     color,
        emitting: false,
      }).setDepth(18);
      em.explode(14, x, y);
      this.time.delayedCall(650, () => { if (em.active) em.destroy(); });
    } catch (_) {
      // Fallback: manual dots
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const dot = this.add.graphics().setDepth(18).setPosition(x, y);
        dot.fillStyle(color, 1);
        dot.fillCircle(0, 0, 3);
        this.tweens.add({ targets: dot, x: x + Math.cos(a) * 55, y: y + Math.sin(a) * 55, alpha: 0, duration: 420, onComplete: () => dot.destroy() });
      }
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, {
      fontSize: '13px', fontFamily: 'Courier New', color,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t, y: y - 42, alpha: 0, duration: 850, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  // ─── Game over ───────────────────────────────────────────────────────────────

  private triggerGameOver(): void {
    this.state = 'gameover';
    this.cameras.main.shake(600, 0.015);
    this.scene.get('UIScene').events.emit('gameOver', this.waves.currentWave);
  }

  // ─── World drawing ───────────────────────────────────────────────────────────

  private drawBackground(): void {
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x050510, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Stars
    for (let i = 0; i < 90; i++) {
      bg.fillStyle(0xffffff, Math.random() * 0.3 + 0.05);
      bg.fillCircle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Math.random() < 0.7 ? 0.5 : 1,
      );
    }
  }

  private drawPath(): void {
    const g  = this.add.graphics().setDepth(1);
    const wp = PATH_PX;
    const hw = CELL + 1;

    for (let i = 0; i < wp.length - 1; i++) {
      const a = wp[i];
      const b = wp[i + 1];
      const x1 = Math.min(a.x, b.x) - hw;
      const y1 = Math.min(a.y, b.y) - hw;
      const w  = Math.abs(b.x - a.x) + hw * 2;
      const h  = Math.abs(b.y - a.y) + hw * 2;

      // Glow halo
      g.fillStyle(0x00ff44, 0.04);
      g.fillRect(x1 - 5, y1 - 5, w + 10, h + 10);
      // Surface
      g.fillStyle(0x060e06, 1);
      g.fillRect(x1, y1, w, h);
      // Edges
      g.lineStyle(1, 0x00bb33, 0.35);
      g.strokeRect(x1, y1, w, h);
    }

    // Entry arrow
    const ew = wp[1].x - hw;
    g.fillStyle(0x00ff44, 0.75);
    g.fillTriangle(ew - 12, wp[0].y - 8, ew - 12, wp[0].y + 8, ew, wp[0].y);

    // Exit X
    const ex = wp[wp.length - 2].x + hw + 6;
    const ey = wp[wp.length - 1].y;
    g.lineStyle(3, 0xff3333, 0.8);
    g.lineBetween(ex - 7, ey - 7, ex + 7, ey + 7);
    g.lineBetween(ex + 7, ey - 7, ex - 7, ey + 7);
  }

  private drawGrid(): void {
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(1, 0x0d0d2a, 0.45);
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
