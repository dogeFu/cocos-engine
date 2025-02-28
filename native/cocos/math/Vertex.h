/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2011 ForzeField Studios S.L
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2021 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
#ifndef __CCVERTEX_H__
#define __CCVERTEX_H__

#include "base/Macros.h"
#include "base/std/container/vector.h"
#include "math/Vec2.h"

/**
 * @addtogroup base
 * @{
 */

namespace cc {

/** @file CCVertex.h */

/** converts a line to a polygon */
void CC_DLL ccVertexLineToPolygon(const ccstd::vector<Vec2> &points, float stroke, unsigned int offset, unsigned int nuPoints, ccstd::vector<Vec2> *vertices);

/** returns whether or not the line intersects */
bool CC_DLL ccVertexLineIntersect(float ax, float ay,
                                  float bx, float by,
                                  float cx, float cy,
                                  float dx, float dy, float *t);

} // namespace cc

// end of base group
/// @}

#endif /* __CCVERTEX_H__ */
