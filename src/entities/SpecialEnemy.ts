import type { SpecialEnemyConfig } from '../gameData/SpecialEnemyData.ts';
import Enemy from './Enemy.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";

export default class SpecialEnemy extends Enemy {
    private static readonly SPRITE_SIZE: number = 120;
    private static readonly ATLAS_KEY: string = 'sprites';
    private static readonly SHOOT_ANIMATION_KEY: string = 'ufoBlueShoot';
    private static readonly IDLE_FRAME: string = 'ufoBlue';
    private static readonly CHARGE_FRAME: string = 'ufoBlue-shoot0';
    private static readonly SHOOT_FRAME: string = 'ufoBlue-shoot1';

    private _enemyConfig?: SpecialEnemyConfig;
    private _oscillationCenterX: number = 0;
    private _oscillationElapsedTime: number = 0;

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, enemyConfig?: SpecialEnemyConfig) {
        const cachedEnemiesData = this.scene.cache.json.get('enemiesConfig') as { specialEnemy?: SpecialEnemyConfig } | undefined;
        this._enemyConfig = enemyConfig ?? cachedEnemiesData?.specialEnemy;

        if (!this._enemyConfig) {
            console.error("SpecialEnemy: configuration 'specialEnemy' introuvable dans le cache JSON 'enemiesConfig'.");
            return;
        }

        this.addComponent(new Health(this._enemyConfig.health, this));
        this.addComponent(new Movement(this._enemyConfig.movement.verticalSpeed));
        this.addComponent(new Weapon(bulletsGroup, this._enemyConfig.weapon.bulletData));

        const healthComponent = this.getComponent(Health);
        healthComponent?.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(0xffffff);

            if (healthComponent.current === 0) {
                this.disableBody();
            }

            this.scene.time.delayedCall(50, () => {
                this.clearTint();

                if (healthComponent.current === 0) {
                    this.disable();
                }
            });
        });

        this.setTexture(SpecialEnemy.ATLAS_KEY, SpecialEnemy.IDLE_FRAME);
        this.setDisplaySize(SpecialEnemy.SPRITE_SIZE, SpecialEnemy.SPRITE_SIZE);
        this.angle = 0;

        this._shootTimerConfig = {
            delay: this._enemyConfig.weapon.shootDelay,
            callback: this.shootSpreadAttack,
            callbackScope: this,
            loop: true,
        };
        this._shootTimer = this.scene.time.addEvent(this._shootTimerConfig);

        if (!this.scene.anims.exists(SpecialEnemy.SHOOT_ANIMATION_KEY)) {
            this.scene.anims.create({
                key: SpecialEnemy.SHOOT_ANIMATION_KEY,
                frames: [
                    { key: SpecialEnemy.ATLAS_KEY, frame: SpecialEnemy.IDLE_FRAME },
                    { key: SpecialEnemy.ATLAS_KEY, frame: SpecialEnemy.CHARGE_FRAME },
                    { key: SpecialEnemy.ATLAS_KEY, frame: SpecialEnemy.SHOOT_FRAME },
                ],
                frameRate: 4,
            });
        }

        this.arcadeBody.setCircle(this.displayWidth / 2);
    }

    public enable(x: number, y: number) {
        if (!this._enemyConfig || !this._shootTimer) {
            console.error("SpecialEnemy: impossible d'activer l'ennemi");
            return;
        }

        this._oscillationCenterX = x;
        this._oscillationElapsedTime = 0;

        this.setTexture(SpecialEnemy.ATLAS_KEY, SpecialEnemy.IDLE_FRAME);
        this.setDisplaySize(SpecialEnemy.SPRITE_SIZE, SpecialEnemy.SPRITE_SIZE);
        this.enableBody(true, x, y - this.displayHeight, true, true);
        this._shootTimer.reset(this._shootTimerConfig);

        const healthComponent = this.getComponent(Health);
        healthComponent?.heal(healthComponent.max, false);
    }

    public disable() {
        this.stop();
        this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);

        this.disableBody(true, true);
        if (this._shootTimer) {
            this._shootTimer.paused = true;
        }
    }

    private shootSpreadAttack() {
        if (!this._enemyConfig || !this.active)
            return;

        this.play(SpecialEnemy.SHOOT_ANIMATION_KEY);
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            if (!this.active || !this._enemyConfig)
                return;

            this.setTexture(SpecialEnemy.ATLAS_KEY, SpecialEnemy.IDLE_FRAME);
            this.setDisplaySize(SpecialEnemy.SPRITE_SIZE, SpecialEnemy.SPRITE_SIZE);

            this.getComponent(Weapon)?.shootSpread(
                this,
                this._enemyConfig.weapon.bulletCount,
                this._enemyConfig.weapon.spreadAngleDeg
            );
            this.scene.sound.play('sfx_laser2');
        });
    }

    protected override moveEnemy(deltaTime: number) {
        if (!this.active || !this._enemyConfig)
            return;

        const effectiveDeltaTime = this.isTinted ? deltaTime * 0.5 : deltaTime;
        this._oscillationElapsedTime += effectiveDeltaTime;

        this.getComponent(Movement)?.moveSinusoidally(
            this,
            effectiveDeltaTime,
            this._oscillationCenterX,
            this._oscillationElapsedTime,
            this._enemyConfig.movement.horizontalAmplitude,
            this._enemyConfig.movement.oscillationFrequency
        );
    }
}