import {Scene, Physics, GameObjects} from 'phaser';
import IComponent from "../components/IComponent.ts";

export default class Entity extends Physics.Arcade.Sprite {
    public readonly arcadeBody: Physics.Arcade.Body;
    private entityComponents: IComponent[] = [];
    private forwardDirectionDebugLine: GameObjects.Line;

    constructor(scene: Scene, spawnX: number, spawnY: number, textureKey: string, frameName?: string) {
        super(scene, spawnX, spawnY, textureKey, frameName);

        if (this.scene.game.config.physics.arcade?.debug) {
            this.forwardDirectionDebugLine = this.scene.add
                .line(this.x, this.y, 0, 0, 0, 32, 0xff00ff)
                .setOrigin(0, 0)
                .setLineWidth(16, 4)
                .setAlpha(0.6)
                .setDepth(100);
        }

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.arcadeBody = this.body as Phaser.Physics.Arcade.Body;
        this.arcadeBody.allowGravity = false;
        this.arcadeBody.setFriction(0, 0);
    }

    public addComponent(component: IComponent) {
        this.entityComponents.push(component);
    }

    public removeComponent(component: IComponent): boolean {
        const componentIndex = this.entityComponents.indexOf(component);
        if (componentIndex !== -1) {
            this.entityComponents.splice(componentIndex, 1);
            return true;
        }

        return false;
    }

    public getComponent<T extends IComponent>(componentType: new (...args: any[]) => T): T | undefined {
        return this.entityComponents.find(component => component instanceof componentType) as T;
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        if (this.scene.game.config.physics.arcade?.debug && this.forwardDirectionDebugLine) {
            const isEntityShown = this.active && this.visible;
            this.forwardDirectionDebugLine.setVisible(isEntityShown);

            if (isEntityShown) {
                this.forwardDirectionDebugLine.setPosition(this.x, this.y);

                const forwardVector = new Phaser.Math.Vector2(64, 0).rotate(this.rotation);
                this.forwardDirectionDebugLine.setTo(0, 0, forwardVector.x, forwardVector.y);
            }
        }
    }
}