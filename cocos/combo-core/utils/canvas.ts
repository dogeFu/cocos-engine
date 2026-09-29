import { Canvas, Color } from "../../2d/framework";
import { Size } from "../../core/math";
import { Node as CCNode } from "../../scene-graph";

import { ComboNode } from "../node";
import { camera2D, type Camera2DOptions } from "./camera";

export interface Canvas2DSetup {
    designWidth?: number;
    designHeight?: number;
    camera?: Camera2DOptions;
}

export interface Canvas2DResult {
    node: ComboNode;
    camera: ReturnType<typeof camera2D>;
}

/**
 * Create a Canvas node with a 2D Camera attached.
 *
 * The Canvas node is a combo-core ComboNode so you can chain further calls:
 *
 *   const { node, camera } = setupCanvas2D(scene, { designWidth: 640, designHeight: 960 });
 *   node.setContentSize(640, 960);
 */
export function setupCanvas2D(parent: CCNode, opts?: Canvas2DSetup): Canvas2DResult {
    const dw = opts?.designWidth ?? 640;
    const dh = opts?.designHeight ?? 960;

    const canvasNode = new ComboNode("Canvas");
    canvasNode.setPosition(dw / 2, dh / 2);
    parent.addChild(canvasNode);

    const canvas = canvasNode.addComponent(Canvas);
    canvas.designResolution = new Size(dw, dh);
    const camera = camera2D(canvasNode, opts?.camera);
    canvas.cameraComponent = camera;

    return { node: canvasNode, camera };
}
