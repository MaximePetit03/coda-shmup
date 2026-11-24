import {Input, Scene} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import type {BulletData} from "../gameData/BulletData.ts";
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";

export default class Player extends Entity {
    private static readonly MAX_ENEMIES_BY_SHIP_ID: Record<number, number> = {
        1: 5,
        2: 7,
        3: 9,
    };

    private static readonly ENEMY_FIRE_INTERVAL_MS_BY_SHIP_ID: Record<number, number> = {
        1: 3000,
        2: 3000,
        3: 1000,
    };

    private static readonly DEFAULT_MAX_SIMULTANEOUS_ENEMIES: number = 7;
    private static readonly DEFAULT_ENEMY_FIRE_INTERVAL_MS: number = 2000;

    private readonly playerBulletConfig: BulletData = {
        width: 50,
        height: 50,
        color: 0x00ffff,
        speed: 2048,
        damage: 1
    };

    private readonly cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    private moveUpKey: Phaser.Input.Keyboard.Key;
    private moveLeftKey: Phaser.Input.Keyboard.Key;
    private moveDownKey: Phaser.Input.Keyboard.Key;
    private moveRightKey: Phaser.Input.Keyboard.Key;
    private fireKey: Phaser.Input.Keyboard.Key;

    private activeShipConfig: PlayerShipData;
    private maxSimultaneousEnemies: number = Player.DEFAULT_MAX_SIMULTANEOUS_ENEMIES;
    private enemyFireIntervalMs: number = Player.DEFAULT_ENEMY_FIRE_INTERVAL_MS;
    private shotCooldownSeconds: number;
    private lastShotTimestamp: number;
    private playerAuraRing: Phaser.GameObjects.Arc;

    constructor(scene: Scene, spawnX: number, spawnY: number) {
        super(scene, spawnX, spawnY, 'sprites');

        if (this.scene.input.keyboard) {
            this.cursorKeys = this.scene.input.keyboard.createCursorKeys();

            this.moveUpKey = this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.Z);
            this.moveLeftKey = this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.Q);
            this.moveDownKey = this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.S);
            this.moveRightKey = this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.D);
            this.fireKey = this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ENTER);

            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ONE).on('down', () => this.selectPlayerShip(1));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.TWO).on('down', () => this.selectPlayerShip(2));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.THREE).on('down', () => this.selectPlayerShip(3));
        }
    }

    public getMaxSimultaneousEnemies(): number {
        return this.maxSimultaneousEnemies;
    }

    public getEnemyFireIntervalMs(): number {
        return this.enemyFireIntervalMs;
    }

    public init(bulletsPool: Phaser.Physics.Arcade.Group) {
        this.addComponent(new Health(10, this));
        this.addComponent(new Movement());
        this.addComponent(new Weapon(bulletsPool, this.playerBulletConfig));

        this.angle = -90;
        this.selectPlayerShip(3);

        const ringRadius: number = 36;
        this.playerAuraRing = this.scene.add.circle(this.x, this.y, ringRadius);
        this.playerAuraRing.setStrokeStyle(2, 0x00ffff, 0.8);
        this.playerAuraRing.setDepth(this.depth - 1);

        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.playerAuraRing?.destroy();
        });

        this.shotCooldownSeconds = 0.5;
        this.lastShotTimestamp = 0;

        this.getComponent(Health)?.on(Health.CHANGE_EVENT, () => {
            this.arcadeBody.setEnable(false);

            this.scene.time.delayedCall(50, () => {
                if (this.active) {
                    this.arcadeBody.setEnable(true);
                }
            });
        });
    }

    public selectPlayerShip(shipId: number) {
        const shipsCatalog = this.scene.cache.json.get('playerShips') as PlayerShipsData;
        this.activeShipConfig = shipsCatalog[shipId];

        this.maxSimultaneousEnemies = Player.MAX_ENEMIES_BY_SHIP_ID[shipId] ?? Player.DEFAULT_MAX_SIMULTANEOUS_ENEMIES;
        this.enemyFireIntervalMs = Player.ENEMY_FIRE_INTERVAL_MS_BY_SHIP_ID[shipId] ?? Player.DEFAULT_ENEMY_FIRE_INTERVAL_MS;

        this.setTexture('sprites', this.activeShipConfig.texture);
        const collisionConfig = this.activeShipConfig.body;
        this.arcadeBody.setCircle(collisionConfig.radius, collisionConfig.offsetX, collisionConfig.offsetY);

        this.getComponent(Movement)?.setSpeed(this.activeShipConfig.movementSpeed);
        this.scene.events.emit('player:ship-changed', this.maxSimultaneousEnemies, this.enemyFireIntervalMs);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        const movementComponent = this.getComponent(Movement);

        if (this.moveLeftKey?.isDown) {
            if (this.cursorKeys?.shift.isDown) {
                this.angle -= this.activeShipConfig.movementSpeed * deltaTime;
            } else {
                movementComponent?.moveHorizontally(this, -deltaTime);
            }
        } else if (this.moveRightKey?.isDown) {
            if (this.cursorKeys?.shift.isDown) {
                this.angle += this.activeShipConfig.movementSpeed * deltaTime;
            } else {
                movementComponent?.moveHorizontally(this, deltaTime);
            }
        }

        if (this.moveUpKey?.isDown) {
            movementComponent?.moveVertically(this, -deltaTime);
        } else if (this.moveDownKey?.isDown) {
            movementComponent?.moveVertically(this, deltaTime);
        }

        this.x = Phaser.Math.Clamp(this.x, this.displayWidth / 2, this.scene.cameras.main.width - this.displayWidth / 2);
        this.y = Phaser.Math.Clamp(this.y, this.displayHeight / 2, this.scene.cameras.main.height - this.displayHeight / 2);

        if (this.playerAuraRing) {
            this.playerAuraRing.setPosition(this.x, this.y);
            this.playerAuraRing.setVisible(this.active && this.visible);
        }

        // Press enter to shoot
        if (this.fireKey?.isDown) {
            if (timeSinceLaunch - this.lastShotTimestamp > this.shotCooldownSeconds * 500) {
                this.getComponent(Weapon)?.shoot(this);
                this.scene.sound.play('sfx_laser1');

                this.lastShotTimestamp = timeSinceLaunch;
            }
        }
    }
}