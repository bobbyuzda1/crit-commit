import { Container, Application } from "pixi.js";

/**
 * Manages active PixiJS scene. setScene() removes the old scene container
 * and adds the new one to the stage.
 */
export class SceneManager {
  private app: Application;
  private currentScene: Container | null = null;

  constructor(app: Application) {
    this.app = app;
  }

  /** Replace the active scene with a new one. */
  setScene(scene: Container): void {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene);
      this.currentScene.destroy({ children: true });
    }
    this.currentScene = scene;
    this.app.stage.addChild(scene);
  }

  /** Get the currently active scene container. */
  getScene(): Container | null {
    return this.currentScene;
  }

  /** Get the PixiJS application instance. */
  getApp(): Application {
    return this.app;
  }

  /** Remove and destroy the current scene. */
  clear(): void {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene);
      this.currentScene.destroy({ children: true });
      this.currentScene = null;
    }
  }
}
