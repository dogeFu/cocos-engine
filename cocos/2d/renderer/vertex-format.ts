/*
 Copyright (c) 2019-2020 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import { AttributeName, Format, FormatInfos, Attribute } from '../../gfx';
import { cclegacy } from '../../core';

/**
 * @en Vertex format with vector 3 position attribute
 * @zh 包含三维位置属性的顶点格式
 */
export const vfmt = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
];

/**
 * @en Vertex format with the following layout
 * 1. Vector 3 position attribute (Float32)
 * 2. Vector 4 color attribute (Float32)
 * @zh 包含以下数据的顶点格式
 * 1. 三维位置属性（Float32）
 * 2. RGBA 颜色属性（Float32）
 */
export const vfmtPosColor = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA32F),
];

/**
 * @en Vertex format with the following layout
 * 1. Vector 3 position attribute (Float32)
 * 2. Vector 2 uv attribute (Float32)
 * 3. Vector 4 color attribute (Float32)
 * @zh 包含以下数据的顶点格式
 * 1. 三维位置属性（Float32）
 * 2. 二维贴图 UV 属性（Float32）
 * 3. RGBA 颜色属性（Float32）
 */
export const vfmtPosUvColor = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RG32F),
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA32F),
];

export const vfmtPosUvColor4B = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RG32F),
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true),
];

/**
 * @en Vertex format with the following layout
 * 1. Vector 3 position attribute (Float32)
 * 2. Vector 2 uv attribute (Float32)
 * 3. First vector 4 color attribute (Float32)
 * 4. Second vector 4 color attribute (Float32)
 * @zh 包含以下数据的顶点格式
 * 1. 三维位置属性（Float32）
 * 2. 二维贴图 UV 属性（Float32）
 * 3. 第一套 RGBA 颜色属性（Float32）
 * 3. 第二套 RGBA 颜色属性（Float32）
 */
export const vfmtPosUvTwoColor = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RG32F),
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA32F),
    new Attribute(AttributeName.ATTR_COLOR2, Format.RGBA32F),
];

export const vfmtPosUvTwoColor4B = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RG32F),
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true),
    new Attribute(AttributeName.ATTR_COLOR2, Format.RGBA8, true),
];

/**
 * @en Get total components count for all attributes per vertex.
 * @zh 获取每个顶点上所有属性的分量数总和
 * @param attrs All attributes of the vertex format
 * @returns Total components count
 */
export function getComponentPerVertex (attrs: Attribute[]) {
    let count = 0;
    for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        const info = FormatInfos[attr.format];
        count += info.count;
    }

    return count;
}

/**
 * @en Get total stride for all attributes per vertex.
 * @zh 获取每个顶点上所有属性的总步进
 * @param attrs All attributes of the vertex format
 * @returns Total stride
 */
export function getAttributeStride (attrs: Attribute[]) {
    let count = 0;
    for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        const info = FormatInfos[attr.format];
        count += info.size;
    }

    return count;
}

cclegacy.internal.vfmtPosUvColor = vfmtPosUvColor;
cclegacy.internal.vfmtPosUvTwoColor = vfmtPosUvTwoColor;
cclegacy.internal.vfmtPosUvColor4B = vfmtPosUvColor4B;
cclegacy.internal.vfmtPosUvTwoColor4B = vfmtPosUvTwoColor4B;
