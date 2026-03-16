import { Container, Graphics, Ticker, type Application } from "pixi.js";

export interface ParticleConfig {
  count: number;
  color: number;
  velocityRange: {
    x: { min: number; max: number };
    y: { min: number; max: number };
  };
  lifetime: number;
  gravity?: number;
}

interface Particle {
  sprite: Graphics;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  gravity: number;
}

/**
 * Simple PixiJS particle emitter for burst and ambient effects.
 * Creates particles using Graphics objects for better performance.
 */
export class ParticleEmitter {
  private app: Application;
  private container: Container;
  private particles: Particle[] = [];
  private updateFn: (deltaTime: number) => void;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();

    // Add container to stage
    this.app.stage.addChild(this.container);

    // Bind update function
    this.updateFn = this.update.bind(this);
    this.app.ticker.add(this.updateFn);
  }

  /**
   * Emit a burst of particles from the given position
   */
  emit(x: number, y: number, config: ParticleConfig): void {
    for (let i = 0; i < config.count; i++) {
      const particle = this.createParticle(x, y, config);
      this.particles.push(particle);
      this.container.addChild(particle.sprite);
    }
  }

  /**
   * Create a single particle with random velocity
   */
  private createParticle(x: number, y: number, config: ParticleConfig): Particle {
    const sprite = new Graphics();
    sprite.circle(0, 0, 2);
    sprite.fill(config.color);
    sprite.x = x;
    sprite.y = y;

    // Random velocity within range
    const vx = this.randomBetween(config.velocityRange.x.min, config.velocityRange.x.max);
    const vy = this.randomBetween(config.velocityRange.y.min, config.velocityRange.y.max);

    return {
      sprite,
      vx,
      vy,
      age: 0,
      maxAge: config.lifetime,
      gravity: config.gravity || 0,
    };
  }

  /**
   * Update all particles each frame
   */
  private update(deltaTime: number): void {
    // Update particles in reverse order so we can safely remove dead ones
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Age the particle
      particle.age += deltaTime;

      // Update position
      particle.sprite.x += particle.vx * deltaTime;
      particle.sprite.y += particle.vy * deltaTime;

      // Apply gravity
      if (particle.gravity !== 0) {
        particle.vy += particle.gravity * deltaTime;
      }

      // Fade out over lifetime
      const ageRatio = particle.age / particle.maxAge;
      particle.sprite.alpha = Math.max(0, 1 - ageRatio);

      // Remove dead particles
      if (particle.age >= particle.maxAge) {
        this.container.removeChild(particle.sprite);
        particle.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Get random number between min and max
   */
  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Clean up particle emitter
   */
  destroy(): void {
    // Remove update function from ticker
    this.app.ticker.remove(this.updateFn);

    // Clean up all particles
    for (const particle of this.particles) {
      this.container.removeChild(particle.sprite);
      particle.sprite.destroy();
    }
    this.particles = [];

    // Remove container from stage
    this.app.stage.removeChild(this.container);
    this.container.destroy();
  }

  /**
   * Get the number of active particles
   */
  getActiveCount(): number {
    return this.particles.length;
  }
}