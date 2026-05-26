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

    switch (type) {

      case 'blue': // Orc Scout – hunched figure, orcish green
        // Outer shadow aura
        g.fillStyle(0x224411, 0.35);
        g.fillCircle(0, 2, s + 5);
        // Body – hunched oval
        g.fillStyle(color, 1);
        g.fillEllipse(0, 2, s * 1.4, s * 1.6);
        // Head
        g.fillStyle(0x55cc44, 1);
        g.fillCircle(0, -s * 0.7, s * 0.55);
        // Tusks
        g.fillStyle(0xddcc88, 1);
        g.fillTriangle(-s * 0.3, -s * 0.35, -s * 0.15, -s * 0.35, -s * 0.22, -s * 0.1);
        g.fillTriangle(s * 0.15, -s * 0.35, s * 0.3, -s * 0.35, s * 0.22, -s * 0.1);
        // Eyes (glowing red)
        g.fillStyle(0xff2200, 1);
        g.fillCircle(-s * 0.18, -s * 0.75, 2);
        g.fillCircle(s * 0.18, -s * 0.75, 2);
        // Crude spear
        g.lineStyle(2, 0x886644, 1);
        g.lineBetween(s * 0.5, -s * 0.2, s * 0.8, -s * 1.3);
        g.fillStyle(0xccbbaa, 1);
        g.fillTriangle(s * 0.72, -s * 1.55, s * 0.8, -s * 1.3, s * 0.88, -s * 1.55);
        break;

      case 'red': // Uruk-hai – stocky armoured warrior
        // Shadow
        g.fillStyle(0x440000, 0.4);
        g.fillEllipse(0, s * 0.6, s * 2.2, s * 0.7);
        // Armoured body (dark steel)
        g.fillStyle(0x332211, 1);
        g.fillEllipse(0, 0, s * 2, s * 2.2);
        g.fillStyle(color, 1);
        g.fillEllipse(0, -s * 0.1, s * 1.6, s * 1.9);
        // Chest plate
        g.fillStyle(0x221100, 1);
        g.fillEllipse(0, s * 0.1, s * 1.1, s * 1.3);
        // Helmet
        g.fillStyle(0x221100, 1);
        g.fillEllipse(0, -s * 0.85, s * 1.3, s * 1.1);
        g.fillStyle(0x442200, 1);
        g.fillRect(-s * 0.65, -s * 0.6, s * 1.3, s * 0.22);
        // Eyes (white slit)
        g.fillStyle(0xff4400, 1);
        g.fillRect(-s * 0.3, -s * 0.95, s * 0.22, s * 0.12);
        g.fillRect(s * 0.08, -s * 0.95, s * 0.22, s * 0.12);
        // White Hand mark of Saruman
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(0, s * 0.1, s * 0.2);
        for (let f = 0; f < 5; f++) {
          const fa = -Math.PI / 2 + (f - 2) * 0.4;
          g.fillRect(
            Math.cos(fa) * s * 0.22, Math.sin(fa) * s * 0.22 + s * 0.1 - s * 0.35,
            s * 0.08, s * 0.32,
          );
        }
        break;

      case 'green': // Berserker – frantic spiked warrior
        // Aura
        g.fillStyle(0x556600, 0.25);
        g.fillCircle(0, 0, s + 6);
        // Body
        g.fillStyle(0x667700, 1);
        g.fillCircle(0, 0, s);
        g.fillStyle(color, 0.9);
        g.fillCircle(0, 0, s * 0.8);
        // Spikes radiating out
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + this.rotAngle;
          const ix = Math.cos(a) * s * 0.82;
          const iy = Math.sin(a) * s * 0.82;
          const ox = Math.cos(a) * (s + 8);
          const oy = Math.sin(a) * (s + 8);
          g.fillStyle(0xbbdd00, 1);
          g.fillTriangle(ix - 3, iy - 3, ix + 3, iy + 3, ox, oy);
        }
        // Eyes
        g.fillStyle(0xff8800, 1);
        g.fillCircle(-s * 0.25, -s * 0.15, 3);
        g.fillCircle(s * 0.25, -s * 0.15, 3);
        break;

      case 'yellow': // Warg Rider – wolf shape with orc on back
        // Shadow
        g.fillStyle(0x442200, 0.3);
        g.fillEllipse(0, s * 0.4, s * 3.2, s * 0.6);
        // Wolf body (horizontal elongated)
        g.fillStyle(0x886633, 1);
        g.fillEllipse(0, s * 0.1, s * 3.0, s * 1.4);
        // Wolf head (pointed snout)
        g.fillStyle(0x775522, 1);
        g.fillEllipse(-s * 1.3, -s * 0.2, s * 1.2, s * 0.9);
        // Snout
        g.fillStyle(0x664411, 1);
        g.fillEllipse(-s * 1.8, -s * 0.1, s * 0.7, s * 0.45);
        // Wolf ears
        g.fillStyle(0x886633, 1);
        g.fillTriangle(-s * 1.1, -s * 0.6, -s * 0.85, -s * 1.1, -s * 0.6, -s * 0.6);
        g.fillTriangle(-s * 1.5, -s * 0.55, -s * 1.3, -s * 1.0, -s * 1.1, -s * 0.55);
        // Wolf eye
        g.fillStyle(0xff6600, 1);
        g.fillCircle(-s * 1.25, -s * 0.28, 2.5);
        // Wolf tail
        g.lineStyle(4, 0x997744, 1);
        g.lineBetween(s * 1.3, 0, s * 1.7, -s * 0.6);
        // Orc rider (tiny)
        g.fillStyle(0x44aa22, 1);
        g.fillCircle(0, -s * 0.55, s * 0.35);
        g.fillEllipse(0, -s * 0.25, s * 0.45, s * 0.45);
        break;

      case 'purple': // Ringwraith – flowing black shadow
        // Large shadow aura
        g.fillStyle(0x220033, 0.5);
        g.fillEllipse(0, s * 0.5, s * 2.2, s * 1.1);
        // Flowing cloak (bell shape)
        g.fillStyle(0x110022, 1);
        g.fillEllipse(0, s * 0.4, s * 2.4, s * 2.0);
        // Cloak highlight – purple shimmer
        g.fillStyle(color, 0.35);
        g.fillEllipse(0, s * 0.2, s * 1.8, s * 1.5);
        // Hood
        g.fillStyle(0x110022, 1);
        g.fillTriangle(-s * 0.7, -s * 0.4, s * 0.7, -s * 0.4, 0, -s * 1.4);
        // Inner void face
        g.fillStyle(color, 0.15);
        g.fillEllipse(0, -s * 0.55, s * 0.85, s * 0.65);
        // Eyes (two burning points)
        g.fillStyle(0xff8800, 0.9);
        g.fillCircle(-s * 0.18, -s * 0.58, 3);
        g.fillCircle(s * 0.18, -s * 0.58, 3);
        // Ghostly tendrils at base
        for (let t = 0; t < 4; t++) {
          const tx = (t - 1.5) * s * 0.45;
          g.lineStyle(2, color, 0.3);
          g.lineBetween(tx, s * 0.8, tx + Phaser.Math.Between(-8, 8), s * 1.5);
        }
        break;

      case 'grey': // Cave Troll – massive stone-like brute
        // Ground shadow
        g.fillStyle(0x222200, 0.5);
        g.fillEllipse(0, s * 0.9, s * 3.8, s * 1.0);
        // Body (huge)
        g.fillStyle(0x556644, 1);
        g.fillEllipse(0, 0, s * 2.8, s * 3.0);
        // Stone texture patches
        g.fillStyle(0x667755, 0.6);
        g.fillEllipse(-s * 0.5, -s * 0.3, s * 0.9, s * 0.7);
        g.fillEllipse(s * 0.6, s * 0.4, s * 0.7, s * 0.6);
        g.fillEllipse(-s * 0.3, s * 0.8, s * 0.8, s * 0.5);
        // Head (small relative to body)
        g.fillStyle(0x556644, 1);
        g.fillCircle(0, -s * 1.2, s * 0.85);
        // Brow ridge
        g.fillStyle(0x445533, 1);
        g.fillRect(-s * 0.7, -s * 1.55, s * 1.4, s * 0.3);
        // Eyes (deep set, yellow)
        g.fillStyle(0x110800, 1);
        g.fillCircle(-s * 0.28, -s * 1.25, s * 0.22);
        g.fillCircle(s * 0.28, -s * 1.25, s * 0.22);
        g.fillStyle(0xddcc00, 1);
        g.fillCircle(-s * 0.28, -s * 1.25, s * 0.12);
        g.fillCircle(s * 0.28, -s * 1.25, s * 0.12);
        // Massive arms
        g.fillStyle(0x556644, 1);
        g.fillEllipse(-s * 1.5, s * 0.3, s * 1.0, s * 2.2);
        g.fillEllipse(s * 1.5, s * 0.3, s * 1.0, s * 2.2);
        // Club
        g.lineStyle(6, 0x887755, 1);
        g.lineBetween(s * 1.7, -s * 0.4, s * 2.2, -s * 1.2);
        g.fillStyle(0x998866, 1);
        g.fillCircle(s * 2.2, -s * 1.3, s * 0.35);
        break;
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

    // Redraw spinning berserker every frame
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
