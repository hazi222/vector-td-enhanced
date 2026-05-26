import Phaser from 'phaser';
import { EFFECTIVE_MULT, EFFECTIVE_VS, EnemyDef, ENEMIES, EnemyType, TowerType } from '../GameConfig';

const TRAIL_LEN = 10;

export class Enemy extends Phaser.GameObjects.Container {
  readonly def: EnemyDef;
  hp:           number;
  maxHp:        number;
  speed:        number;
  pathT:        number  = 0;
  slowTimer:    number  = 0;
  slowFactor:   number  = 1;
  isDead:       boolean = false;

  private bodyG:      Phaser.GameObjects.Graphics;
  private hpBarG:     Phaser.GameObjects.Graphics;
  private phaserPath: Phaser.Curves.Path;
  private rotAngle:   number = 0;
  private trail:      { x: number; y: number }[] = [];
  private trailG:     Phaser.GameObjects.Graphics;
  private bobTimer:   number = 0;

  constructor(scene: Phaser.Scene, def: EnemyDef, path: Phaser.Curves.Path, hpMult = 1, speedMult = 1) {
    const startPos = new Phaser.Math.Vector2();
    path.getPoint(0, startPos);
    super(scene, startPos.x, startPos.y);
    this.def        = def;
    this.hp         = def.hp * hpMult;
    this.maxHp      = def.hp * hpMult;
    this.speed      = def.speed * speedMult;
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

    // Simple circle with subtle inner ring for all enemy types
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, s);

    // Inner ring for definition
    g.lineStyle(2, 0xffffff, 0.3);
    g.strokeCircle(0, 0, s * 0.7);

    // Boss indicator (Core enemy gets outer ring)
    if (type === 'grey') {
      g.lineStyle(3, color, 0.6);
      g.strokeCircle(0, 0, s + 5);
    }
  }

  private drawHpBar(): void {
    const g   = this.hpBarG;
    const w   = Math.max(this.def.size * 2.8, 28);
    const pct = Math.max(0, this.hp / this.maxHp);
    g.clear();
    g.fillStyle(0x000000, 0.7);
    g.fillRect(-w / 2, -this.def.size - 11, w, 5);
    const c = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xff9900 : 0xff2222;
    g.fillStyle(c, 1);
    g.fillRect(-w / 2, -this.def.size - 11, w * pct, 5);
    // Frame
    g.lineStyle(1, 0x888866, 0.5);
    g.strokeRect(-w / 2, -this.def.size - 11, w, 5);
  }

  private drawTrail(): void {
    const g   = this.trailG;
    const len = this.trail.length;
    g.clear();
    if (len < 2) return;
    for (let i = 1; i < len; i++) {
      const a = (i / len) * 0.3;
      g.lineStyle((i / len) * this.def.size * 0.4, this.def.color, a);
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

  update(delta: number): boolean {
    if (this.isDead) return false;

    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }

    this.rotAngle += delta * 0.0018;
    this.bobTimer += delta * 0.003;

    // Advance path
    const dist    = this.speed * this.slowFactor * (delta / 1000);
    const pathLen = this.phaserPath.getLength();
    this.pathT   += dist / pathLen;

    if (this.pathT >= 1) return true;

    const pos = new Phaser.Math.Vector2();
    this.phaserPath.getPoint(this.pathT, pos);
    this.trail.push({ x: pos.x, y: pos.y });
    if (this.trail.length > TRAIL_LEN) this.trail.shift();

    // Slight vertical bob for living creatures
    const bobY = Math.sin(this.bobTimer) * 1.5;
    this.setPosition(pos.x, pos.y + bobY);

    // Redraw Glitch enemy every frame (animated type)
    if (this.def.type === 'green') {
      this.drawBody();
    }

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

export function spawnEnemy(scene: Phaser.Scene, type: EnemyType, path: Phaser.Curves.Path, hpMult = 1, speedMult = 1): Enemy {
  return new Enemy(scene, ENEMIES[type], path, hpMult, speedMult);
}
