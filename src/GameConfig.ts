export const GAME_WIDTH  = 1920;
export const GAME_HEIGHT = 1080;
export const CELL        = 80;
export const COLS        = GAME_WIDTH  / CELL;   // 24
export const ROWS        = GAME_HEIGHT / CELL;   // 13

export const INTEREST_RATE   = 0.05;
export const WAVE_PREP_TIME  = 3000;  // Faster pacing
export const WAVES_TO_WIN    = 20;    // Win condition

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
    id: 'shire', name: 'Arcade', subtitle: 'Training Ground',
    difficulty: 1, theme: 'shire', accentColor: 0x00ff00, bgColor: 0x0a0a1a,
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
    description: 'Start your neon journey here. Learn the basics.',
  },
  {
    id: 'moria', name: 'Neon City', subtitle: 'Digital Streets',
    difficulty: 2, theme: 'moria', accentColor: 0x00ffff, bgColor: 0x0a0a1a,
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
    description: 'Navigate the neon-lit city streets.',
  },
  {
    id: 'mordor', name: 'Cyber Storm', subtitle: 'Digital Chaos',
    difficulty: 3, theme: 'mordor', accentColor: 0xff0088, bgColor: 0x0a0a1a,
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
    description: 'Standard arcade challenge. Can you handle it?',
  },
  {
    id: 'lothlorien', name: 'Digital Garden', subtitle: 'Neon Paradise',
    difficulty: 4, theme: 'lothlorien', accentColor: 0x00ffff, bgColor: 0x0a0a1a,
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
    id: 'helmsdeep', name: 'The Grid', subtitle: 'Fortress Level',
    difficulty: 5, theme: 'helmsdeep', accentColor: 0xff00ff, bgColor: 0x0a0a1a,
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
    description: 'The final fortress. Twelve brutal turns—only the elite survive.',
  },
  {
    id: 'pathdead', name: 'Void Zone', subtitle: 'Final Challenge',
    difficulty: 6, theme: 'pathdead', accentColor: 0x44ffaa, bgColor: 0x0a0a1a,
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
    description: 'The digital void awaits. Only the bravest commanders reach this realm.',
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
    type: 'laser', name: 'Pulse', lore: 'Rapid Fire',
    cost: 60, damage: 35, range: 160, fireRate: 350,
    color: 0x00ffff, projColor: 0x00ffff, projSpeed: 560,
    splashRadius: 0, slowFactor: 1, slowDuration: 0, boostMult: 0,
    description: 'Cyan pulse tower. +50% vs Pixels',
  },
  rocket: {
    type: 'rocket', name: 'Blast', lore: 'Explosive Power',
    cost: 100, damage: 90, range: 190, fireRate: 1100,
    color: 0xff00ff, projColor: 0xff00ff, projSpeed: 240,
    splashRadius: 65, slowFactor: 1, slowDuration: 0, boostMult: 0,
    description: 'Magenta blast. +50% vs Viruses',
  },
  slow: {
    type: 'slow', name: 'Freeze', lore: 'Temporal Lock',
    cost: 90, damage: 12, range: 165, fireRate: 300,
    color: 0x00ffff, projColor: 0x00ffff, projSpeed: 320,
    splashRadius: 0, slowFactor: 0.45, slowDuration: 2000, boostMult: 0,
    description: 'Freeze ray. +50% vs Sparks',
  },
  booster: {
    type: 'booster', name: 'Boost', lore: 'Power Amplifier',
    cost: 140, damage: 25, range: 140, fireRate: 2000,
    color: 0x00ff00, projColor: 0x00ff00, projSpeed: 0,
    splashRadius: 0, slowFactor: 1, slowDuration: 0, boostMult: 0.3,
    description: 'Green amplifier. +30% dmg to allies',
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
  blue:   { type: 'blue',   name: 'Pixel',      hp: 80,  speed: 90,  reward: 10, bonusPoints: 0, color: 0x00ffff, size: 12 },
  red:    { type: 'red',    name: 'Virus',      hp: 130, speed: 65,  reward: 15, bonusPoints: 0, color: 0xff0088, size: 14 },
  green:  { type: 'green',  name: 'Glitch',     hp: 165, speed: 55,  reward: 20, bonusPoints: 0, color: 0x00ff00, size: 16 },
  yellow: { type: 'yellow', name: 'Spark',      hp: 60,  speed: 145, reward: 12, bonusPoints: 0, color: 0xffff00, size: 11 },
  purple: { type: 'purple', name: 'Nova',       hp: 225, speed: 42,  reward: 25, bonusPoints: 0, color: 0xaa00ff, size: 18 },
  grey:   { type: 'grey',   name: 'Core',       hp: 700, speed: 30,  reward: 50, bonusPoints: 5, color: 0xff00ff, size: 22 },
};

// Pulse effective vs Pixel (blue), Blast vs Virus (red), Freeze vs Spark (yellow)
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
  const base = 10 + wave * 3;  // More enemies (was 8 + wave * 2)
  if (wave % 5 === 0) {
    return [{ type: 'grey', count: 2 + Math.floor(wave / 5), delay: 2500 }];
  }
  const primary   = PATTERN[(wave - 1) % PATTERN.length];
  const secondary = PATTERN[(wave + 2) % PATTERN.length];
  if (wave < 4) return [{ type: primary, count: base, delay: 1000 }];
  return [
    { type: primary,   count: Math.ceil(base * 0.6),  delay: 1000 },
    { type: secondary, count: Math.floor(base * 0.4), delay: 1400 },
  ];
}
