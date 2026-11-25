import type { BulletData } from './BulletData.ts';

export interface SpecialEnemyMovementConfig {
    verticalSpeed: number;
    horizontalAmplitude: number;
    oscillationFrequency: number;
}

export interface SpecialEnemyWeaponConfig {
    shootDelay: number;
    bulletCount: number;
    spreadAngleDeg: number;
    bulletData: BulletData;
}

export interface SpecialEnemyConfig {
    health: number;
    movement: SpecialEnemyMovementConfig;
    weapon: SpecialEnemyWeaponConfig;
}