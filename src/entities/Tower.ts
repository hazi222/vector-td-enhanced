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
    g.clear();
    this.barrelG.clear();

    switch (this.def.type) {

      case 'laser': { // Elven Archer Tower – slender organic spire
        const s = 18;
        // Root foundation (stone base)
        g.fillStyle(0x3a3028, 1);
        g.fillEllipse(0, s * 0.6, s * 2.2, s * 0.7);
        // Elvish stone pillar
        g.fillStyle(0x4a4a38, 1);
        g.fillRect(-s * 0.35, -s * 0.9, s * 0.7, s * 1.5);
        // Organic carved detail – leaf motifs
        g.fillStyle(0x5a5a46, 1);
        g.fillRect(-s * 0.25, -s * 0.7, s * 0.5, s * 1.0);
        // Elven glow – soft green-silver emanation
        g.fillStyle(color, 0.12);
        g.fillCircle(0, -s * 0.2, s * 1.4);
        g.fillStyle(color, 0.2);
        g.fillCircle(0, -s * 0.2, s * 0.9);
        // Platform ring – carved elvish stone
        g.fillStyle(0x666655, 1);
        g.fillCircle(0, -s * 0.2, s * 0.65);
        g.fillStyle(0x4a4a38, 1);
        g.fillCircle(0, -s * 0.2, s * 0.5);
        // Silver rune ring
        g.lineStyle(1, color, 0.6);
        g.strokeCircle(0, -s * 0.2, s * 0.58);
        // Leaf decoration – three leaves pointing outward
        for (let l = 0; l < 3; l++) {
          const la = (l / 3) * Math.PI * 2;
          const lx = Math.cos(la) * s * 0.55;
          const ly = Math.sin(la) * s * 0.55;
          g.fillStyle(color, 0.55);
          g.fillEllipse(lx, ly - s * 0.2, s * 0.28, s * 0.18);
        }
        // Spire tip
        g.fillStyle(0xaaddcc, 1);
        g.fillTriangle(-4, -s * 0.75, 4, -s * 0.75, 0, -s * 1.35);
        g.fillStyle(color, 0.7);
        g.fillCircle(0, -s * 1.38, 4);
        // Arrow nock indicator (barrel stub)
        this.barrelG.fillStyle(0xaaddcc, 0.8);
        this.barrelG.fillRect(-1.5, -s * 1.4, 3, s * 0.65);
        break;
      }

      case 'rocket': { // Catapult – heavy siege machine
        const s = 18;
        // Stone base slab
        g.fillStyle(0x443322, 1);
        g.fillRect(-s * 0.9, s * 0.2, s * 1.8, s * 0.7);
        g.fillStyle(0x554433, 1);
        g.fillRect(-s * 0.8, s * 0.1, s * 1.6, s * 0.25);
        // Wheels
        g.fillStyle(0x332211, 1);
        g.fillCircle(-s * 0.65, s * 0.7, s * 0.3);
        g.fillCircle(s * 0.65, s * 0.7, s * 0.3);
        g.lineStyle(2, 0x554433, 1);
        g.strokeCircle(-s * 0.65, s * 0.7, s * 0.3);
        g.strokeCircle(s * 0.65, s * 0.7, s * 0.3);
        // Frame uprights
        g.fillStyle(0x554433, 1);
        g.fillRect(-s * 0.15, -s * 0.4, s * 0.3, s * 0.6);
        // Catapult arm pivot
        g.fillStyle(0x443322, 1);
        g.fillCircle(0, -s * 0.35, s * 0.22);
        // Fire glow (Gondor's fire)
        g.fillStyle(0xff6600, 0.15);
        g.fillCircle(0, -s * 0.3, s * 1.1);
        g.fillStyle(0xff8800, 0.22);
        g.fillCircle(0, -s * 0.3, s * 0.7);
        // Arm (rotates as barrel)
        this.barrelG.fillStyle(0x776655, 1);
        this.barrelG.fillRect(-s * 0.1, -s * 1.1, s * 0.2, s * 1.1);
        // Flaming boulder at tip
        this.barrelG.fillStyle(0xff5500, 0.9);
        this.barrelG.fillCircle(0, -s * 1.15, s * 0.3);
        this.barrelG.fillStyle(0xff9900, 0.7);
        this.barrelG.fillCircle(0, -s * 1.15, s * 0.18);
        break;
      }

      case 'slow': { // Wizard Tower – runic circle with staff
        const s = 18;
        // Stone base
        g.fillStyle(0x2a2a44, 1);
        g.fillCircle(0, s * 0.4, s * 0.8);
        g.fillStyle(0x3a3a55, 1);
        g.fillCircle(0, 0, s * 0.75);
        // Runic outer ring
        g.lineStyle(2, color, 0.5);
        g.strokeCircle(0, 0, s * 0.72);
        // Rune marks around the ring
        for (let r = 0; r < 8; r++) {
          const ra = (r / 8) * Math.PI * 2;
          const rx1 = Math.cos(ra) * s * 0.6;
          const ry1 = Math.sin(ra) * s * 0.6;
          const rx2 = Math.cos(ra) * s * 0.78;
          const ry2 = Math.sin(ra) * s * 0.78;
          g.lineStyle(1, color, 0.7);
          g.lineBetween(rx1, ry1, rx2, ry2);
        }
        // Inner magic circle
        g.fillStyle(color, 0.12);
        g.fillCircle(0, 0, s * 0.55);
        g.lineStyle(1, color, 0.4);
        g.strokeCircle(0, 0, s * 0.38);
        // Magical glow
        g.fillStyle(color, 0.18);
        g.fillCircle(0, -s * 0.1, s * 0.9);
        // Staff (barrel)
        this.barrelG.fillStyle(0x997755, 1);
        this.barrelG.fillRect(-2, -s * 1.3, 4, s * 1.1);
        // Orb at tip
        this.barrelG.fillStyle(color, 0.9);
        this.barrelG.fillCircle(0, -s * 1.35, 6);
        this.barrelG.fillStyle(0xffffff, 0.5);
        this.barrelG.fillCircle(0, -s * 1.35, 3);
        break;
      }

      case 'booster': { // Ent – ancient walking tree
        const s = 18;
        // Root base
        g.fillStyle(0x3a2a18, 1);
        for (let r = 0; r < 5; r++) {
          const ra = (r / 5) * Math.PI * 2;
          g.fillEllipse(Math.cos(ra) * s * 0.7, Math.sin(ra) * s * 0.5 + s * 0.4, s * 0.55, s * 0.35);
        }
        // Main trunk
        g.fillStyle(0x4a3522, 1);
        g.fillRect(-s * 0.38, -s * 0.7, s * 0.76, s * 1.1);
        g.fillStyle(0x5a4530, 1);
        g.fillRect(-s * 0.26, -s * 0.9, s * 0.52, s * 0.6);
        // Bark texture lines
        g.lineStyle(1, 0x3a2a18, 0.6);
        for (let b = -s * 0.6; b < s * 0.3; b += s * 0.25) {
          g.lineBetween(-s * 0.32, b, s * 0.32, b + s * 0.08);
        }
        // Left branch
        g.lineStyle(7, 0x4a3522, 1);
        g.lineBetween(-s * 0.3, -s * 0.6, -s * 1.0, -s * 1.1);
        g.lineStyle(5, 0x4a3522, 1);
        g.lineBetween(-s * 1.0, -s * 1.1, -s * 1.4, -s * 0.65);
        // Right branch
        g.lineStyle(7, 0x4a3522, 1);
        g.lineBetween(s * 0.3, -s * 0.6, s * 1.0, -s * 1.1);
        g.lineStyle(5, 0x4a3522, 1);
        g.lineBetween(s * 1.0, -s * 1.1, s * 1.4, -s * 0.65);
        // Leaf clusters
        const leafPositions = [
          [-s * 1.35, -s * 0.7], [s * 1.35, -s * 0.7],
          [-s * 0.95, -s * 1.2], [s * 0.95, -s * 1.2],
          [0, -s * 1.05],
        ];
        for (const [lx, ly] of leafPositions) {
          g.fillStyle(color, 0.85);
          g.fillCircle(lx, ly, s * 0.42);
          g.fillStyle(0x88cc44, 0.6);
          g.fillCircle(lx - 3, ly - 3, s * 0.22);
        }
        // Life energy aura
        g.lineStyle(1, color, 0.3);
        g.strokeCircle(0, -s * 0.2, s * 1.5);
        break;
      }
    }
  }

  setRangeVisible(on: boolean): void {
    this.rangeG.setVisible(on);
    if (on) {
      this.rangeG.clear();
      this.rangeG.lineStyle(1, this.def.color, 0.2);
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
      this.fireArrow(target, scene);
      return null;
    }

    return new Projectile(
      scene, this.x, this.y, target,
      this.def.projSpeed, this.damage, this.def.type,
      this.def.projColor, this.def.slowFactor, this.def.slowDuration,
    );
  }

  private fireArrow(target: Enemy, scene: Phaser.Scene): void {
    // Silver elven arrow – thin bright line
    const arrow = scene.add.graphics().setDepth(18);
    arrow.lineStyle(2, 0xffffff, 0.95);
    arrow.lineBetween(this.x, this.y, target.x, target.y);
    arrow.lineStyle(4, this.def.projColor, 0.5);
    arrow.lineBetween(this.x, this.y, target.x, target.y);
    scene.tweens.add({ targets: arrow, alpha: 0, duration: 120, onComplete: () => arrow.destroy() });

    // Muzzle sparkle
    const sp = scene.add.graphics().setDepth(18);
    sp.fillStyle(this.def.color, 0.8);
    sp.fillCircle(this.x, this.y, 7);
    scene.tweens.add({ targets: sp, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 130, onComplete: () => sp.destroy() });
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
    // Expanding fire ring
    const ring = scene.add.graphics().setDepth(18);
    ring.lineStyle(3, 0xff6600, 0.9);
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
