import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import RegistryConstants from "../RegistryConstants.ts";
import Bullet from "../entities/Bullet.ts";
import Enemy from "../entities/Enemy.ts";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Weapon implements IComponent {
    private static readonly SCORE_STEP_SIZE: number = 10;
    private static readonly PROJECTILE_STEP_INCREMENT: number = 0.1;
    private static readonly MAX_PROJECTILE_SPEED_MULTIPLIER: number = 2.0;

    public enabled: boolean = true;

    private readonly projectilesPool: Physics.Arcade.Group;
    private readonly projectileConfig: BulletData;
    private readonly enemyDownwardAngleDegrees: number = 90;
    private readonly playerBulletTextureKey: string = 'aqua-bullet-circle';
    private readonly enemyBulletSpriteFrame: string = 'BN';

    constructor(projectilesPool: Physics.Arcade.Group, projectileConfig: BulletData) {
        if (!projectilesPool) {
            console.error("Weapon 'projectilesPool' cannot be null or undefined");
        }

        this.projectilesPool = projectilesPool;
        this.projectileConfig = projectileConfig;
    }

    private getTieredProjectileSpeed(shooterEntity: Entity): number {
        const currentPlayerScore: number = Math.max(
            0,
            Number(shooterEntity.scene?.registry?.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0)
        );
        const completedScoreSteps: number = Math.floor(currentPlayerScore / Weapon.SCORE_STEP_SIZE);
        const rawMultiplier: number = 1 + completedScoreSteps * Weapon.PROJECTILE_STEP_INCREMENT;
        const speedMultiplier: number = Math.min(
            Number(rawMultiplier.toFixed(2)),
            Weapon.MAX_PROJECTILE_SPEED_MULTIPLIER
        );

        return this.projectileConfig.speed * speedMultiplier;
    }

    public shoot(shooterEntity: Entity, spriteFrameName?: string) {
        if (!this.enabled || !this.projectilesPool) {
            return;
        }

        const projectile = this.projectilesPool.get() as Bullet;
        if (!projectile) {
            return;
        }

        const isEnemyShooter = shooterEntity instanceof Enemy;
        const resolvedFrameName: string = spriteFrameName
            ?? (isEnemyShooter ? this.enemyBulletSpriteFrame : this.playerBulletTextureKey);

        const aimAngleRadians: number = isEnemyShooter
            ? Phaser.Math.DegToRad(this.enemyDownwardAngleDegrees)
            : shooterEntity.rotation;

        const forwardVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0).rotate(aimAngleRadians);
        const currentProjectileSpeed: number = this.getTieredProjectileSpeed(shooterEntity);
        const projectileVelocity: Phaser.Math.Vector2 = forwardVector.clone().scale(currentProjectileSpeed);

        const spawnOffset: number = shooterEntity.arcadeBody?.radius ?? 0;
        const spawnX: number = shooterEntity.x + forwardVector.x * spawnOffset;
        const spawnY: number = shooterEntity.y + forwardVector.y * spawnOffset;

        projectile.enable(
            spawnX,
            spawnY,
            projectileVelocity.x,
            projectileVelocity.y,
            this.projectileConfig,
            resolvedFrameName
        );
    }
}