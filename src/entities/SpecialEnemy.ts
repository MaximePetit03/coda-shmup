import type { SpecialEnemyConfig } from '../gameData/SpecialEnemyData.ts';
import Enemy from './Enemy.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";

export default class SpecialEnemy extends Enemy {
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

        // Listen once per enemy, not on every enable(): pooled enemies are reused many times
        const health = this.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(0xffffff);

            if (health.current === 0) {
                this.disableBody();
            }

            this.scene.time.delayedCall(50, () => {
                this.clearTint();

                if (health.current === 0) {
                    this.disable();
                }
            });
        });

        this.angle = 90;

        this._shootTimerConfig = {
            delay: this._enemyConfig.weapon.shootDelay,
            callback: this.shootSpreadAttack,
            callbackScope: this,
            loop: true,
        };
        this._shootTimer = this.scene.time.addEvent(this._shootTimerConfig);

        // Create animation when enemy is about to shoot in the global animation manager
        if (!this.scene.anims.exists('ufoShoot')) {
            this.scene.anims.create({
                key: 'ufoShoot',
                frames: [
                    { key: 'sprites', frame: 'ufoRed' },
                    { key: 'sprites', frame: 'ufoRed-shoot0' },
                    { key: 'sprites', frame: 'ufoRed-shoot1' },
                ],
                frameRate: 4,
            });
        }

        this.arcadeBody.setCircle(this.displayWidth / 2);
    }

    public enable(x: number, y: number) {
        if (!this._enemyConfig || !this._shootTimer) {
            console.error("SpecialEnemy: impossible d'activer l'ennemi, initialisation incomplète.");
            return;
        }

        this._oscillationCenterX = x;
        this._oscillationElapsedTime = 0;

        this.enableBody(true, x, y - this.displayHeight, true, true);
        this._shootTimer.reset(this._shootTimerConfig);

        // Restore health, in case the enemy is reused from the pool, without emitting events
        const health = this.getComponent(Health);
        health?.heal(health.max, false);
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
        if (!this._enemyConfig)
            return;

        this.play('ufoShoot');
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.setTexture('sprites', 'ufoRed');

            if (!this.active || !this._enemyConfig)
                return;

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