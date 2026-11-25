import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Movement implements IComponent {
    public enabled: boolean = true;

    private _speed: number = 0;

    public constructor(speed?: number) {
        if (speed) {
            this._speed = speed;
        }
    }

    public setSpeed(speed: number) {
        this._speed = speed;
    }

    public moveHorizontally(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        entity.x += this._speed * deltaTime;
    }

    public moveVertically(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        entity.y += this._speed * deltaTime;
    }

    public moveSinusoidally(
        entity: Phaser.Physics.Arcade.Sprite,
        deltaTime: number,
        centerX: number,
        elapsedTime: number,
        amplitude: number,
        frequency: number
    ) {
        entity.y += this._speed * deltaTime;

        entity.x = centerX + Math.sin(elapsedTime * frequency) * amplitude;
    }
}