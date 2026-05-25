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
  private barrelG: Phaser.GameObjects.Graphics;
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

    this.rangeG  = scene.add.graphics();
    this.bodyG   = scene.add.graphics();
    this.barrelG = scene.add.graphics();

    this.add([this.bodyG, this.barrelG]);
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

  drawBody(): void {
    this.bodyG.clear();
    this.barrelG.clear();

    const lv = this.level;

    switch (this.def.type) {
      case 'laser':  this.drawElvenArcher(lv);  break;
      case 'rocket': this.drawCatapult(lv);      break;
      case 'slow':   this.drawWizard(lv);        break;
      case 'booster':this.drawEnt(lv);           break;
    }

    // Level pip indicators (small dots below the tower)
    this.drawLevelPips(lv);
  }

  // ── Elven Archer ────────────────────────────────────────────────────────────
  private drawElvenArcher(lv: number): void {
    const g     = this.bodyG;
    const color = this.def.color;
    const s     = 17 + lv * 1.5;  // grows with level

    // Glow aura – intensity scales with level
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(color, (0.03 + lv * 0.015) * i);
      g.fillCircle(0, 0, s + i * 6 + lv * 2);
    }

    // Stone pillar base
    g.fillStyle(lv >= 4 ? 0x5a5a30 : 0x4a4a38, 1);
    g.fillRect(-s * 0.36, -s * 0.9, s * 0.72, s * 1.5);
    g.fillStyle(lv >= 4 ? 0x7a7a40 : 0x5a5a46, 1);
    g.fillRect(-s * 0.24, -s * 0.75, s * 0.48, s * 1.0);

    // Platform ring
    g.fillStyle(lv >= 5 ? 0x998830 : 0x666655, 1);
    g.fillCircle(0, -s * 0.2, s * 0.65);
    g.fillStyle(lv >= 4 ? 0x443300 : 0x4a4a38, 1);
    g.fillCircle(0, -s * 0.2, s * 0.5);

    // Rune ring – brighter per level
    g.lineStyle(lv >= 3 ? 2 : 1, lv >= 5 ? 0xffdd44 : color, 0.5 + lv * 0.08);
    g.strokeCircle(0, -s * 0.2, s * 0.58);

    // Leaf tiers – one per level
    const leafColor = lv >= 5 ? 0xffee44 : lv >= 4 ? 0xddee44 : color;
    for (let t = 0; t < lv; t++) {
      const tierY = -s * 0.2 - t * s * 0.22;
      const tierR = s * (0.55 - t * 0.06);
      const numLeaves = 3 + t;
      for (let l = 0; l < numLeaves; l++) {
        const la = (l / numLeaves) * Math.PI * 2;
        g.fillStyle(leafColor, 0.55 + t * 0.08);
        g.fillEllipse(Math.cos(la) * tierR * 0.9, tierY + Math.sin(la) * tierR * 0.3, s * 0.28, s * 0.18);
      }
    }

    // Level 3+: rune marks on pillar
    if (lv >= 3) {
      g.lineStyle(1, color, 0.5);
      for (let r = 0; r < 3; r++) {
        const ry = -s * 0.5 + r * s * 0.35;
        g.lineBetween(-s * 0.24, ry, s * 0.24, ry);
      }
    }

    // Spire tip – gold at level 4+
    g.fillStyle(lv >= 4 ? 0xffee44 : 0xaaddcc, 1);
    g.fillTriangle(-4, -s * 0.75, 4, -s * 0.75, 0, -s * 1.35 - lv * 2);
    g.fillStyle(lv >= 5 ? 0xffff88 : color, lv >= 4 ? 0.9 : 0.7);
    g.fillCircle(0, -s * 1.38 - lv * 2, 4 + lv);

    // Level 5: orbiting sparkle gems
    if (lv >= 5) {
      for (let gem = 0; gem < 4; gem++) {
        const ga = (gem / 4) * Math.PI * 2 + 0.5;
        g.fillStyle(0xffee44, 0.8);
        g.fillCircle(Math.cos(ga) * (s * 1.0), Math.sin(ga) * (s * 1.0) - s * 0.2, 4);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(Math.cos(ga) * (s * 1.0) - 1, Math.sin(ga) * (s * 1.0) - s * 0.2 - 1, 1.5);
      }
    }

    // Barrel
    this.barrelG.fillStyle(lv >= 4 ? 0xffee44 : 0xaaddcc, 0.8);
    this.barrelG.fillRect(-1.5, -s * 1.4, 3, s * 0.65);
  }

  // ── Catapult ─────────────────────────────────────────────────────────────────
  private drawCatapult(lv: number): void {
    const g = this.bodyG;
    const s = 18 + lv * 1;

    // Fire glow – grows with level
    g.fillStyle(0xff6600, 0.08 + lv * 0.04);
    g.fillCircle(0, -s * 0.3, s * (0.9 + lv * 0.18));

    // Stone base – heavier per level
    const baseColor = lv >= 4 ? 0x5a4433 : lv >= 2 ? 0x443322 : 0x3a2a18;
    g.fillStyle(baseColor, 1);
    g.fillRect(-s * (0.9 + lv * 0.06), s * 0.2, s * (1.8 + lv * 0.12), s * 0.7);
    g.fillStyle(lv >= 4 ? 0x6a5444 : 0x554433, 1);
    g.fillRect(-s * (0.8 + lv * 0.05), s * 0.1, s * (1.6 + lv * 0.1), s * 0.25);

    // Metal reinforcement bands (level 2+)
    if (lv >= 2) {
      g.lineStyle(lv >= 4 ? 3 : 2, 0x887766, 0.8);
      g.lineBetween(-s * 0.85, s * 0.35, s * 0.85, s * 0.35);
      g.lineBetween(-s * 0.85, s * 0.65, s * 0.85, s * 0.65);
    }

    // Wheels
    const wheelColor = lv >= 3 ? 0x554433 : 0x332211;
    g.fillStyle(wheelColor, 1);
    g.fillCircle(-s * (0.65 + lv * 0.03), s * 0.7, s * (0.3 + lv * 0.02));
    g.fillCircle(s * (0.65 + lv * 0.03), s * 0.7, s * (0.3 + lv * 0.02));
    g.lineStyle(2, 0x665544, 1);
    g.strokeCircle(-s * (0.65 + lv * 0.03), s * 0.7, s * (0.3 + lv * 0.02));
    g.strokeCircle(s * (0.65 + lv * 0.03), s * 0.7, s * (0.3 + lv * 0.02));

    // Frame uprights
    g.fillStyle(0x554433, 1);
    g.fillRect(-s * 0.15, -s * 0.4, s * 0.3, s * 0.6);

    // Level 4+: second arm
    if (lv >= 4) {
      g.fillStyle(0x665544, 1);
      g.fillRect(-s * 0.45, -s * 0.35, s * 0.18, s * 0.5);
    }

    // Arm pivot
    g.fillStyle(0x443322, 1);
    g.fillCircle(0, -s * 0.35, s * 0.22);

    // Level 5: fire columns
    if (lv >= 5) {
      for (let fc = -1; fc <= 1; fc += 2) {
        g.fillStyle(0xff4400, 0.3);
        g.fillRect(fc * s * 0.9 - 4, s * 0.0, 8, s * 0.2);
        g.fillStyle(0xff8800, 0.5);
        g.fillTriangle(fc * s * 0.9 - 5, s * 0.0, fc * s * 0.9 + 5, s * 0.0, fc * s * 0.9, -s * 0.45);
      }
    }

    // Barrel arm
    const armColor = lv >= 4 ? 0x998866 : 0x776655;
    this.barrelG.fillStyle(armColor, 1);
    this.barrelG.fillRect(-s * 0.1, -s * (1.1 + lv * 0.08), s * 0.2, s * (1.1 + lv * 0.05));

    // Boulder – larger and more fiery per level
    const boulderR = s * (0.28 + lv * 0.06);
    this.barrelG.fillStyle(lv >= 4 ? 0xff2200 : 0xff5500, 0.9);
    this.barrelG.fillCircle(0, -s * (1.15 + lv * 0.09), boulderR);
    this.barrelG.fillStyle(lv >= 4 ? 0xff8800 : 0xff9900, 0.7);
    this.barrelG.fillCircle(0, -s * (1.15 + lv * 0.09), boulderR * 0.6);
    if (lv >= 3) {
      this.barrelG.fillStyle(0xffff00, 0.4);
      this.barrelG.fillCircle(0, -s * (1.15 + lv * 0.09), boulderR * 0.3);
    }
  }

  // ── Wizard ───────────────────────────────────────────────────────────────────
  private drawWizard(lv: number): void {
    const g     = this.bodyG;
    const color = this.def.color;
    const s     = 18 + lv * 0.8;

    // Stone base
    g.fillStyle(0x2a2a44, 1);
    g.fillCircle(0, s * 0.4, s * 0.8);
    g.fillStyle(0x3a3a55, 1);
    g.fillCircle(0, 0, s * 0.75);

    // Rune rings – one per level
    for (let ring = 0; ring < lv; ring++) {
      const rr = s * (0.45 + ring * 0.22);
      const ringAlpha = 0.3 + ring * 0.1;
      const ringColor = lv >= 5 ? 0xaabbff : lv >= 4 ? 0x99aaff : color;
      g.lineStyle(lv >= 4 ? 2 : 1, ringColor, ringAlpha);
      g.strokeCircle(0, 0, rr);

      // Rune tick marks on each ring
      const ticks = 4 + ring * 2;
      for (let t = 0; t < ticks; t++) {
        const ta  = (t / ticks) * Math.PI * 2;
        const tx1 = Math.cos(ta) * rr * 0.88;
        const ty1 = Math.sin(ta) * rr * 0.88;
        const tx2 = Math.cos(ta) * (rr + 5);
        const ty2 = Math.sin(ta) * (rr + 5);
        g.lineStyle(1, ringColor, ringAlpha + 0.2);
        g.lineBetween(tx1, ty1, tx2, ty2);
      }
    }

    // Inner magic circle
    g.fillStyle(color, 0.10 + lv * 0.04);
    g.fillCircle(0, 0, s * 0.5);
    g.lineStyle(lv >= 3 ? 2 : 1, color, 0.35 + lv * 0.08);
    g.strokeCircle(0, 0, s * 0.35);

    // Level 3+: ice crystals around base
    if (lv >= 3) {
      for (let ic = 0; ic < 4 + (lv - 3) * 2; ic++) {
        const ia = (ic / (4 + (lv - 3) * 2)) * Math.PI * 2;
        const ix = Math.cos(ia) * s * 0.72;
        const iy = Math.sin(ia) * s * 0.72;
        g.fillStyle(0xccddff, 0.6);
        g.fillTriangle(ix - 3, iy, ix + 3, iy, ix, iy - 10 - lv * 2);
        g.fillStyle(0xffffff, 0.3);
        g.fillTriangle(ix - 1.5, iy, ix + 1.5, iy, ix, iy - 5 - lv);
      }
    }

    // Level 5: extra floating orbs
    if (lv >= 5) {
      for (let orb = 0; orb < 3; orb++) {
        const oa = (orb / 3) * Math.PI * 2 + 1.0;
        g.fillStyle(color, 0.7);
        g.fillCircle(Math.cos(oa) * s * 0.9, Math.sin(oa) * s * 0.9, 6);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(Math.cos(oa) * s * 0.9 - 1, Math.sin(oa) * s * 0.9 - 1, 2.5);
      }
    }

    // Staff (barrel)
    const staffColor = lv >= 4 ? 0xbb9966 : 0x997755;
    this.barrelG.fillStyle(staffColor, 1);
    this.barrelG.fillRect(-2, -s * (1.3 + lv * 0.08), 4, s * (1.1 + lv * 0.05));
    // Orb at tip – grows and brightens with level
    const orbR = 5 + lv * 1.5;
    const orbColor = lv >= 5 ? 0xeeeeff : lv >= 4 ? 0xccddff : color;
    this.barrelG.fillStyle(orbColor, 0.9);
    this.barrelG.fillCircle(0, -s * (1.35 + lv * 0.09), orbR);
    this.barrelG.fillStyle(0xffffff, 0.5);
    this.barrelG.fillCircle(0, -s * (1.35 + lv * 0.09), orbR * 0.4);
  }

  // ── Ent ──────────────────────────────────────────────────────────────────────
  private drawEnt(lv: number): void {
    const g     = this.bodyG;
    const color = this.def.color;
    const s     = 18 + lv * 1.2;

    // Life energy aura – grows with level
    g.lineStyle(1, lv >= 4 ? 0xaaee44 : color, 0.15 + lv * 0.06);
    g.strokeCircle(0, -s * 0.2, s * (1.2 + lv * 0.12));
    if (lv >= 3) {
      g.fillStyle(color, 0.04 + lv * 0.02);
      g.fillCircle(0, -s * 0.2, s * (1.1 + lv * 0.1));
    }

    // Roots
    const rootColor = lv >= 4 ? 0x5a3a18 : 0x3a2a18;
    for (let r = 0; r < 5 + lv; r++) {
      const ra = (r / (5 + lv)) * Math.PI * 2;
      g.fillStyle(rootColor, 1);
      g.fillEllipse(Math.cos(ra) * s * 0.7, Math.sin(ra) * s * 0.5 + s * 0.4,
                    s * (0.45 + lv * 0.05), s * (0.28 + lv * 0.02));
    }

    // Main trunk – thicker and taller per level
    const trunkW = s * (0.35 + lv * 0.04);
    g.fillStyle(lv >= 4 ? 0x5a4530 : 0x4a3522, 1);
    g.fillRect(-trunkW, -s * (0.7 + lv * 0.08), trunkW * 2, s * (1.1 + lv * 0.05));
    g.fillStyle(lv >= 4 ? 0x6a5540 : 0x5a4530, 1);
    g.fillRect(-trunkW * 0.65, -s * (0.9 + lv * 0.09), trunkW * 1.3, s * (0.6 + lv * 0.04));

    // Bark lines
    g.lineStyle(1, rootColor, 0.5);
    for (let bl = 0; bl < 2 + lv; bl++) {
      const by = -s * 0.5 + bl * s * 0.28;
      g.lineBetween(-trunkW * 0.9, by, trunkW * 0.9, by + s * 0.06);
    }

    // Branches – more and longer per level
    const numBranches = 2 + lv;
    for (let b = 0; b < numBranches; b++) {
      const isLeft  = b % 2 === 0;
      const heightY = -s * (0.5 + b * 0.18);
      const endX    = (isLeft ? -1 : 1) * s * (0.8 + b * 0.12 + lv * 0.05);
      const endY    = heightY - s * (0.4 + b * 0.06);
      g.lineStyle(7 - b, lv >= 4 ? 0x5a4530 : 0x4a3522, 1);
      g.lineBetween(isLeft ? -trunkW * 0.3 : trunkW * 0.3, heightY, endX, endY);
      if (b < 2) {
        const end2X = endX + (isLeft ? -1 : 1) * s * 0.35;
        g.lineStyle(4 - b, lv >= 4 ? 0x5a4530 : 0x4a3522, 1);
        g.lineBetween(endX, endY, end2X, endY - s * 0.25);
      }
    }

    // Leaf clusters – one per level plus base
    const leafColor = lv >= 5 ? 0xffee44 : lv >= 4 ? 0xaade44 : color;
    const leafPosBase = [[-s * 1.35, -s * 0.7], [s * 1.35, -s * 0.7], [0, -s * 1.05]];
    const leafPosExtra = [[-s * 0.95, -s * (1.0 + lv * 0.06)], [s * 0.95, -s * (1.0 + lv * 0.06)]];
    const allLeafPos = lv >= 2 ? [...leafPosBase, ...leafPosExtra] : leafPosBase;

    for (const [lx, ly] of allLeafPos) {
      const clusterR = s * (0.38 + lv * 0.05);
      g.fillStyle(leafColor, 0.8 + lv * 0.03);
      g.fillCircle(lx, ly, clusterR);
      g.fillStyle(lv >= 4 ? 0x88cc44 : 0x66aa33, 0.5);
      g.fillCircle(lx - 3, ly - 3, clusterR * 0.55);
      // Level 5: golden shimmer
      if (lv >= 5) {
        g.fillStyle(0xffff88, 0.3);
        g.fillCircle(lx, ly, clusterR * 0.4);
      }
    }
  }

  // ── Level pip indicators ─────────────────────────────────────────────────────
  private drawLevelPips(lv: number): void {
    const g = this.bodyG;
    const pipY = 28;
    const spacing = 8;
    const startX = -((5 - 1) * spacing) / 2;
    for (let p = 0; p < 5; p++) {
      const px    = startX + p * spacing;
      const filled = p < lv;
      if (filled) {
        g.fillStyle(lv >= 5 ? 0xffee44 : lv >= 4 ? 0xddaa22 : this.def.color, 0.9);
        g.fillCircle(px, pipY, 3);
      } else {
        g.lineStyle(1, 0x444433, 0.5);
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
    if (this.def.type === 'booster' || this.def.fireRate === 0) return null;
    if (time - this.lastFired < this.fireRate) return null;

    const target = this.pickTarget(enemies);
    if (!target) return null;

    const angle = Math.atan2(target.y - this.y, target.x - this.x) + Math.PI / 2;
    this.barrelG.setRotation(angle);
    this.lastFired = time;

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
