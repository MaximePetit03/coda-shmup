import type {BulletData} from '../gameData/BulletData.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";

export default class Enemy extends Entity {
    private static readonly ENEMY_SCALE_MULTIPLIER: number = 1.35;
    private static readonly DEFAULT_SHOOT_INTERVAL_MS: number = 2000;

    private readonly enemyBulletConfig: BulletData = {
        width: 400,
        height: 400,
        color: 0xf25f5c,
        speed: 512,
        damage: 1,
    };

    private readonly downwardAngleDegrees: number = 0;
    private enemyScaleMultiplier: number = Enemy.ENEMY_SCALE_MULTIPLIER;
    private currentShootIntervalMs: number = Enemy.DEFAULT_SHOOT_INTERVAL_MS;
    private shootTimerConfig: Phaser.Types.Time.TimerEventConfig;
    private shootTimer: Phaser.Time.TimerEvent;

    private readonly handleShipChanged = (
        _maxSimultaneousEnemies: number,
        nextEnemyFireIntervalMs: number
    ) => {
        if (typeof nextEnemyFireIntervalMs === 'number' && nextEnemyFireIntervalMs > 0) {
            this.updateShootTimerInterval(nextEnemyFireIntervalMs);
        }
    };

    private applyProportionalScaleAndHitbox() {
        this.setScale(this.enemyScaleMultiplier);
        if (this.arcadeBody) {
            this.arcadeBody.setCircle(this.displayWidth / 2);
        }
    }

    private updateShootTimerInterval(nextIntervalMs: number) {
        this.currentShootIntervalMs = nextIntervalMs;

        this.shootTimerConfig = {
            delay: this.currentShootIntervalMs,
            callback: this.shoot,
            callbackScope: this,
            loop: true
        };

        if (this.shootTimer) {
            const wasPaused: boolean = this.shootTimer.paused;
            this.shootTimer.remove(false);
            this.shootTimer = this.scene.time.addEvent(this.shootTimerConfig);
            this.shootTimer.paused = wasPaused;
        }
    }

    public init(bulletsPool: Phaser.Physics.Arcade.Group) {
        this.addComponent(new Health(3, this));
        this.addComponent(new Movement(0.2));
        this.addComponent(new Weapon(bulletsPool, this.enemyBulletConfig));

        const enemyHealth = this.getComponent(Health);
        enemyHealth?.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(0xffffff);

            if (enemyHealth.current === 0) {
                this.disableBody();
            }

            this.scene.time.delayedCall(50, () => {
                this.clearTint();

                if (enemyHealth.current === 0) {
                    this.disable();
                }
            });
        });

        this.setTexture('sprites', 'ufoRed');
        this.angle = this.downwardAngleDegrees;

        this.shootTimerConfig = {
            delay: this.currentShootIntervalMs,
            callback: this.shoot,
            callbackScope: this,
            loop: true
        };
        this.shootTimer = this.scene.time.addEvent(this.shootTimerConfig);
        this.shootTimer.paused = true;

        this.scene.events.off('player:ship-changed', this.handleShipChanged);
        this.scene.events.on('player:ship-changed', this.handleShipChanged);

        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.scene.events.off('player:ship-changed', this.handleShipChanged);
            this.shootTimer?.remove(false);
        });

        if (!this.scene.anims.exists('ufoShoot')) {
            this.scene.anims.create({
                key: 'ufoShoot',
                frames: [
                    {key: 'sprites', frame: 'ufoRed'},
                    {key: 'sprites', frame: 'ufoRed-shoot0'},
                    {key: 'sprites', frame: 'ufoRed-shoot1'}
                ],
                frameRate: 4,
            });
        }

        this.applyProportionalScaleAndHitbox();
    }

    public enable(spawnX: number, spawnY: number) {
        this.setTexture('sprites', 'ufoRed');
        this.angle = this.downwardAngleDegrees;
        this.setScale(this.enemyScaleMultiplier);

        this.enableBody(true, spawnX, spawnY - this.displayHeight, true, true);
        this.applyProportionalScaleAndHitbox();

        this.shootTimerConfig = {
            ...this.shootTimerConfig,
            delay: this.currentShootIntervalMs
        };
        this.shootTimer.paused = false;
        this.shootTimer.reset(this.shootTimerConfig);

        const enemyHealth = this.getComponent(Health);
        enemyHealth?.heal(enemyHealth.max, false);
    }

    public disable() {
        this.stop();
        this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);

        this.disableBody(true, true);
        if (this.shootTimer) {
            this.shootTimer.paused = true;
        }
    }

    private shoot() {
        this.play('ufoShoot');
        this.setScale(this.enemyScaleMultiplier);

        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.setTexture('sprites', 'ufoRed');
            this.angle = this.downwardAngleDegrees;
            this.applyProportionalScaleAndHitbox();

            this.getComponent(Weapon)?.shoot(this);
            this.scene.sound.play('sfx_laser2');
        });
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        if (this.y > this.scene.cameras.main.height + this.displayHeight) {
            this.disable();
        }

        if (!this.isTinted) {
            this.getComponent(Movement)?.moveVertically(this, deltaTime);
        } else {
            this.getComponent(Movement)?.moveVertically(this, deltaTime * 0.5);
        }
    }
}