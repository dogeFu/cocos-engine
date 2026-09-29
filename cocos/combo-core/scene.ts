import { Scene as CCScene, type Asset, type Node as CCNode, type SceneGlobals } from "../scene-graph";
import { director } from "../game";

import { ComboNode, type NodeBuilder } from "./node";
import type { ComboPrefab } from "./prefab";
import type { AssetRef, AssetRefUUID } from "./asset-ref";
import { ResourceLoader, type PaceConfig } from "./resource-loader";

export interface AssetsObserver {
    onProgress(fn: (done: number, total: number) => void): this;
    onComplete(fn: () => void): this;
    ready(): Promise<void>;
}

export class ComboScene extends CCScene {
    private _resourceLoader: ResourceLoader = new ResourceLoader();
    private _assetsObserver: AssetsObserver;

    constructor(name = "Scene") {
        super(name);
        const loader = this._resourceLoader;
        this._assetsObserver = {
            onProgress(fn) {
                loader.onProgress(fn);
                return this;
            },
            onComplete(fn) {
                loader.onComplete(fn);
                return this;
            },
            ready() {
                return loader.ready();
            },
        };
    }

    /** Configure resource loading pace. */
    pace(config: Partial<PaceConfig>): this {
        this._resourceLoader.pace(config);
        return this;
    }

    /** Observe resource loading progress. */
    get assets(): AssetsObserver {
        return this._assetsObserver;
    }

    /** @internal Register an AssetRef for loading. Used by ComboNode.component(). */
    _registerAssetRef(ref: AssetRef | AssetRefUUID): Promise<Asset> {
        return this._resourceLoader.register(ref);
    }

    node(nameOrBuild?: string | NodeBuilder, build?: NodeBuilder): this {
        const name = typeof nameOrBuild === "string" ? nameOrBuild : undefined;
        const builder = typeof nameOrBuild === "function" ? nameOrBuild : build;
        const child = new ComboNode(name);
        this.addChild(child);
        builder?.(child);
        return this;
    }

    append(child: CCNode): this {
        this.addChild(child);
        return this;
    }

    prefab(prefab: ComboPrefab): this {
        prefab.instantiate(this);
        return this;
    }

    /** Configure scene globals (ambient, shadows, skybox, fog, etc.) */
    setupGlobals(setup: (g: SceneGlobals) => void): this {
        setup(this.globals);
        return this;
    }

    run(): this {
        this._resourceLoader.ensureStarted();
        director.runSceneImmediate(this);
        return this;
    }

    load(onProgress?: (progress: number) => void): Promise<this> {
        this._resourceLoader.ensureStarted();
        return new Promise((resolve) => {
            director.runScene(this, undefined, (err) => {
                if (err) {
                    console.error(`[combo-cli] Failed to load scene: ${this.name}`, err);
                }
                onProgress?.(1);
                resolve(this);
            });
        });
    }
}
