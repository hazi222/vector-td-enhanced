export const GAME_WIDTH  = 1280;
export const GAME_HEIGHT = 720;
export const CELL        = 40;
export const COLS        = GAME_WIDTH  / CELL;   // 32
export const ROWS        = GAME_HEIGHT / CELL;   // 18

export const INTEREST_RATE   = 0.05;
export const STARTING_GOLD   = 200;
export const STARTING_LIVES  = 20;
export const WAVE_PREP_TIME  = 5000; // ms between waves

// Path defined in pixel coords (center of the corridor)
export const PATH_PX: { x: number; y: number }[] = [
  { x: -CELL,              y: CELL * 4 + CELL / 2 },
  { x: CELL * 9,           y: CELL * 4 + CELL / 2 },
  { x: CELL * 9,           y: CELL * 13 + CELL / 2 },
  { x: CELL * 20,          y: CELL * 13 + CELL / 2 },
  { x: CELL * 20,          y: CELL * 4 + CELL / 2 },
  { x: CELL * 28,          y: CELL * 4 + CELL / 2 },
  { x: CELL * 28,          y: CELL * 13 + CELL / 2 },
  { x: GAME_WIDTH + CELL,  y: CELL * 13 + CELL / 2 },
];

// ─── Tower definitions ────────────────────────────────────────────────────────
export type TowerType = 'laser' | 'rocket' | 'slow' | 'booster';

export interface TowerDef {
  type:            TowerType;
  name:            string;
  cost:            number;
  damage:          number;
  range:           number;
  fireRate:        number;   // ms between shots
  color:           number;
  projColor:       number;
  projSpeed:       number;
  splashRadius:    number;
  slowFactor:      number;
  slowDuration:    number;
  boostMult:       number;
  description:     string;
}

export const TOWERS: Record<TowerType, TowerDef> = {
  laser: {
    type: 'laser', name: 'LASER', cost: 100,
    damage: 30, range: 160, fireRate: 450,
    color: 0x00ff88, projColor: 0x00ff88, projSpeed: 500,
    splashRadius: 0, slowFactor: 1, slowDuration: 0, boostMult: 0,
    description: 'Fast laser. +50% vs Blue',
  },
  rocket: {
    type: 'rocket', name: 'ROCKET', cost: 150,
    damage: 85, range: 190, fireRate: 1400,
    color: 0xff4444, projColor: 0xff8844, projSpeed: 260,
    splashRadius: 65, slowFactor: 1, slowDuration: 0, boostMult: 0,
    description: 'Splash damage. +50% vs Red',
  },
  slow: {
    type: 'slow', name: 'RAY', cost: 125,
    damage: 10, range: 165, fireRate: 380,
    color: 0x4499ff, projColor: 0x88aaff, projSpeed: 320,
    splashRadius: 0, slowFactor: 0.45, slowDuration: 2000, boostMult: 0,
    description: 'Slows enemies. +50% vs Yellow',
  },
  booster: {
    type: 'booster', name: 'BOOST', cost: 200,
    damage: 0, range: 140, fireRate: 0,
    color: 0xffaa00, projColor: 0xffaa00, projSpeed: 0,
    splashRadius: 0, slowFactor: 1, slowDuration: 0, boostMult: 0.3,
    description: '+30% dmg to nearby towers',
  },
};

// ─── Enemy definitions ────────────────────────────────────────────────────────
export type EnemyType = 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'grey';

export interface EnemyDef {
  type:         EnemyType;
  name:         string;
  hp:           number;
  speed:        number;
  reward:       number;
  bonusPoints:  number;
  color:        number;
  size:         number;
}

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  blue:   { type: 'blue',   name: 'SPINNER', hp: 80,  speed: 90,  reward: 10, bonusPoints: 0, color: 0x4499ff, size: 12 },
  red:    { type: 'red',    name: 'TRIAX',   hp: 130, speed: 65,  reward: 15, bonusPoints: 0, color: 0xff4444, size: 14 },
  green:  { type: 'green',  name: 'HEXON',   hp: 165, speed: 55,  reward: 20, bonusPoints: 0, color: 0x44ff88, size: 16 },
  yellow: { type: 'yellow', name: 'DART',    hp: 60,  speed: 145, reward: 12, bonusPoints: 0, color: 0xffff44, size: 11 },
  purple: { type: 'purple', name: 'PENTA',   hp: 225, speed: 42,  reward: 25, bonusPoints: 0, color: 0xcc44ff, size: 18 },
  grey:   { type: 'grey',   name: 'TANK',    hp: 700, speed: 30,  reward: 50, bonusPoints: 5, color: 0xcccccc, size: 22 },
};

// Which tower type deals bonus damage vs which enemy color
export const EFFECTIVE_VS: Partial<Record<TowerType, EnemyType>> = {
  laser:  'blue',
  rocket: 'red',
  slow:   'yellow',
};
export const EFFECTIVE_MULT = 1.5;

// ─── Wave generation ──────────────────────────────────────────────────────────
export interface WaveEntry { type: EnemyType; count: number; delay: number; }

const PATTERN: EnemyType[] = ['blue', 'red', 'blue', 'green', 'blue', 'yellow', 'blue', 'purple'];

export function getWaveEntries(wave: number): WaveEntry[] {
  const base = 8 + wave * 2;

  if (wave % 5 === 0) {
    return [{ type: 'grey', count: 2 + Math.floor(wave / 5), delay: 3000 }];
  }

  const primary   = PATTERN[(wave - 1) % PATTERN.length];
  const secondary = PATTERN[(wave + 2) % PATTERN.length];

  if (wave < 4) return [{ type: primary, count: base, delay: 1200 }];

  return [
    { type: primary,   count: Math.ceil(base * 0.6),  delay: 1200 },
    { type: secondary, count: Math.floor(base * 0.4), delay: 1600 },
  ];
}
