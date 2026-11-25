import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import Bullet from "../entities/Bullet.ts";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Weapon implements IComponent {
    public enabled: boolean = true;

    private readonly _bullets: Physics.Arcade.Group;
    private readonly _bulletData: BulletData;

    constructor(bullets: Physics.Arcade.Group, bulletData: BulletData) {
        if (!bullets) {
            console.error("Weapon 'bullets' group cannot be null or undefined");
        }

        this._bullets = bullets;
        this._bulletData = bulletData;
    }

    public shoot(source: Entity) {
        if (!this.enabled)
            return;

        if (!this._bullets)
            return;

        const bullet: Bullet = this._bullets.get() as Bullet;
        if (bullet) {
            const sourceForward: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0).rotate(source.rotation);
            const bulletVelocity: Phaser.Math.Vector2 = sourceForward.clone().scale(this._bulletData.speed);
            bullet.enable(source.x + sourceForward.x * source.arcadeBody.radius, source.y + sourceForward.y * source.arcadeBody.radius,
                bulletVelocity.x, bulletVelocity.y, this._bulletData);
        }
    }

    public shootSpread(source: Entity, bulletCount: number, spreadAngleDeg: number) {
        if (!this.enabled || !this._bullets)
            return;

        const safeBulletCount = Math.max(1, Math.floor(bulletCount));
        const totalSpreadRad = Phaser.Math.DegToRad(spreadAngleDeg);
        const startAngleRad = safeBulletCount === 1
            ? source.rotation
            : source.rotation - totalSpreadRad / 2;
        const angleStepRad = safeBulletCount === 1
            ? 0
            : totalSpreadRad / (safeBulletCount - 1);

        for (let shotIndex = 0; shotIndex < safeBulletCount; shotIndex++) {
            const bullet: Bullet | null = this._bullets.get() as Bullet | null;
            if (!bullet)
                continue;

            const shotAngleRad = startAngleRad + angleStepRad * shotIndex;
            const directionX = Math.cos(shotAngleRad);
            const directionY = Math.sin(shotAngleRad);

            const spawnX = source.x + directionX * source.arcadeBody.radius;
            const spawnY = source.y + directionY * source.arcadeBody.radius;
            const velocityX = directionX * this._bulletData.speed;
            const velocityY = directionY * this._bulletData.speed;

            bullet.enable(spawnX, spawnY, velocityX, velocityY, this._bulletData);
        }
    }
}