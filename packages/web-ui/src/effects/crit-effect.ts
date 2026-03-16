import { Text, TextStyle, type Application } from "pixi.js";
import { ParticleEmitter, type ParticleConfig } from "./particles.js";
import type { ServerMessage } from "@crit-commit/shared";

/**
 * Manages crit visual effects: screen shake, particle burst, and text animation
 */
export class CritEffectManager {
  private app: Application;
  private particleEmitter: ParticleEmitter;
  private screenShakeActive = false;
  private originalStageX = 0;
  private originalStageY = 0;
  private shakeStartTime = 0;
  private shakeDuration = 300; // 300ms

  // Golden particle config for crit bursts
  private critParticleConfig: ParticleConfig = {
    count: 30,
    color: 0xFFD700, // Gold
    velocityRange: {
      x: { min: -100, max: 100 },
      y: { min: -120, max: -60 },
    },
    lifetime: 2000, // 2 seconds
    gravity: 50, // Particles fall down
  };

  constructor(app: Application) {
    this.app = app;
    this.particleEmitter = new ParticleEmitter(app);

    // Store original stage position
    this.originalStageX = app.stage.x;
    this.originalStageY = app.stage.y;

    // Add ticker for screen shake updates
    this.app.ticker.add(this.updateScreenShake.bind(this));
  }

  /**
   * Trigger the full crit effect sequence
   */
  triggerCritEffect(message: Extract<ServerMessage, { type: "crit_trigger" }>): void {
    console.log("🔥 CRIT! Triggering effects:", message);

    // Start screen shake
    this.startScreenShake();

    // Emit golden particles from center of screen
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;
    this.particleEmitter.emit(centerX, centerY, this.critParticleConfig);

    // Show crit text animation
    this.showCritText(message);
  }

  /**
   * Start screen shake effect
   */
  private startScreenShake(): void {
    if (this.screenShakeActive) return;

    this.screenShakeActive = true;
    this.shakeStartTime = Date.now();
    this.originalStageX = this.app.stage.x;
    this.originalStageY = this.app.stage.y;
  }

  /**
   * Update screen shake each frame
   */
  private updateScreenShake(): void {
    if (!this.screenShakeActive) return;

    const elapsed = Date.now() - this.shakeStartTime;

    if (elapsed >= this.shakeDuration) {
      // End shake - return to original position
      this.screenShakeActive = false;
      this.app.stage.x = this.originalStageX;
      this.app.stage.y = this.originalStageY;
    } else {
      // Apply random shake offset (3-5px range)
      const shakeIntensity = 5;
      const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
      const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;

      this.app.stage.x = this.originalStageX + offsetX;
      this.app.stage.y = this.originalStageY + offsetY;
    }
  }

  /**
   * Show animated "CRIT!" text that scales up and fades out
   */
  private showCritText(message: Extract<ServerMessage, { type: "crit_trigger" }>): void {
    const style = new TextStyle({
      fontFamily: "Arial Black",
      fontSize: 48,
      fill: 0xFFD700, // Gold
      stroke: 0x8B4513, // Brown outline
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 4,
      dropShadowDistance: 4,
    });

    const critText = new Text({
      text: "CRIT!",
      style,
    });

    // Position in center of screen
    critText.x = this.app.screen.width / 2;
    critText.y = this.app.screen.height / 2;
    critText.anchor.set(0.5);

    // Initial scale (small)
    critText.scale.set(0.1);
    critText.alpha = 1;

    // Add to stage
    this.app.stage.addChild(critText);

    // Animation variables
    const animationDuration = 1500; // 1.5 seconds
    const startTime = Date.now();
    const maxScale = 1.2;

    // Animation function
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / animationDuration;

      if (progress >= 1) {
        // Animation complete - remove text
        this.app.stage.removeChild(critText);
        critText.destroy();
        return;
      }

      // Scale up with ease-out
      const scale = maxScale * this.easeOut(Math.min(progress * 2, 1));
      critText.scale.set(scale);

      // Fade out in the second half
      if (progress > 0.5) {
        const fadeProgress = (progress - 0.5) * 2;
        critText.alpha = 1 - fadeProgress;
      }

      // Continue animation
      requestAnimationFrame(animate);
    };

    // Start animation
    requestAnimationFrame(animate);

    // Also show streak info if applicable
    if (message.critStreak > 1) {
      setTimeout(() => {
        this.showStreakText(message.critStreak);
      }, 200); // Slight delay after main crit text
    }
  }

  /**
   * Show crit streak text for multi-crits
   */
  private showStreakText(streakCount: number): void {
    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xFFFFFF,
      stroke: 0x000000,
      strokeThickness: 2,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 2,
      dropShadowDistance: 2,
    });

    const streakText = new Text({
      text: `${streakCount}x STREAK!`,
      style,
    });

    // Position below center
    streakText.x = this.app.screen.width / 2;
    streakText.y = this.app.screen.height / 2 + 80;
    streakText.anchor.set(0.5);

    // Start transparent and small
    streakText.alpha = 0;
    streakText.scale.set(0.5);

    this.app.stage.addChild(streakText);

    // Animate in and out
    const animationDuration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / animationDuration;

      if (progress >= 1) {
        this.app.stage.removeChild(streakText);
        streakText.destroy();
        return;
      }

      // Fade in and scale up in first quarter
      if (progress < 0.25) {
        const fadeIn = progress * 4;
        streakText.alpha = fadeIn;
        streakText.scale.set(0.5 + 0.3 * fadeIn);
      }
      // Hold steady in middle half
      else if (progress < 0.75) {
        streakText.alpha = 1;
        streakText.scale.set(0.8);
      }
      // Fade out in last quarter
      else {
        const fadeOut = (progress - 0.75) * 4;
        streakText.alpha = 1 - fadeOut;
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  /**
   * Ease-out animation curve
   */
  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.particleEmitter.destroy();

    // Reset stage position
    this.app.stage.x = this.originalStageX;
    this.app.stage.y = this.originalStageY;
  }

  /**
   * Check if any effects are currently active
   */
  isActive(): boolean {
    return this.screenShakeActive || this.particleEmitter.getActiveCount() > 0;
  }
}