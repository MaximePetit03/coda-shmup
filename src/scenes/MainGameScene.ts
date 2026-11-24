import {Scene, GameObjects} from 'phaser';
import Health from "../components/Health.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import SaveConstants from "../SaveConstants.ts";
import EntityManager from "../managers/EntityManager.ts";
import GameConstants from "../GameConstants.ts";

export default class MainGameScene extends Scene {
    private static readonly BASE_BG_SCROLL_SPEED: number = 0.1;
    private static readonly BASE_PLANET_FALL_SPEED: number = 0.4;
    private static readonly SCORE_STEP_SIZE: number = 10;
    private static readonly SCROLL_STEP_INCREMENT: number = 0.1;
    private static readonly MAX_SCROLL_MULTIPLIER: number = 2.5;

    private backgroundTile: GameObjects.TileSprite;
    private scrollingPlanet: GameObjects.Image;
    private saveManager: SaveManager;
    private entityManager: EntityManager;

    constructor() {
        super(GameConstants.SceneKeys.MAIN_GAME);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        if (!this.saveManager) {
            console.error('SaveManager plugin not found');
        }
        this.saveManager?.load();

        const backgroundMargin: number = 512;
        this.backgroundTile = this.add.tileSprite(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width + backgroundMargin,
            this.cameras.main.height + backgroundMargin,
            'bg'
        ).setTileScale(2);

        this.scrollingPlanet = this.add.image(0, -512, 'planet').setOrigin(0);

        if (!this.entityManager) {
            console.error('EntityManager plugin not found');
        }

        const spawnedPlayer = this.entityManager.initAndSpawnPlayer();
        spawnedPlayer.getComponent(Health)?.once(Health.DEATH_EVENT, () => {
            spawnedPlayer.disableBody(true, true);
            this.time.delayedCall(1000, this.endGame, [], this);
        }, this);

        this.entityManager.initEnemies();
        this.entityManager.initGroupCollisions();

        if (this.input.keyboard) {
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => this.scene.restart());
        } else {
            console.error('No keyboard input');
        }

        this.registry.set(RegistryConstants.Keys.PLAYER_SCORE, 0);

        console.log("MainGameScene created");
    }

    private endGame() {
        const bestScore: number = Number(this.saveManager.getData(SaveConstants.Keys.PLAYER_BEST_SCORE) ?? 0);
        const currentScore: number = Number(this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0);
        if (currentScore > bestScore) {
            this.saveManager.setData(SaveConstants.Keys.PLAYER_BEST_SCORE, currentScore);
            console.log("New Best Score: " + currentScore);
        }

        this.scene.start(GameConstants.SceneKeys.GAME_OVER);
    }

    private getScoreTierMultiplier(): number {
        const currentPlayerScore: number = Math.max(
            0,
            Number(this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0)
        );
        const completedScoreSteps: number = Math.floor(currentPlayerScore / MainGameScene.SCORE_STEP_SIZE);
        const rawMultiplier: number = 1 + completedScoreSteps * MainGameScene.SCROLL_STEP_INCREMENT;

        return Math.min(Number(rawMultiplier.toFixed(2)), MainGameScene.MAX_SCROLL_MULTIPLIER);
    }

    update(_timeSinceLaunch: number, deltaTime: number) {
        const scoreMultiplier: number = this.getScoreTierMultiplier();

        this.backgroundTile.tilePositionY -= MainGameScene.BASE_BG_SCROLL_SPEED * scoreMultiplier * deltaTime;
        this.scrollingPlanet.y += MainGameScene.BASE_PLANET_FALL_SPEED * scoreMultiplier * deltaTime;
    }
}