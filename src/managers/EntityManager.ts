import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
import Bullet from "../entities/Bullet.ts";
import Enemy from "../entities/Enemy.ts";
import SpecialEnemy from "../entities/SpecialEnemy.ts";
import Player from "../entities/Player.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class EntityManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'EntityManager';
    public static readonly MAPPING_NAME: string = 'entityManager';

    private readonly bulletGroupConfig = {
        classType: Bullet,
        maxSize: 256,
        runChildUpdate: true,
        createCallback: (bullet: GameObjects.GameObject) => {
            (bullet as Bullet).init();
        }
    };

    private _player: Player;
    private _playerBullets: Physics.Arcade.Group;
    private _enemies: Physics.Arcade.Group;
    private _specialEnemies: Physics.Arcade.Group;
    private _enemyBullets: Physics.Arcade.Group;
    private _spawnedEnemiesCount: number = 0;
    private readonly _specialEnemyInterval: number = 10;

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, EntityManager.PLUGIN_KEY);

        console.log("[EntityManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[EntityManager] Destroyed");
    }

    public initAndSpawnPlayer(): Player {
        this._playerBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(64, this._playerBullets);

        this._player = new Player(this.scene!, this.scene!.cameras.main.centerX, this.scene!.cameras.main.height - 128);
        this._player.init(this._playerBullets);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    public initEnemies(): Physics.Arcade.Group {
        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(256, this._enemyBullets);

        this._enemies = this.scene!.physics.add.group({
            classType: Enemy,
            defaultKey: 'sprites',
            defaultFrame: 'ufoRed',
            createCallback: (enemy) => {
                (enemy as Enemy).init(this._enemyBullets);
            }
        });

        this._specialEnemies = this.scene!.physics.add.group({
            classType: SpecialEnemy,
            defaultKey: 'sprites',
            defaultFrame: 'ufoRed',
            createCallback: (specialEnemy) => {
                (specialEnemy as SpecialEnemy).init(this._enemyBullets);
            }
        });

        // Spawn enemies indefinitely
        this.scene!.time.addEvent({
            delay: 1500,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        console.log("[EntityManager] Enemies initialized");

        return this._enemies;
    }

    public initGroupCollisions() {
        this.scene!.physics.add.overlap(this._playerBullets, this._enemies, (bullet, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            (bullet as Bullet).disable();
            (enemy as Enemy).getComponent(Health)?.damage((bullet as Bullet).damage);
        });

        this.scene!.physics.add.overlap(this._playerBullets, this._specialEnemies, (bullet, specialEnemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            (bullet as Bullet).disable();
            (specialEnemy as SpecialEnemy).getComponent(Health)?.damage((bullet as Bullet).damage);
        });

        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.scene?.cameras.main.shake(100, 0.01);
        });

        this.scene!.physics.add.overlap(this._player, this._enemies, (player, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const enemyHealth = (enemy as Enemy).getComponent(Health);
            enemyHealth?.damage(enemyHealth?.max);

            const playerHealth = (player as Player).getComponent(Health);
            playerHealth?.damage(1);

            this.scene?.cameras.main.shake(100, 0.03);
        });

        this.scene!.physics.add.overlap(this._player, this._specialEnemies, (player, specialEnemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const specialEnemyHealth = (specialEnemy as SpecialEnemy).getComponent(Health);
            specialEnemyHealth?.damage(specialEnemyHealth?.max);

            const playerHealth = (player as Player).getComponent(Health);
            playerHealth?.damage(1);

            this.scene?.cameras.main.shake(100, 0.03);
        });

        console.log("[EntityManager] Group collisions initialized");
    }

    private spawnEnemy() {
        const activeEnemiesCount = this._enemies.countActive(true) + this._specialEnemies.countActive(true);
        if (activeEnemiesCount >= 5) {
            return;
        }

        const spawnY = 0;
        this._spawnedEnemiesCount += 1;

        if (this._spawnedEnemiesCount % this._specialEnemyInterval === 0) {
            const specialEnemy = this._specialEnemies.get() as SpecialEnemy | null;
            if (!specialEnemy) {
                return;
            }

            // Point fixe uniquement pour SpecialEnemy
            const specialSpawnX = this.scene!.scale.width / 2;
            specialEnemy.enable(specialSpawnX, spawnY);
            this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, specialEnemy);
            console.log("[EntityManager] SpecialEnemy spawned");
            return;
        }

        // Les ennemis classiques gardent leur position X aléatoire
        const randomSpawnX = Phaser.Math.Between(64, this.scene!.cameras.main.width - 64);
        const enemy = this._enemies.get() as Enemy | null;
        if (!enemy) {
            return;
        }

        enemy.enable(randomSpawnX, spawnY);
        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);
        console.log("[EntityManager] Enemy spawned");
    }
}