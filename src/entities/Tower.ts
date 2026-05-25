import Phaser from 'phaser';
import { TowerDef, TowerType } from '../GameConfig';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

export class Tower extends Phaser.GameObjects.Container {
  readonly def: TowerDef;

  private bodyG:   Phaser.GameObjects.Graphics;
  private barrelG: Phaser.GameObjects.Graphics;
  private rangeG:  Phaser.GameObjects.Graphics;

  lastFired:  number = 0;
  boostMult:  number = 1;
  col:        number;
  row:        number;

  get range()    { return this.def.range; }
  get damage()   { return this.def.damage * this.boostMult; }
  get fireRate() { return this.def.fireRate; }

  constructor(scene: Phaser.Scene, x: number, y: number, def: TowerDef, col: number, row: number) {
    super(scene, x, y);
    this.def = def;
    this.col = col;
    this.row = row;

    this.rangeG  = scene.add.graphics();
    this.bodyG   = scene.add.graphics();
    this.barrelG = scene.add.graphics();

    this.add([this.bodyG, this.barrelG]);
    (scene.add as Phaser.GameObjects.GameObjectFactory).existing(this as unknown as Phaser.GameObjects.GameObject);

    this.drawBody();
    this.setRangeVisible(false);
  }

  // ─── Drawing ────────────────────────────────────────────────────────────────

  private drawBody(): void {
    const g     = this.bodyG;
    const color = this.def.color;
    const s     = 17;
    g.clear();

    for (let i = 3; i >= 1; i--) {
      g.fillStyle(color, 0.04 * i);
      g.fillCircle(0, 0, s + i * 6);
    }
    g.fillStyle(0x070718, 1);
    g.fillCircle(0, 0, s);
    g.lineStyle(2, color, 0.9);
    g.strokeCircle(0, 0, s);

    switch (this.def.type) {
      case 'laser':
        g.lineStyle(1, color, 0.5);
        g.strokeCircle(0, 0, s * 0.6);
        g.fillStyle(color, 0.85);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          g.fillCircle(Math.cos(a) * 7, Math.sin(a) * 7, 2.5);
        }
        break;
      case 'rocket':
        g.fillStyle(color, 0.55);
        ngonFill(g, 0, 0, s * 0.55, 4, Math.PI / 4);
        g.lineStyle(1, color, 0.8);
        ngonStroke(g, 0, 0, s * 0.55, 4, Math.PI / 4);
        break;
      case 'slow':
        for (let r = 0.35; r <= 0.8; r += 0.22) {
          g.lineStyle(1, color, r * 0.9);
          g.strokeCircle(0, 0, s * r);
        }
        g.fillStyle(color, 0.9);
        g.fillCircle(0, 0, 4);
        break;
      case 'booster':
        ngonFill(g, 0, 0, s * 0.58, 4, 0);
        g.lineStyle(2, color, 0.9);
        ngonStroke(g, 0, 0, s * 0.58, 4, 0);
        g.lineStyle(1, color, 0.4);
        ngonStroke(g, 0, 0, s * 0.88, 4, Math.PI / 4);
        break;
    }

    if (this.def.type !== 'booster') {
      this.barrelG.clear();
      this.barrelG.fillStyle(color, 0.9);
      this.barrelG.fillRect(-2, -s * 0.95, 4, s * 0.6);
    }
  }

  setRangeVisible(on: boolean): void {
    this.rangeG.setVisible(on);
    if (on) {
      this.rangeG.clear();
      this.rangeG.lineStyle(1, this.def.color, 0.25);
      this.rangeG.strokeCircle(this.x, this.y, this.range);
      this.rangeG.fillStyle(this.def.color, 0.04);
      this.rangeG.fillCircle(this.x, this.y, this.range);
    }
  }

  // ─── Combat ─────────────────────────────────────────────────────────────────

  tryFire(time: number, enemies: Enemy[], scene: Phaser.Scene): Projectile | null {
    if (this.def.type === 'booster' || this.def.fireRate === 0) return null;
    if (time - this.lastFired < this.def.fireRate) return null;

    const target = this.pickTarget(enemies);
    if (!target) return null;

    const angle = Math.atan2(target.y - this.y, target.x - this.x) + Math.PI / 2;
    this.barrelG.setRotation(angle);
    this.lastFired = time;

    if (this.def.type === 'laser') {
      target.takeDamage(this.damage, 'laser');
      this.flashBeam(target, scene);
      return null;
    }

    return new Projectile(
      scene, this.x, this.y, target,
      this.def.projSpeed, this.damage, this.def.type,
      this.def.projColor, this.def.slowFactor, this.def.slowDuration,
    );
  }

  private flashBeam(target: Enemy, scene: Phaser.Scene): void {
    const color = this.def.projColor;
    const beam  = scene.add.graphics().setDepth(18);
    beam.lineStyle(5, color, 0.4);
    beam.lineBetween(this.x, this.y, target.x, target.y);
    beam.lineStyle(2, 0xffffff, 0.8);
    beam.lineBetween(this.x, this.y, target.x, target.y);
    scene.tweens.add({ targets: beam, alpha: 0, duration: 160, onComplete: () => beam.destroy() });

    const flash = scene.add.graphics().setDepth(18);
    flash.fillStyle(color, 0.7);
    flash.fillCircle(this.x, this.y, 9);
    scene.tweens.add({ targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 140, onComplete: () => flash.destroy() });
  }

  doSplash(px: number, py: number, enemies: Enemy[], scene: Phaser.Scene): Enemy[] {
    const r   = this.def.splashRadius;
    const hit: Enemy[] = [];
    for (const e of enemies) {
      if (e.isDead) continue;
      if (Phaser.Math.Distance.Between(px, py, e.x, e.y) <= r) {
        e.takeDamage(this.damage, this.def.type);
        hit.push(e);
      }
    }
    const ring = scene.add.graphics().setDepth(18);
    ring.lineStyle(2, this.def.projColor, 0.85);
    ring.strokeCircle(px, py, 6);
    scene.tweens.add({
      targets: ring, scaleX: r / 6, scaleY: r / 6, alpha: 0, duration: 340,
      onComplete: () => ring.destroy(),
    });
    return hit;
  }

  private pickTarget(enemies: Enemy[]): Enemy | null {
    const inRange = enemies.filter(e =>
      !e.isDead && Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) <= this.range
    );
    if (!inRange.length) return null;
    return inRange.reduce((a, b) => a.pathT > b.pathT ? a : b);
  }

  get towerType(): TowerType { return this.def.type; }
}

// ─── Polygon helpers ──────────────────────────────────────────────────────────
function ngonPts(cx: number, cy: number, r: number, n: number, o: number): Phaser.Geom.Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = o + (i / n) * Math.PI * 2;
    return new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  });
}
function ngonFill(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, n: number, o: number) {
  g.fillPoints(ngonPts(cx, cy, r, n, o), true);
}
function ngonStroke(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, n: number, o: number) {
  g.strokePoints(ngonPts(cx, cy, r, n, o), true);
}
