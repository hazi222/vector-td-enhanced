export const GAME_WIDTH  = 1280;
export const GAME_HEIGHT = 720;
export const CELL        = 40;
export const COLS        = GAME_WIDTH  / CELL;   // 32
export const ROWS        = GAME_HEIGHT / CELL;   // 18

export const INTEREST_RATE  = 0.05;
export const WAVE_PREP_TIME = 5000;

// ─── Map definitions ──────────────────────────────────────────────────────────
export type MapTheme = 'shire' | 'moria' | 'mordor' | 'lothlorien' | 'helmsdeep' | 'pathdead';

export interface MapDef {
  id:             string;
  name:           string;
  subtitle:       string;
  difficulty:     number;   // 1-6
  theme:          MapTheme;
  accentColor:    number;
  bgColor:        number;
  path:           { x: number; y: number }[];
  startGold:      number;
  startLives:     number;
  enemyHpMult:    number;
  enemySpeedMult: number;
  description:    string;
}

export const MAPS: MapDef[] = [
  {
    id: 'shire', name: 'The Shire', subtitle: 'Green Hill Country',
    difficulty: 1, theme: 'shire', accentColor: 0x88cc44, bgColor: 0x1a3a0a,
    path: [
      { x: -CELL,             y: CELL * 8  },
      { x: CELL * 14,         y: CELL * 8  },
      { x: CELL * 14,         y: CELL * 3  },
      { x: CELL * 25,         y: CELL * 3  },
      { x: CELL * 25,         y: CELL * 13 },
      { x: GAME_WIDTH + CELL, y: CELL * 13 },
    ],
    startGold: 1000, startLives: 25,
    enemyHpMult: 0.70, enemySpeedMult: 0.85,
    description: 'Rolling green hills, simple path. Ideal for new defenders.',
  },
  {
    id: 'moria', name: 'Mines of Moria', subtitle: 'Dwarven Hall',
    difficulty: 2, theme: 'moria', accentColor: 0x4488ff, bgColor: 0x080a18,
    path: [
      { x: -CELL,             y: CELL * 3  },
      { x: CELL * 8,          y: CELL * 3  },
      { x: CELL * 8,          y: CELL * 13 },
      { x: CELL * 15,         y: CELL * 13 },
      { x: CELL * 15,         y: CELL * 3  },
      { x: CELL * 23,         y: CELL * 3  },
      { x: CELL * 23,         y: CELL * 13 },
      { x: GAME_WIDTH + CELL, y: CELL * 13 },
    ],
    startGold: 1000, startLives: 22,
    enemyHpMult: 0.85, enemySpeedMult: 0.92,
    description: 'Ancient dwarven tunnels. Enemies wind through dark passages.',
  },
  {
    id: 'mordor', name: 'Mordor', subtitle: 'Volcanic Wasteland',
    difficulty: 3, theme: 'mordor', accentColor: 0xff4400, bgColor: 0x1a0d10,
    path: [
      { x: -CELL,             y: CELL * 5  },
      { x: CELL * 9,          y: CELL * 5  },
      { x: CELL * 9,          y: CELL * 14 },
      { x: CELL * 20,         y: CELL * 14 },
      { x: CELL * 20,         y: CELL * 5  },
      { x: CELL * 28,         y: CELL * 5  },
      { x: CELL * 28,         y: CELL * 14 },
      { x: GAME_WIDTH + CELL, y: CELL * 14 },
    ],
    startGold: 1000, startLives: 20,
    enemyHpMult: 1.00, enemySpeedMult: 1.00,
    description: 'The dark land of shadow. Standard challenge for seasoned commanders.',
  },
  {
    id: 'lothlorien', name: 'Lothlórien', subtitle: 'The Golden Wood',
    difficulty: 4, theme: 'lothlorien', accentColor: 0xddcc44, bgColor: 0x0d1a04,
    path: [
      { x: -CELL,             y: CELL * 4  },
      { x: CELL * 5,          y: CELL * 4  },
      { x: CELL * 5,          y: CELL * 13 },
      { x: CELL * 11,         y: CELL * 13 },
      { x: CELL * 11,         y: CELL * 4  },
      { x: CELL * 19,         y: CELL * 4  },
      { x: CELL * 19,         y: CELL * 13 },
      { x: CELL * 26,         y: CELL * 13 },
      { x: CELL * 26,         y: CELL * 4  },
      { x: GAME_WIDTH + CELL, y: CELL * 4  },
    ],
    startGold: 1000, startLives: 18,
    enemyHpMult: 1.25, enemySpeedMult: 1.10,
    description: 'The enchanted forest winds with many turns. Tougher foes approach.',
  },
  {
    id: 'helmsdeep', name: "Helm's Deep", subtitle: 'Hornburg Valley',
    difficulty: 5, theme: 'helmsdeep', accentColor: 0xaabbcc, bgColor: 0x10161c,
    path: [
      { x: -CELL,             y: CELL * 3  },
      { x: CELL * 4,          y: CELL * 3  },
      { x: CELL * 4,          y: CELL * 13 },
      { x: CELL * 10,         y: CELL * 13 },
      { x: CELL * 10,         y: CELL * 3  },
      { x: CELL * 16,         y: CELL * 3  },
      { x: CELL * 16,         y: CELL * 13 },
      { x: CELL * 21,         y: CELL * 13 },
      { x: CELL * 21,         y: CELL * 6  },
      { x: CELL * 27,         y: CELL * 6  },
      { x: CELL * 27,         y: CELL * 13 },
      { x: GAME_WIDTH + CELL, y: CELL * 13 },
    ],
    startGold: 1000, startLives: 15,
    enemyHpMult: 1.55, enemySpeedMult: 1.20,
    description: 'The fortress under siege. Ten brutal turns test your every tower.',
  },
  {
    id: 'pathdead', name: 'Path of the Dead', subtitle: 'Haunted Pass',
    difficulty: 6, theme: 'pathdead', accentColor: 0x44ffaa, bgColor: 0x040d0a,
    path: [
      { x: -CELL,             y: CELL * 13 },
      { x: CELL * 4,          y: CELL * 13 },
      { x: CELL * 4,          y: CELL * 3  },
      { x: CELL * 9,          y: CELL * 3  },
      { x: CELL * 9,          y: CELL * 13 },
      { x: CELL * 15,         y: CELL * 13 },
      { x: CELL * 15,         y: CELL * 3  },
      { x: CELL * 21,         y: CELL * 3  },
      { x: CELL * 21,         y: CELL * 13 },
      { x: CELL * 26,         y: CELL * 13 },
      { x: CELL * 26,         y: CELL * 3  },
      { x: GAME_WIDTH + CELL, y: CELL * 3  },
    ],
    startGold: 1000, startLives: 12,
    enemyHpMult: 2.00, enemySpeedMult: 1.40,
    description: 'The haunted mountain pass. Only the mightiest commanders survive.',
  },
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
    type: 'laser', name: 'Gondor', lore: 'Tower of the Guard',
    cost: 100, damage: 30, range: 160, fireRate: 450,
    color: 0x7799cc, projColor: 0x99bbff, projSpeed: 560,
    splashRadius: 0, slowFactor: 1, slowDuration: 0, boostMult: 0,
    description: 'Rapid silver arrows. +50% vs Orcs',
  },
  rocket: {
    type: 'rocket', name: 'Dwarves', lore: 'Forges of Erebor',
    cost: 150, damage: 85, range: 190, fireRate: 1400,
    color: 0xff7722, projColor: 0xff9944, projSpeed: 240,
    splashRadius: 65, slowFactor: 1, slowDuration: 0, boostMult: 0,
    description: 'Flaming boulder, splash. +50% vs Uruk-hai',
  },
  slow: {
    type: 'slow', name: 'Elves', lore: 'Mages of Lothlórien',
    cost: 125, damage: 10, range: 165, fireRate: 380,
    color: 0xaabbff, projColor: 0xddeeff, projSpeed: 320,
    splashRadius: 0, slowFactor: 0.45, slowDuration: 2000, boostMult: 0,
    description: 'Frost magic, slows. +50% vs Warg Riders',
  },
  booster: {
    type: 'booster', name: 'Rohan', lore: 'Riders of the Mark',
    cost: 200, damage: 22, range: 140, fireRate: 2400,
    color: 0x66bb33, projColor: 0x88dd55, projSpeed: 0,
    splashRadius: 0, slowFactor: 1, slowDuration: 0, boostMult: 0.3,
    description: 'Stomps enemies in range, +30% dmg to nearby towers',
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
