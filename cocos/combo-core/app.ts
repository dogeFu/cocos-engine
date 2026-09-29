import { game, type Game } from "../game";

import type { ComboScene } from "./scene";

export interface StartupContext {
    game: Game;
}

export async function startApplication(options: {
    scene: ComboScene;
    beforeStart?: (context: StartupContext) => Promise<void> | void;
}): Promise<void> {
    await options.beforeStart?.({ game });
    options.scene.run();
}
