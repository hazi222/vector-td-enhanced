import Phaser from 'phaser';
import { EnemyType, WaveEntry, getWaveEntries } from '../GameConfig';

interface SpawnJob { type: EnemyType; remaining: number; timer: number; delay: number; }

export class WaveSystem {
  private scene:      Phaser.Scene;
  private jobs:       SpawnJob[] = [];
  private waveNum:    number = 0;
  private spawning:   boolean = false;
  private onSpawn:    (type: EnemyType) => void;
  private onComplete: () => void;

  constructor(
    scene: Phaser.Scene,
    onSpawn:    (type: EnemyType) => void,
    onComplete: () => void,
  ) {
    this.scene      = scene;
    this.onSpawn    = onSpawn;
    this.onComplete = onComplete;
  }

  get currentWave(): number { return this.waveNum; }
  get isSpawning():  boolean { return this.spawning; }

  startWave(): void {
    this.waveNum++;
    const entries: WaveEntry[] = getWaveEntries(this.waveNum);
    this.jobs = entries.map(e => ({
      type:      e.type,
      remaining: e.count,
      timer:     0,
      delay:     e.delay,
    }));
    this.spawning = true;
  }

  update(delta: number): void {
    if (!this.spawning) return;

    for (const job of this.jobs) {
      if (job.remaining <= 0) continue;
      job.timer -= delta;
      if (job.timer <= 0) {
        this.onSpawn(job.type);
        job.remaining--;
        job.timer = job.delay;
      }
    }

    if (this.jobs.every(j => j.remaining <= 0)) {
      this.spawning   = false;
      this.onComplete();
    }
  }
}
