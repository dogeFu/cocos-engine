import { Camera } from "../../misc";
import { Color, Vec3 } from "../../core/math";
import { Node as CCNode } from "../../scene-graph";

import { ComboNode } from "../node";

export interface Camera2DOptions {
    clearColor?: Color;
    orthoHeight?: number;
    name?: string;
}

export interface Camera3DOptions {
    clearColor?: Color;
    fov?: number;
    nearClip?: number;
    farClip?: number;
    position?: Vec3;
    name?: string;
}

/**
 * Create a 2D orthographic Camera.
 * Defaults: ORTHO projection, SOLID_COLOR + DEPTH clear, grey-blue background, orthoHeight=960.
 */
export function camera2D(parent: CCNode, opts?: Camera2DOptions): Camera {
    const n = new ComboNode(opts?.name ?? "Camera");
    n.setPosition(0, 0, 1000);
    parent.addChild(n);
    const cam = n.addComponent(Camera);
    cam.projection = Camera.Projection.ORTHO;
    cam.orthoHeight = opts?.orthoHeight ?? 960;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR | Camera.ClearFlag.DEPTH;
    cam.clearColor = opts?.clearColor ?? new Color(44, 62, 80, 255);
    return cam;
}

/**
 * Create a 3D perspective Camera.
 * Defaults: PERSPECTIVE projection, SOLID_COLOR + DEPTH clear, FOV=45, near=1, far=1000, position (0,0,-10).
 */
export function camera3D(parent: CCNode, opts?: Camera3DOptions): Camera {
    const n = new ComboNode(opts?.name ?? "Camera3D");
    n.setPosition(opts?.position ?? new Vec3(0, 0, -10));
    parent.addChild(n);
    const cam = n.addComponent(Camera);
    cam.projection = Camera.Projection.PERSPECTIVE;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR | Camera.ClearFlag.DEPTH;
    cam.clearColor = opts?.clearColor ?? new Color(44, 62, 80, 255);
    cam.fovAxis = Camera.FOVAxis.VERTICAL;
    cam.fov = opts?.fov ?? 45;
    cam.near = opts?.nearClip ?? 1;
    cam.far = opts?.farClip ?? 1000;
    return cam;
}
