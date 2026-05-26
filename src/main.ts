import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './GameConfig';
import { GameScene } from './scenes/GameScene';
import { MapSelectScene } from './scenes/MapSelectScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloaderScene } from './scenes/PreloaderScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#08030a',
  scene: [PreloaderScene, MenuScene, MapSelectScene, GameScene, UIScene],
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    antialiasGL: true,
  },
};

new Phaser.Game(config);
