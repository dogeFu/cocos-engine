/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import type { Camera } from "../render-scene/scene/camera";
import type { GeometryRenderer } from "./geometry-renderer";
import type {
    CommandBuffer,
    DescriptorSet,
    DescriptorSetLayout,
    Device,
    Swapchain,
} from "../gfx";
import type { GlobalDSManager } from "./global-descriptor-set-manager";
import type { MacroRecord } from "../render-scene/core/pass-utils";
import type { PipelineSceneData } from "./pipeline-scene-data";
import type { Model } from "../render-scene/scene";

export interface PipelineRuntime {
    activate(swapchain: Swapchain): boolean;
    destroy(): boolean;
    render(cameras: Camera[]): void;
    readonly device: Device;
    readonly macros: MacroRecord;
    readonly globalDSManager: GlobalDSManager;
    readonly descriptorSetLayout: DescriptorSetLayout;
    readonly descriptorSet: DescriptorSet;
    readonly commandBuffers: CommandBuffer[];
    readonly pipelineSceneData: PipelineSceneData;
    readonly constantMacros: string;
    profiler: Model | null;
    readonly geometryRenderer: GeometryRenderer | null;
    shadingScale: number;
    getMacroString(name: string): string;
    getMacroInt(name: string): number;
    getMacroBool(name: string): boolean;
    setMacroString(name: string, value: string): void;
    setMacroInt(name: string, value: number): void;
    setMacroBool(name: string, value: boolean): void;
    onGlobalPipelineStateChanged(): void;
}
