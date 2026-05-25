export const GAME_WIDTH  = 1280;
export const GAME_HEIGHT = 720;
export const CELL        = 40;
export const COLS        = GAME_WIDTH  / CELL;   // 32
export const ROWS        = GAME_HEIGHT / CELL;   // 18

export const INTEREST_RATE   = 0.05;
export const STARTING_GOLD   = 200;
export const STARTING_LIVES  = 20;
export const WAVE_PREP_TIME  = 5000;

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
  type:         TowerType;
  name:         string;
  lore:         string;       // flavour subtitle
  cost:         number;
  damage:       number;
  range:        number;
  fireRate:     number;
  color:        number;
  projColor:    number;
  projSpeed:    number;
  splashRadius: number;
  slowFactor:   number;
  slowDuration: number;
  boostMult:    number;
  description:  string;
}

export const TOWERS: Record<TowerType, TowerDef> = {
  laser: {
    type: 'laser', name: 'Elven Archer', lore: 'Mirkwood Rangers',
    cost: 100, damage: 30, range: 160, fireRate: 450,
    color: 0x88ddaa, projColor: 0xccffdd, projSpeed: 560,
    splashRadius: 0, slowFactor: 1, slowDuration: 0, boostMult: 0,
    description: 'Rapid silver arrows. +50% vs Orcs',
  },
  rocket: {
    type: 'rocket', name: 'Catapult', lore: 'Gondor Siege Works',
    cost: 150, damage: 85, range: 190, fireRate: 1400,
    color: 0xff7722, projColor: 0xff9944, projSpeed: 240,
    splashRadius: 65, slowFactor: 1, slowDuration: 0, boostMult: 0,
    description: 'Flaming boulder, splash. +50% vs Uruk-hai',
  },
  slow: {
    type: 'slow', name: 'Wizard', lore: 'The Order of Istari',
    cost: 125, damage: 10, range: 165, fireRate: 380,
    color: 0xaabbff, projColor: 0xddeeff, projSpeed: 320,
    splashRadius: 0, slowFactor: 0.45, slowDuration: 2000, boostMult: 0,
    description: 'Frost magic, slows. +50% vs Warg Riders',
  },
  booster: {
    type: 'booster', name: 'Ent', lore: 'Shepherds of the Forest',
    cost: 200, damage: 0, range: 140, fireRate: 0,
    color: 0x66bb33, projColor: 0x66bb33, projSpeed: 0,
    splashRadius: 0, slowFactor: 1, slowDuration: 0, boostMult: 0.3,
    description: '+30% dmg to nearby towers',
  },
};

// ─── Enemy definitions ────────────────────────────────────────────────────────
export type EnemyType = 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'grey';

export interface EnemyDef {
  type:        EnemyType;
  name:        string;
  hp:          number;
  speed:       number;
  reward:      number;
  bonusPoints: number;
  color:       number;
  size:        number;
}

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  blue:   { type: 'blue',   name: 'Orc Scout',    hp: 80,  speed: 90,  reward: 10, bonusPoints: 0, color: 0x44bb33, size: 12 },
  red:    { type: 'red',    name: 'Uruk-hai',      hp: 130, speed: 65,  reward: 15, bonusPoints: 0, color: 0xcc2200, size: 14 },
  green:  { type: 'green',  name: 'Berserker',     hp: 165, speed: 55,  reward: 20, bonusPoints: 0, color: 0x99cc00, size: 16 },
  yellow: { type: 'yellow', name: 'Warg Rider',    hp: 60,  speed: 145, reward: 12, bonusPoints: 0, color: 0xcc8833, size: 11 },
  purple: { type: 'purple', name: 'Ringwraith',    hp: 225, speed: 42,  reward: 25, bonusPoints: 0, color: 0x8833cc, size: 18 },
  grey:   { type: 'grey',   name: 'Cave Troll',    hp: 700, speed: 30,  reward: 50, bonusPoints: 5, color: 0x778855, size: 22 },
};

// Elven Archer effective vs Orc Scout (blue), Catapult vs Uruk-hai (red), Wizard vs Warg (yellow)
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
