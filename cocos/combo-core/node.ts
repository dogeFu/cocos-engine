import {
    Component,
    type Constructor,
    Node as CCNode,
    Vec3,
} from "../scene-graph";
import { UIOpacity } from "../2d/components";
import { UITransform } from "../2d/framework";

import { isAssetRef, type AssetRef, type AssetRefUUID } from "./asset-ref";
import type { ComboScene } from "./scene";
import type { ComboPrefab } from "./prefab";

type ComponentSetup<T> = Partial<T> | ((component: T) => void);

export type NodeBuilder = (node: ComboNode) => void;

interface PendingAssetRef {
    key: string;
    ref: AssetRef | AssetRefUUID;
    comp: Component;
}

export class ComboNode extends CCNode {
    private _pendingAssetRefs: PendingAssetRef[] | null = null;

    constructor(name?: string) {
        super(name);
    }

    override setPosition(x: number | Readonly<Vec3>, y?: number, z?: number): this {
        if (typeof x !== "number") {
            super.setPosition(x);
            return this;
        }
        super.setPosition(x, y ?? 0, z ?? 0);
        return this;
    }

    override setRotationFromEuler(x: number | Vec3, y?: number, z?: number): this {
        if (typeof x !== "number") {
            super.setRotationFromEuler(x);
            return this;
        }
        super.setRotationFromEuler(x, y ?? 0, z);
        return this;
    }

    override setScale(x: number | Readonly<Vec3>, y?: number, z?: number): this {
        if (typeof x !== "number") {
            super.setScale(x);
            return this;
        }
        super.setScale(x, y ?? x, z ?? 1);
        return this;
    }

    setActive(active: boolean): this {
        this.active = active;
        return this;
    }

    setOpacity(opacity: number): this {
        let uiOpacity = this.getComponent(UIOpacity);
        if (!uiOpacity) {
            uiOpacity = super.addComponent(UIOpacity);
        }
        uiOpacity.opacity = opacity;
        return this;
    }

    setContentSize(width: number, height: number): this {
        let uiTransform = this.getComponent(UITransform);
        if (!uiTransform) {
            uiTransform = super.addComponent(UITransform);
        }
        uiTransform.setContentSize(width, height);
        return this;
    }

    setAnchorPoint(x: number, y: number): this {
        let uiTransform = this.getComponent(UITransform);
        if (!uiTransform) {
            uiTransform = super.addComponent(UITransform);
        }
        uiTransform.setAnchorPoint(x, y);
        return this;
    }

    component<T extends Component>(
        type: Constructor<T>,
        setup?: ComponentSetup<T>,
    ): this {
        const comp = this.getComponent(type) ?? super.addComponent(type);
        if (!setup) return this;

        if (typeof setup === "function") {
            setup(comp);
        } else {
            this._applySetupWithAssetRefs(comp, setup as Record<string, unknown>);
        }
        return this;
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

    override setParent(target: CCNode | null, keepWorldTransform?: boolean): this {
        super.setParent(target, keepWorldTransform);
        this._flushPendingAssetRefs();
        return this;
    }

    prefab(prefab: ComboPrefab): this {
        prefab.instantiate(this);
        return this;
    }

    // ── private ──

    private static _assignDeep(
        target: Record<string, unknown>,
        source: Record<string, unknown>,
    ): void {
        for (const key of Object.keys(source)) {
            const value = source[key];
            if (value != null && typeof value === 'object' && !Array.isArray(value)) {
                const existing = (target as Record<string, unknown>)[key];
                if (
                    existing != null &&
                    typeof existing === 'object' &&
                    !Array.isArray(existing) &&
                    (existing as object).constructor !== Object
                ) {
                    Object.assign(existing, value);
                    continue;
                }
            }
            (target as Record<string, unknown>)[key] = value;
        }
    }

    private _applySetupWithAssetRefs<T extends Component>(
        comp: T,
        setup: Record<string, unknown>,
    ): void {
        const syncProps: Record<string, unknown> = {};
        const refEntries: Array<{ key: string; ref: AssetRef | AssetRefUUID }> = [];

        for (const key of Object.keys(setup)) {
            const value = setup[key];
            if (isAssetRef(value)) {
                refEntries.push({ key, ref: value });
            } else {
                syncProps[key] = value;
            }
        }

        if (Object.keys(syncProps).length > 0) {
            ComboNode._assignDeep(comp as unknown as Record<string, unknown>, syncProps);
        }

        if (refEntries.length === 0) return;

        if (this.scene) {
            const scene = this.scene as ComboScene;
            for (const { key, ref } of refEntries) {
                scene._registerAssetRef(ref).then((asset) => {
                    (comp as unknown as Record<string, unknown>)[key] = asset;
                });
            }
        } else {
            if (!this._pendingAssetRefs) {
                this._pendingAssetRefs = [];
            }
            for (const { key, ref } of refEntries) {
                this._pendingAssetRefs.push({ key, ref, comp });
            }
        }
    }

    private _flushPendingAssetRefs(): void {
        if (!this._pendingAssetRefs || this._pendingAssetRefs.length === 0) return;
        if (!this.scene) return;

        const scene = this.scene as ComboScene;
        for (const { key, ref, comp } of this._pendingAssetRefs) {
            scene._registerAssetRef(ref).then((asset) => {
                (comp as unknown as Record<string, unknown>)[key] = asset;
            });
        }
        this._pendingAssetRefs = null;
    }
}
