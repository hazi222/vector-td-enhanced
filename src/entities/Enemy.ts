import Phaser from 'phaser';
import { EFFECTIVE_MULT, EFFECTIVE_VS, EnemyDef, ENEMIES, EnemyType, PATH_PX, TowerType } from '../GameConfig';

const TRAIL_LEN = 8;

export class Enemy extends Phaser.GameObjects.Container {
  readonly def: EnemyDef;
  hp:           number;
  maxHp:        number;
  speed:        number;
  pathT:        number  = 0;
  slowTimer:    number  = 0;
  slowFactor:   number  = 1;
  isDead:       boolean = false;

  private bodyG:  Phaser.GameObjects.Graphics;
  private hpBarG: Phaser.GameObjects.Graphics;
  private phaserPath: Phaser.Curves.Path;
  private rotAngle: number = 0;
  private trail:  { x: number; y: number }[] = [];
  private trailG: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, def: EnemyDef, path: Phaser.Curves.Path) {
    const start = PATH_PX[0];
    super(scene, start.x, start.y);

    this.def        = def;
    this.hp         = def.hp;
    this.maxHp      = def.hp;
    this.speed      = def.speed;
    this.phaserPath = path;

    this.trailG = scene.add.graphics();
    this.bodyG  = scene.add.graphics();
    this.hpBarG = scene.add.graphics();

    this.add([this.bodyG, this.hpBarG]);
    (scene.add as Phaser.GameObjects.GameObjectFactory).existing(this as unknown as Phaser.GameObjects.GameObject);

    this.drawBody();
    this.drawHpBar();
  }

  // ─── Drawing ────────────────────────────────────────────────────────────────

  private drawBody(): void {
    const g = this.bodyG;
    const { color, size: s, type } = this.def;
    g.clear();

    // Glow halos (manual soft glow)
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(color, 0.06 * i);
      g.fillCircle(0, 0, s + i * 5);
    }

    switch (type) {
      case 'blue':
        g.fillStyle(color, 1);
        g.fillCircle(0, 0, s);
        g.lineStyle(2, 0xffffff, 0.55);
        g.strokeCircle(0, 0, s);
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(0, 0, s * 0.38);
        break;

      case 'red':
        g.fillStyle(color, 1);
        ngonFill(g, 0, 0, s, 3, 0);
        g.lineStyle(2, 0xffffff, 0.5);
        ngonStroke(g, 0, 0, s, 3, 0);
        break;

      case 'green':
        g.fillStyle(color, 1);
        ngonFill(g, 0, 0, s, 6, 0);
        g.lineStyle(2, 0xffffff, 0.5);
        ngonStroke(g, 0, 0, s, 6, 0);
        g.fillStyle(0x000000, 0.25);
        ngonFill(g, 0, 0, s * 0.5, 6, 0);
        break;

      case 'yellow':
        g.fillStyle(color, 1);
        ngonFill(g, 0, 0, s, 4, Math.PI / 4);
        g.lineStyle(2, 0xffffff, 0.5);
        ngonStroke(g, 0, 0, s, 4, Math.PI / 4);
        break;

      case 'purple':
        g.fillStyle(color, 1);
        ngonFill(g, 0, 0, s, 5, 0);
        g.lineStyle(2, 0xffffff, 0.5);
        ngonStroke(g, 0, 0, s, 5, 0);
        g.fillStyle(0xffffff, 0.15);
        ngonFill(g, 0, 0, s * 0.5, 5, Math.PI / 5);
        break;

      case 'grey':
        g.fillStyle(color, 1);
        g.fillRect(-s, -s, s * 2, s * 2);
        g.lineStyle(3, 0xffffff, 0.7);
        g.strokeRect(-s, -s, s * 2, s * 2);
        g.lineStyle(1, 0xffffff, 0.3);
        g.strokeRect(-s * 0.5, -s * 0.5, s, s);
        break;
    }
  }

  private drawHpBar(): void {
    const g   = this.hpBarG;
    const w   = this.def.size * 2.5;
    const pct = Math.max(0, this.hp / this.maxHp);
    g.clear();
    g.fillStyle(0x000000, 0.6);
    g.fillRect(-w / 2, -this.def.size - 9, w, 4);
    const c = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff2222;
    g.fillStyle(c, 1);
    g.fillRect(-w / 2, -this.def.size - 9, w * pct, 4);
  }

  private drawTrail(): void {
    const g   = this.trailG;
    const len = this.trail.length;
    g.clear();
    if (len < 2) return;
    for (let i = 1; i < len; i++) {
      const a = i / len;
      g.lineStyle(a * this.def.size * 0.55, this.def.color, a * 0.35);
      g.lineBetween(this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y);
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  takeDamage(amount: number, source: TowerType): number {
    const eff  = EFFECTIVE_VS[source] === this.def.type ? EFFECTIVE_MULT : 1;
    const dmg  = amount * eff;
    this.hp   -= dmg;
    return dmg;
  }

  applySlow(factor: number, duration: number): void {
    this.slowFactor = factor;
    this.slowTimer  = duration;
  }

  /** Returns true when the enemy reaches the exit. */
  update(delta: number): boolean {
    if (this.isDead) return false;

    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }

    // Rotate animated shapes
    this.rotAngle += delta * 0.002 * (this.def.type === 'yellow' ? 3 : 1);
    if (['blue', 'red', 'yellow', 'purple'].includes(this.def.type)) {
      this.bodyG.setRotation(this.rotAngle);
    }

    // Advance along path
    const dist    = this.speed * this.slowFactor * (delta / 1000);
    const pathLen = this.phaserPath.getLength();
    this.pathT   += dist / pathLen;

    if (this.pathT >= 1) return true;

    const pos = new Phaser.Math.Vector2();
    this.phaserPath.getPoint(this.pathT, pos);
    this.trail.push({ x: pos.x, y: pos.y });
    if (this.trail.length > TRAIL_LEN) this.trail.shift();
    this.setPosition(pos.x, pos.y);

    this.drawTrail();
    this.drawHpBar();
    return false;
  }

  die(): void {
    this.isDead = true;
    this.trailG.destroy();
    this.destroy();
  }

  get enemyType(): EnemyType { return this.def.type; }
}

// ─── Polygon helpers ──────────────────────────────────────────────────────────

function ngonPoints(cx: number, cy: number, r: number, n: number, offset: number): Phaser.Geom.Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = offset + (i / n) * Math.PI * 2;
    return new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  });
}
function ngonFill(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, n: number, o: number) {
  g.fillPoints(ngonPoints(cx, cy, r, n, o), true);
}
function ngonStroke(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, n: number, o: number) {
  g.strokePoints(ngonPoints(cx, cy, r, n, o), true);
}

export function spawnEnemy(scene: Phaser.Scene, type: EnemyType, path: Phaser.Curves.Path): Enemy {
  return new Enemy(scene, ENEMIES[type], path);
}
