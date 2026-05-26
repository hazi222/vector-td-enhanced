import Phaser from 'phaser';
import { TowerDef, TowerType } from '../GameConfig';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

// Stat multipliers per level (index = level - 1)
const DMG_MULT   = [1.00, 1.35, 1.80, 2.35, 3.00];
const RNG_MULT   = [1.00, 1.10, 1.20, 1.32, 1.45];
const RATE_MULT  = [1.00, 0.90, 0.80, 0.70, 0.62]; // lower = fires faster

export function upgradeCost(def: TowerDef, level: number): number {
  // Cost to go from `level` → level+1
  return Math.floor(def.cost * 0.5 * level);
}

export class Tower extends Phaser.GameObjects.Container {
  readonly def: TowerDef;

  private bodyG:   Phaser.GameObjects.Graphics;
  private pipsG:   Phaser.GameObjects.Graphics;
  private rangeG:  Phaser.GameObjects.Graphics;

  level:      number = 1;
  lastFired:  number = 0;
  boostMult:  number = 1;
  col:        number;
  row:        number;

  get range()        { return this.def.range    * RNG_MULT[this.level - 1]; }
  get damage()       { return this.def.damage   * DMG_MULT[this.level - 1] * this.boostMult; }
  get fireRate()     { return this.def.fireRate * RATE_MULT[this.level - 1]; }
  get canUpgrade()   { return this.level < 5; }
  get nextUpgradeCost() { return upgradeCost(this.def, this.level); }

  constructor(scene: Phaser.Scene, x: number, y: number, def: TowerDef, col: number, row: number) {
    super(scene, x, y);
    this.def = def;
    this.col = col;
    this.row = row;

    this.rangeG = scene.add.graphics();
    this.bodyG = scene.add.graphics();
    this.pipsG = scene.add.graphics();

    this.add([this.bodyG, this.pipsG]);
    (scene.add as Phaser.GameObjects.GameObjectFactory).existing(this as unknown as Phaser.GameObjects.GameObject);

    this.drawBody();
    this.setRangeVisible(false);
  }

  upgrade(): void {
    if (!this.canUpgrade) return;
    this.level++;
    this.drawBody();
  }

  // ─── Drawing ────────────────────────────────────────────────────────────────

  private getTowerColor(): number {
    switch (this.def.type) {
      case 'laser':   return 0x3399ff;  // blue
      case 'rocket':  return 0xff8800;  // orange
      case 'slow':    return 0x00ccff;  // cyan
      case 'booster': return 0x00cc00;  // green
    }
  }

  drawBody(): void {
    const g = this.bodyG;
    g.clear();
    const color = this.getTowerColor();
    const size = 30;
    const lv = this.level;

    switch (this.def.type) {
      case 'laser':
        this.drawLaserShape(g, color, size, lv);
        break;
      case 'rocket':
        this.drawRocketShape(g, color, size, lv);
        break;
      case 'slow':
        this.drawSlowShape(g, color, size, lv);
        break;
      case 'booster':
        this.drawBoosterShape(g, color, size, lv);
        break;
    }

    this.drawLevelPips(this.level);
  }

  private drawLaserShape(g: Phaser.GameObjects.Graphics, color: number, size: number, lv: number): void {
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, size);

    if (lv >= 2) {
      g.lineStyle(1, 0xffffff, 0.5);
      g.strokeCircle(0, 0, size * 0.6);
    }
    if (lv >= 3) {
      g.lineStyle(2, 0xffffff, 0.8);
      g.lineBetween(-11, 0, 11, 0);
      g.lineBetween(0, -11, 0, 11);
    }
    if (lv >= 4) {
      g.lineStyle(1, 0xffffff, 0.6);
      g.strokeCircle(0, 0, size * 0.3);
    }
    if (lv >= 5) {
      g.lineStyle(2, 0xffffff, 0.7);
      g.lineBetween(-8, 0, 8, 0);
      g.lineBetween(0, -8, 0, 8);
      g.lineStyle(1, 0xffffff, 0.4);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = size * 0.8;
        g.fillCircle(Math.cos(a) * r, Math.sin(a) * r, 2);
      }
    }
  }

  private drawRocketShape(g: Phaser.GameObjects.Graphics, color: number, size: number, lv: number): void {
    g.fillStyle(color, 1);

    if (lv >= 4) {
      // Diamond shape (rotated square)
      g.fillTriangle(0, -size, size, 0, 0, size);
      g.fillTriangle(0, -size, -size, 0, 0, size);
      if (lv >= 5) {
        g.lineStyle(1, 0xffffff, 0.4);
        g.strokeTriangle(0, -size, size, 0, 0, size);
        g.strokeTriangle(0, -size, -size, 0, 0, size);
      }
    } else {
      g.fillRect(-size, -size, size * 2, size * 2);
      if (lv >= 2) {
        g.lineStyle(1, 0xffffff, 0.5);
        g.strokeRect(-size, -size, size * 2, size * 2);
      }
    }

    // Star symbol in center
    g.fillStyle(0xffffff, 0.9);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const r = lv >= 3 ? 9 : 8;
      const s = lv >= 3 ? 2.5 : 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      g.fillCircle(x, y, s);
    }
  }

  private drawSlowShape(g: Phaser.GameObjects.Graphics, color: number, size: number, lv: number): void {
    g.fillStyle(color, 1);
    if (lv >= 4) {
      g.fillTriangle(-size * 0.7, size * 0.7, size * 0.7, size * 0.7, 0, -size * 0.7);
      g.fillTriangle(-size, size, size, size, 0, -size);
    } else {
      g.fillTriangle(-size, size, size, size, 0, -size);
    }

    g.lineStyle(1, 0xffffff, 0.8);
    if (lv >= 2) {
      g.lineStyle(1, 0xffffff, 0.6);
      g.lineBetween(-size * 0.5, size * 0.5, size * 0.5, size * 0.5);
      g.lineBetween(0, -size * 0.5, 0, size * 0.5);
    }

    if (lv >= 3) {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const r = 8;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        g.lineBetween(0, 0, x, y);
      }
    }

    if (lv >= 5) {
      g.lineStyle(1, 0xffffff, 0.5);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r = size * 0.9;
        g.lineBetween(0, 0, Math.cos(angle) * r, Math.sin(angle) * r);
      }
    }
  }

  private drawBoosterShape(g: Phaser.GameObjects.Graphics, color: number, size: number, lv: number): void {
    const sz = lv >= 4 ? size * 1.2 : size;
    g.fillStyle(color, 1);
    g.fillRect(-sz, -sz, sz * 2, sz * 2);

    if (lv >= 2) {
      g.lineStyle(1, 0xffffff, 0.5);
      g.strokeRect(-sz, -sz, sz * 2, sz * 2);
    }

    if (lv >= 3) {
      g.lineStyle(1, 0xffffff, 0.5);
      const cs = 4;
      [[-sz, -sz], [sz, -sz], [-sz, sz], [sz, sz]].forEach(([ex, ey]) => {
        g.lineBetween(ex, ey, ex + (ex < 0 ? cs : -cs), ey);
        g.lineBetween(ex, ey, ex, ey + (ey < 0 ? cs : -cs));
      });
    }

    g.fillStyle(0xffffff, 0.9);
    const pSize = lv >= 4 ? 4 : 3;
    const pLen = lv >= 4 ? 8 : 6;
    g.fillRect(-pSize, -pLen, pSize * 2, pLen * 2);
    g.fillRect(-pLen, -pSize, pLen * 2, pSize * 2);

    if (lv >= 5) {
      g.lineStyle(1, 0xffffff, 0.4);
      g.strokeRect(-sz * 0.5, -sz * 0.5, sz, sz);
    }
  }

  // ── Level pip indicators ─────────────────────────────────────────────────────
  private drawLevelPips(lv: number): void {
    const g = this.pipsG;
    g.clear();
    const pipY = 20;
    const spacing = 8;
    const startX = -((5 - 1) * spacing) / 2;
    for (let p = 0; p < 5; p++) {
      const px    = startX + p * spacing;
      const filled = p < lv;
      if (filled) {
        g.fillStyle(lv >= 5 ? 0xffee44 : lv >= 4 ? 0xddaa22 : this.def.color, 0.9);
        g.fillCircle(px, pipY, 3);
      } else {
        g.lineStyle(1, 0x665544, 0.7);
        g.strokeCircle(px, pipY, 3);
      }
    }
  }

  // ─── Range indicator ────────────────────────────────────────────────────────

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
    if (this.def.fireRate === 0) return null;
    if (time - this.lastFired < this.fireRate) return null;

    const target = this.pickTarget(enemies);
    if (!target) return null;

    this.lastFired = time;

    if (this.def.type === 'booster') {
      this.doStomp(enemies, scene);
      return null;
    }

    if (this.def.type === 'laser') {
      target.takeDamage(this.damage, 'laser');
      this.flashArrow(target, scene);
      return null;
    }

    return new Projectile(
      scene, this.x, this.y, target,
      this.def.projSpeed, this.damage, this.def.type,
      this.def.projColor, this.def.slowFactor, this.def.slowDuration,
    );
  }

  private doStomp(enemies: Enemy[], scene: Phaser.Scene): void {
    const r = this.range;
    for (const e of enemies) {
      if (!e.isDead && Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) <= r) {
        e.takeDamage(this.damage, 'booster');
      }
    }
    // Expanding ground-shockwave ring
    const ring = scene.add.graphics().setDepth(18);
    ring.lineStyle(4, this.def.color, 0.9);
    ring.strokeCircle(this.x, this.y, 18);
    ring.fillStyle(this.def.color, 0.15);
    ring.fillCircle(this.x, this.y, 18);
    scene.tweens.add({
      targets: ring, scaleX: r / 18, scaleY: r / 18, alpha: 0, duration: 500,
      ease: 'Cubic.Out', onComplete: () => ring.destroy(),
    });
    // Second inner ring (delayed)
    scene.time.delayedCall(80, () => {
      const ring2 = scene.add.graphics().setDepth(17);
      ring2.lineStyle(2, 0xaaffaa, 0.6);
      ring2.strokeCircle(this.x, this.y, 12);
      scene.tweens.add({
        targets: ring2, scaleX: r / 12, scaleY: r / 12, alpha: 0, duration: 420,
        ease: 'Cubic.Out', onComplete: () => ring2.destroy(),
      });
    });
  }

  private flashArrow(target: Enemy, scene: Phaser.Scene): void {
    const color  = this.def.projColor;
    const width  = 1 + this.level * 0.5;
    const arrow  = scene.add.graphics().setDepth(18);
    arrow.lineStyle(width + 3, color, 0.4);
    arrow.lineBetween(this.x, this.y, target.x, target.y);
    arrow.lineStyle(width, 0xffffff, 0.85);
    arrow.lineBetween(this.x, this.y, target.x, target.y);
    scene.tweens.add({ targets: arrow, alpha: 0, duration: 120, onComplete: () => arrow.destroy() });
    const sp = scene.add.graphics().setDepth(18);
    sp.fillStyle(color, 0.7);
    sp.fillCircle(this.x, this.y, 7 + this.level);
    scene.tweens.add({ targets: sp, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 130, onComplete: () => sp.destroy() });
  }

  doSplash(px: number, py: number, enemies: Enemy[], scene: Phaser.Scene): Enemy[] {
    const r   = this.def.splashRadius * (1 + (this.level - 1) * 0.1);
    const hit: Enemy[] = [];
    for (const e of enemies) {
      if (e.isDead) continue;
      if (Phaser.Math.Distance.Between(px, py, e.x, e.y) <= r) {
        e.takeDamage(this.damage, this.def.type);
        hit.push(e);
      }
    }
    const ring = scene.add.graphics().setDepth(18);
    ring.lineStyle(2 + this.level * 0.5, this.def.projColor, 0.85);
    ring.strokeCircle(px, py, 8);
    ring.fillStyle(0xff4400, 0.3);
    ring.fillCircle(px, py, 8);
    scene.tweens.add({
      targets: ring, scaleX: r / 8, scaleY: r / 8, alpha: 0, duration: 380,
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
