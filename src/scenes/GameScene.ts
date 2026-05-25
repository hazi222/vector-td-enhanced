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
    this.drawMountains();

    this.ghostG = this.add.graphics().setDepth(20);

    // Camera post-processing
    try {
      this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 0.12, 1, 8);
      this.cameras.main.postFX.addVignette(0.5, 0.5, 0.82, 0.5);
    } catch (_) { /* canvas fallback */ }

    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.cancelPlacement();
      else this.onPointerDown(p);
    });

    this.events.on('selectTower',     (t: TowerType) => { this.placingType = t; });
    this.events.on('cancelPlacement', ()             => this.cancelPlacement());
    this.events.on('startWave',       ()             => { if (this.state === 'prep') this.startNextWave(); });

    this.scene.launch('UIScene');
    this.time.delayedCall(1800, () => { if (this.state === 'prep') this.startNextWave(); });
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
      // Sweep kills after laser fires
      if (tower.def.type === 'laser') this.sweepDeadEnemies();
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
    this.state = 'prep';
    this.showBanner('The Enemy is Repelled!', '#aaddcc');
    this.emitUI();
    this.time.delayedCall(3500, () => { if (this.state === 'prep') this.startNextWave(); });
  }

  private showBanner(text: string, color = '#ddcc88'): void {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, text, {
      fontSize: '36px', fontFamily: 'Georgia, serif', color,
      stroke: '#111100', strokeThickness: 6, shadow: { blur: 12, color: '#000000', fill: true },
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.tweens.add({
      targets: t, alpha: 1, y: GAME_HEIGHT / 2 - 85,
      ease: 'Cubic.Out', duration: 400,
      yoyo: true, hold: 1100,
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

    const flash = this.add.graphics().setDepth(25);
    flash.fillStyle(def.color, 0.4);
    flash.fillCircle(x, y, 30);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 300, onComplete: () => flash.destroy() });
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
    const t = this.add.text(x, y, text, {
      fontSize: '13px', fontFamily: 'Georgia, serif', color,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t, y: y - 44, alpha: 0, duration: 900, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  // ─── Game over ───────────────────────────────────────────────────────────────

  private triggerGameOver(): void {
    this.state = 'gameover';
    this.cameras.main.shake(700, 0.015);
    this.scene.get('UIScene').events.emit('gameOver', this.waves.currentWave);
  }

  // ─── World drawing ───────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(0);

    // Deep Mordor sky – near-black with red-brown tint
    g.fillStyle(0x0a0406, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Mordor fire glow on horizon (bottom third)
    for (let i = 0; i < 6; i++) {
      const a = 0.04 - i * 0.006;
      const y = GAME_HEIGHT - i * 35;
      g.fillStyle(0xff4400, a);
      g.fillRect(0, y, GAME_WIDTH, 40);
    }

    // Central upper glow – Eye of Sauron ambient light
    g.fillStyle(0xcc2200, 0.06);
    g.fillCircle(GAME_WIDTH / 2, 80, 280);
    g.fillStyle(0xff4400, 0.04);
    g.fillCircle(GAME_WIDTH / 2, 80, 180);

    // Smoke/ash streaks across sky
    g.lineStyle(1, 0x221100, 0.3);
    for (let s = 0; s < 12; s++) {
      const sy  = Phaser.Math.Between(30, GAME_HEIGHT - 120);
      const sx1 = Phaser.Math.Between(0, GAME_WIDTH / 2);
      const sx2 = sx1 + Phaser.Math.Between(80, 260);
      g.lineBetween(sx1, sy, sx2, sy + Phaser.Math.Between(-8, 8));
    }

    // Sparse ember/spark dots drifting upward (static)
    for (let e = 0; e < 40; e++) {
      const ex = Phaser.Math.Between(0, GAME_WIDTH);
      const ey = Phaser.Math.Between(GAME_HEIGHT / 2, GAME_HEIGHT);
      const ea = Math.random() * 0.5 + 0.1;
      g.fillStyle(0xff6600, ea);
      g.fillCircle(ex, ey, Math.random() < 0.3 ? 1.5 : 0.8);
    }

    // A few faint stars barely visible through the smoke
    for (let st = 0; st < 20; st++) {
      g.fillStyle(0xffffee, Math.random() * 0.08 + 0.02);
      g.fillCircle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT / 3), 0.8);
    }
  }

  private drawMountains(): void {
    const g = this.add.graphics().setDepth(1);

    // Far distant mountains (darkest, Mordor range)
    const farMtns = [
      [0, 480], [120, 360], [240, 420], [380, 300], [520, 380],
      [650, 320], [760, 400], [900, 340], [1040, 380], [1160, 310], [1280, 400], [1280, 500],
    ];
    g.fillStyle(0x160a08, 1);
    g.fillPoints(farMtns.map(([x, y]) => ({ x, y })), true);

    // Nearer rocky ridges
    const nearMtns = [
      [0, 540], [80, 490], [180, 510], [280, 470], [360, 500],
      [460, 460], [560, 490], [700, 455], [820, 485], [940, 460],
      [1060, 490], [1180, 462], [1280, 480], [1280, 540],
    ];
    g.fillStyle(0x1e1008, 1);
    g.fillPoints(nearMtns.map(([x, y]) => ({ x, y })), true);

    // Lava/fire cracks in distant mountains (glowing orange lines)
    g.lineStyle(1, 0xff4400, 0.25);
    g.lineBetween(380, 300, 400, 340);
    g.lineBetween(380, 300, 360, 340);
    g.lineBetween(650, 320, 660, 350);
    g.lineBetween(1160, 310, 1150, 350);
  }

  private drawPath(): void {
    const g  = this.add.graphics().setDepth(2);
    const wp = PATH_PX;
    const hw = CELL + 2;

    for (let i = 0; i < wp.length - 1; i++) {
      const a  = wp[i];
      const b  = wp[i + 1];
      const x1 = Math.min(a.x, b.x) - hw;
      const y1 = Math.min(a.y, b.y) - hw;
      const w  = Math.abs(b.x - a.x) + hw * 2;
      const h  = Math.abs(b.y - a.y) + hw * 2;
      const isH = Math.abs(b.y - a.y) < 1;

      // Warm ground glow beneath road
      g.fillStyle(0x662200, 0.12);
      g.fillRect(x1 - 4, y1 - 4, w + 8, h + 8);

      // Road base – dark Mordor earth
      g.fillStyle(0x1e1208, 1);
      g.fillRect(x1, y1, w, h);

      // Stone paving tiles
      const tileSize = CELL * 0.85;
      if (isH) {
        for (let tx = x1 + 4; tx < x1 + w - 4; tx += tileSize) {
          const tw = Math.min(tileSize - 3, x1 + w - 4 - tx);
          if (tw < 4) break;
          g.fillStyle(0x2e1f12, 1);
          g.fillRect(tx, y1 + 4, tw, h - 8);
          g.lineStyle(1, 0x3d2a18, 0.6);
          g.strokeRect(tx, y1 + 4, tw, h - 8);
        }
      } else {
        for (let ty = y1 + 4; ty < y1 + h - 4; ty += tileSize) {
          const th = Math.min(tileSize - 3, y1 + h - 4 - ty);
          if (th < 4) break;
          g.fillStyle(0x2e1f12, 1);
          g.fillRect(x1 + 4, ty, w - 8, th);
          g.lineStyle(1, 0x3d2a18, 0.6);
          g.strokeRect(x1 + 4, ty, w - 8, th);
        }
      }

      // Road edge walls (rough stone border)
      g.lineStyle(3, 0x4a3020, 0.9);
      g.strokeRect(x1, y1, w, h);
      g.lineStyle(1, 0x664422, 0.4);
      g.strokeRect(x1 + 2, y1 + 2, w - 4, h - 4);
    }

    // Torches at each turning corner
    for (let i = 1; i < wp.length - 1; i++) {
      const pt = wp[i];
      this.drawTorch(g, pt.x - CELL - 4, pt.y);
      this.drawTorch(g, pt.x + CELL + 4, pt.y);
    }

    // Entry gate marker
    g.fillStyle(0x664422, 0.8);
    g.fillRect(wp[1].x - hw - 8, wp[0].y - 12, 8, 24);
    g.fillStyle(0xff8800, 0.7);
    g.fillTriangle(wp[1].x - hw, wp[0].y - 8, wp[1].x - hw, wp[0].y + 8, wp[1].x - hw + 12, wp[0].y);

    // Exit – red warning cross
    const ex = wp[wp.length - 2].x + hw + 8;
    const ey = wp[wp.length - 1].y;
    g.lineStyle(3, 0xff2200, 0.9);
    g.lineBetween(ex - 8, ey - 8, ex + 8, ey + 8);
    g.lineBetween(ex + 8, ey - 8, ex - 8, ey + 8);
    g.lineStyle(1, 0xff4400, 0.5);
    g.strokeCircle(ex, ey, 14);
  }

  private drawTorch(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // Torch pole
    g.fillStyle(0x554433, 1);
    g.fillRect(x - 2, y - 18, 4, 20);
    // Flame
    g.fillStyle(0xff8800, 0.9);
    g.fillTriangle(x - 5, y - 18, x + 5, y - 18, x, y - 30);
    g.fillStyle(0xffcc00, 0.7);
    g.fillTriangle(x - 3, y - 18, x + 3, y - 18, x, y - 26);
    // Warm glow aura
    g.fillStyle(0xff6600, 0.12);
    g.fillCircle(x, y - 22, 22);
  }

  private drawGrid(): void {
    const g = this.add.graphics().setDepth(3);
    g.lineStyle(1, 0x1a1008, 0.4);
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
