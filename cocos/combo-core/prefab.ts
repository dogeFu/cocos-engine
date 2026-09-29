import { type Node as CCNode } from "../scene-graph";

import { ComboNode } from "./node";

export abstract class ComboPrefab {
    constructor(readonly name: string) {}

    instantiate(parent?: CCNode): ComboNode {
        const root = new ComboNode(this.name);
        if (parent) {
            parent.addChild(root);
        }

        this.build(root);
        root.active = true;
        return root;
    }

    protected abstract build(root: ComboNode): void;
}

/**
 * Functional Prefab factory.
 *
 * Provides the same behaviour as `abstract class ComboPrefab` but without
 * requiring a named subclass.
 *
 * @example
 *   const HealthBar = buildPrefab("HealthBar", (root) => {
 *       root.setContentSize(200, 20);
 *       root.component(Sprite, { spriteFrame: whiteSpriteFrame() });
 *   });
 *   scene.prefab(HealthBar);
 */
export function buildPrefab(name: string, builder: (root: ComboNode) => void): ComboPrefab {
    return new (class extends ComboPrefab {
        constructor() {
            super(name);
        }
        protected build(root: ComboNode): void {
            builder(root);
        }
    })();
}
