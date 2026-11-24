import {BulletData} from "../gameData/BulletData.ts";

export default class Bullet extends Phaser.GameObjects.Sprite {
    private static readonly AQUA_CIRCLE_TEXTURE_KEY: string = 'aqua-bullet-circle';
    private static readonly AQUA_COLOR_HEX: number = 0x00ffff;
    private static readonly CIRCLE_TEXTURE_RADIUS_PX: number = 8;

    // Largeur réduite sur les côtés pour les bombes ennemies, hauteur resserrée en haut/bas
    private static readonly ENEMY_HORIZONTAL_HITBOX_RATIO: number = 0.42;
    private static readonly ENEMY_VERTICAL_HITBOX_RATIO: number = 0.45;
    private static readonly PLAYER_AQUA_HITBOX_SIZE_PX: number = 6;

    private projectileBody: Phaser.Physics.Arcade.Body;
    private projectileDamage: number = 0;

    public get damage(): number {
        return this.projectileDamage;
    }

    public init() {
        this.ensureAquaCircleTexture();

        this.scene.physics.add.existing(this);

        this.projectileBody = this.body as Phaser.Physics.Arcade.Body;
        this.projectileBody.allowGravity = false;
        this.projectileBody.setFriction(0, 0);
    }

    private ensureAquaCircleTexture() {
        if (this.scene.textures.exists(Bullet.AQUA_CIRCLE_TEXTURE_KEY)) {
            return;
        }

        const radiusPx = Bullet.CIRCLE_TEXTURE_RADIUS_PX;
        const diameterPx = radiusPx * 2;
        const circleGraphics = this.scene.add.graphics();

        circleGraphics.fillStyle(Bullet.AQUA_COLOR_HEX, 1);
        circleGraphics.fillCircle(radiusPx, radiusPx, radiusPx);
        circleGraphics.generateTexture(Bullet.AQUA_CIRCLE_TEXTURE_KEY, diameterPx, diameterPx);
        circleGraphics.destroy();
    }

    private applyBombSideTrimmedHitbox(isAquaCircle: boolean) {
        if (!this.projectileBody) {
            return;
        }

        if (isAquaCircle) {
            const aquaRadiusPx: number = Bullet.PLAYER_AQUA_HITBOX_SIZE_PX * 0.5;
            this.projectileBody.setCircle(aquaRadiusPx);
            return;
        }

        const baseSidePx: number = Math.min(this.displayWidth, this.displayHeight);
        const displayedWidthPx: number = baseSidePx * Bullet.ENEMY_HORIZONTAL_HITBOX_RATIO;
        const displayedHeightPx: number = baseSidePx * Bullet.ENEMY_VERTICAL_HITBOX_RATIO;

        const safeScaleX: number = Math.max(Math.abs(this.scaleX), 0.0001);
        const safeScaleY: number = Math.max(Math.abs(this.scaleY), 0.0001);

        const bodyWidth: number = displayedWidthPx / safeScaleX;
        const bodyHeight: number = displayedHeightPx / safeScaleY;

        this.projectileBody.setSize(bodyWidth, bodyHeight, true);
    }

    public enable(
        spawnX: number,
        spawnY: number,
        velocityX: number,
        velocityY: number,
        projectileConfig: BulletData,
        spriteFrameName: string = 'BN'
    ) {
        if (!projectileConfig || !this.projectileBody) {
            return;
        }

        this.ensureAquaCircleTexture();
        this.setPosition(spawnX, spawnY);
        this.setOrigin(0.5);

        const isAquaCircle = spriteFrameName === Bullet.AQUA_CIRCLE_TEXTURE_KEY;
        if (isAquaCircle) {
            this.setTexture(Bullet.AQUA_CIRCLE_TEXTURE_KEY);
        } else if (this.scene.textures.get('sprites').has(spriteFrameName)) {
            this.setTexture('sprites', spriteFrameName);
        }

        if (projectileConfig.width && projectileConfig.height) {
            this.setDisplaySize(projectileConfig.width, projectileConfig.height);
        }

        this.projectileBody.enable = true;
        this.scene.physics.world.add(this.projectileBody);

        this.setActive(true);
        this.setVisible(true);

        this.projectileBody.setVelocity(velocityX, velocityY);
        this.projectileDamage = projectileConfig.damage;

        this.setRotation(this.projectileBody.velocity.angle());
        this.applyBombSideTrimmedHitbox(isAquaCircle);
    }

    public disable() {
        if (this.projectileBody) {
            this.projectileBody.enable = false;
            this.scene.physics.world.disableBody(this.projectileBody);
        }

        this.setActive(false);
        this.setVisible(false);
    }

    update(timeSinceLaunch: number, deltaTime: number) {
        super.update(timeSinceLaunch, deltaTime);

        const activeCamera = this.scene.cameras.main;
        const horizontalMargin: number = this.displayWidth;
        const verticalMargin: number = this.displayHeight;

        if (
            this.x < -horizontalMargin ||
            this.x > activeCamera.width + horizontalMargin ||
            this.y < -verticalMargin ||
            this.y > activeCamera.height + verticalMargin
        ) {
            this.disable();
        }
    }
}