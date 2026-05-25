import Phaser from 'phaser';
import { TowerType } from '../GameConfig';
import { Enemy } from './Enemy';

export interface HitResult {
  enemy:  Enemy;
  x:      number;
  y:      number;
  source: TowerType;
}

export class Projectile extends Phaser.GameObjects.Container {
  private target:       Enemy;
  private speed:        number;
  private damage:       number;
  readonly source:      TowerType;
  readonly projColor:   number;
  private slowFactor:   number;
  private slowDuration: number;

  private bodyG:  Phaser.GameObjects.Graphics;
  private trail:  { x: number; y: number }[] = [];
  private trailG: Phaser.GameObjects.Graphics;
  isDead:         boolean = false;

  constructor(
    scene:        Phaser.Scene,
    x:            number,
    y:            number,
    target:       Enemy,
    speed:        number,
    damage:       number,
    source:       TowerType,
    projColor:    number,
    slowFactor:   number,
    slowDuration: number,
  ) {
    super(scene, x, y);
    this.target       = target;
    this.speed        = speed;
    this.damage       = damage;
    this.source       = source;
    this.projColor    = projColor;
    this.slowFactor   = slowFactor;
    this.slowDuration = slowDuration;

    this.trailG = scene.add.graphics();
    this.bodyG  = scene.add.graphics();
    this.add(this.bodyG);
    (scene.add as Phaser.GameObjects.GameObjectFactory).existing(this as unknown as Phaser.GameObjects.GameObject);

    this.drawBody();
  }

  private drawBody(): void {
    const g = this.bodyG;
    const c = this.projColor;
    const r = this.source === 'rocket' ? 6 : 4;
    g.clear();
    g.fillStyle(c, 0.22);
    g.fillCircle(0, 0, r + 5);
    g.fillStyle(c, 0.65);
    g.fillCircle(0, 0, r);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(0, 0, r * 0.38);
  }

  private drawTrail(): void {
    const g   = this.trailG;
    const len = this.trail.length;
    g.clear();
    if (len < 2) return;
    for (let i = 1; i < len; i++) {
      const a = i / len;
      g.lineStyle(a * 3, this.projColor, a * 0.5);
      g.lineBetween(this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y);
    }
  }

  /** Returns HitResult on impact, null while travelling. */
  update(delta: number): HitResult | null {
    if (this.isDead) return null;
    if (!this.target || this.target.isDead || !this.target.active) { this.kill(); return null; }

    const dx   = this.target.x - this.x;
    const dy   = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * (delta / 1000);

    if (dist <= step + 2) {
      this.target.takeDamage(this.damage, this.source);
      if (this.slowDuration > 0) this.target.applySlow(this.slowFactor, this.slowDuration);
      const result: HitResult = { enemy: this.target, x: this.x, y: this.y, source: this.source };
      this.kill();
      return result;
    }

    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();
    this.drawTrail();
    return null;
  }

  kill(): void {
    this.isDead = true;
    this.trailG.destroy();
    this.destroy();
  }
}
