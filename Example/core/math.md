# Math — 数学库

## 概述

Cocos Creator 提供了完整的 2D/3D 数学库，包括向量、矩阵、四元数、颜色、矩形等类型。数学类型采用 **out-parameter 模式**：方法接收一个输出参数来存储结果，避免频繁创建对象造成 GC 压力。

## 导入方式

```typescript
import { Vec2, Vec3, Vec4, Mat3, Mat4, Quat, Color, Rect, Size, math } from 'cc';
```

## Vec2 — 二维向量

### 创建

```typescript
const a = new Vec2(1, 2);
const b = new Vec2(3, 4);
const zero = Vec2.ZERO;
const one = Vec2.ONE;
const unitX = Vec2.UNIT_X;
const unitY = Vec2.UNIT_Y;
```

### 运算（静态方法，out-parameter 模式）

```typescript
const out = new Vec2();

Vec2.add(out, a, b);
Vec2.subtract(out, a, b);
Vec2.multiply(out, a, b);
Vec2.divide(out, a, b);
Vec2.scale(out, a, 2);
Vec2.negate(out, a);
Vec2.normalize(out, a);
Vec2.lerp(out, a, b, 0.5);
Vec2.rotate(out, a, Math.PI / 4);
```

### 常用方法

```typescript
const len = Vec2.len(a);
const lenSqr = Vec2.lengthSqr(a);
const dist = Vec2.distance(a, b);
const distSqr = Vec2.sqrDistance(a, b);
const dot = Vec2.dot(a, b);
const cross = Vec2.cross(a, b);
const angle = Vec2.angle(a, b);

const equals = Vec2.equals(a, b);
const strictEquals = Vec2.strictEquals(a, b);
```

### 实例方法

```typescript
a.set(1, 2);
a.clone();
a.equals(b);
a.toString();
a.length();
a.lengthSqr();
a.normalize();
a.negate();
a.add(b);
a.subtract(b);
a.multiply(b);
a.divide(b);
a.scale(2);
```

## Vec3 — 三维向量

### 创建

```typescript
const a = new Vec3(1, 2, 3);
const b = new Vec3(4, 5, 6);
const zero = Vec3.ZERO;
const one = Vec3.ONE;
const unitX = Vec3.UNIT_X;
const unitY = Vec3.UNIT_Y;
const unitZ = Vec3.UNIT_Z;
const up = Vec3.UNIT_Y;
const right = Vec3.UNIT_X;
const forward = Vec3.UNIT_Z;
```

### 运算

```typescript
const out = new Vec3();

Vec3.add(out, a, b);
Vec3.subtract(out, a, b);
Vec3.multiply(out, a, b);
Vec3.divide(out, a, b);
Vec3.scale(out, a, 2);
Vec3.negate(out, a);
Vec3.normalize(out, a);
Vec3.lerp(out, a, b, 0.5);
Vec3.cross(out, a, b);
Vec3.transformMat4(out, a, mat4);
Vec3.transformMat3(out, a, mat3);
Vec3.transformQuat(out, a, quat);
Vec3.transformInverseMat4(out, a, mat4);
Vec3.transformAffine(out, a, mat4);
```

### 常用方法

```typescript
const len = Vec3.len(a);
const lenSqr = Vec3.lengthSqr(a);
const dist = Vec3.distance(a, b);
const distSqr = Vec3.sqrDistance(a, b);
const dot = Vec3.dot(a, b);
const angle = Vec3.angle(a, b);

Vec3.rotateX(out, a, center, Math.PI / 4);
Vec3.rotateY(out, a, center, Math.PI / 4);
Vec3.rotateZ(out, a, center, Math.PI / 4);
```

## Vec4 — 四维向量

```typescript
const a = new Vec4(1, 2, 3, 4);
const zero = Vec4.ZERO;
const one = Vec4.ONE;

const out = new Vec4();
Vec4.add(out, a, b);
Vec4.subtract(out, a, b);
Vec4.multiply(out, a, b);
Vec4.scale(out, a, 2);
Vec4.normalize(out, a);
Vec4.lerp(out, a, b, 0.5);
Vec4.transformMat4(out, a, mat4);
```

## Mat3 — 3x3 矩阵

```typescript
const mat = new Mat3();
Mat3.identity(mat);

Mat3.fromMat4(mat, mat4);
Mat3.fromTranslation(mat, new Vec2(1, 2));
Mat3.fromRotation(mat, Math.PI / 4);
Mat3.fromScale(mat, new Vec2(2, 3));
Mat3.fromTRS(mat, new Vec2(1, 2), Math.PI / 4, new Vec2(2, 3));

const out = new Mat3();
Mat3.multiply(out, matA, matB);
Mat3.invert(out, mat);
Mat3.transpose(out, mat);

Mat3.translate(out, mat, new Vec2(1, 2));
Mat3.rotate(out, mat, Math.PI / 4);
Mat3.scale(out, mat, new Vec2(2, 3));
```

## Mat4 — 4x4 矩阵

### 创建与初始化

```typescript
const mat = new Mat4();
Mat4.identity(mat);
```

### 从变换构建

```typescript
Mat4.fromTranslation(mat, new Vec3(1, 2, 3));
Mat4.fromRotation(mat, Math.PI / 4, new Vec3(0, 1, 0));
Mat4.fromScale(mat, new Vec3(2, 2, 2));
Mat4.fromTRS(mat, new Vec3(1, 2, 3), new Quat(), new Vec3(1, 1, 1));
Mat4.fromRTS(mat, new Quat(), new Vec3(1, 2, 3), new Vec3(1, 1, 1));
Mat4.fromXRotation(mat, Math.PI / 4);
Mat4.fromYRotation(mat, Math.PI / 4);
Mat4.fromZRotation(mat, Math.PI / 4);
```

### 运算

```typescript
const out = new Mat4();
Mat4.multiply(out, matA, matB);
Mat4.invert(out, mat);
Mat4.transpose(out, mat);

Mat4.translate(out, mat, new Vec3(1, 0, 0));
Mat4.rotate(out, mat, Math.PI / 4, new Vec3(0, 1, 0));
Mat4.scale(out, mat, new Vec3(2, 2, 2));
```

### 向量变换

```typescript
const outVec = new Vec3();
Mat4.transformVector(outVec, mat, new Vec3(1, 0, 0));
Mat4.transformPoint(outVec, mat, new Vec3(1, 0, 0));
```

### 分解

```typescript
const pos = new Vec3();
const rot = new Quat();
const scale = new Vec3();
Mat4.toRTS(mat, rot, pos, scale);
```

## Quat — 四元数

### 创建

```typescript
const q = new Quat();
const zero = Quat.ZERO;
const identity = Quat.IDENTITY;
```

### 从旋转构建

```typescript
Quat.fromEuler(q, 0, 90, 0);
Quat.fromAxisAngle(q, new Vec3(0, 1, 0), Math.PI / 4);
Quat.fromRotationX(q, Math.PI / 4);
Quat.fromRotationY(q, Math.PI / 4);
Quat.fromRotationZ(q, Math.PI / 4);
Quat.fromMat3(q, mat3);
Quat.fromMat4(q, mat4);

Quat.rotateX(q, q, Math.PI / 4);
Quat.rotateY(q, q, Math.PI / 4);
Quat.rotateZ(q, q, Math.PI / 4);
```

### 运算

```typescript
const out = new Quat();
Quat.multiply(out, qA, qB);
Quat.conjugate(out, q);
Quat.invert(out, q);
Quat.normalize(out, q);
Quat.lerp(out, qA, qB, 0.5);
Quat.slerp(out, qA, qB, 0.5);
```

### 常用方法

```typescript
const dot = Quat.dot(qA, qB);
const len = Quat.len(q);
const angle = Quat.getAxisAngle(new Vec3(), q);

const euler = new Vec3();
Quat.toEuler(euler, q);
```

### 视角朝向

```typescript
const forward = new Vec3(0, 0, -1);
const up = new Vec3(0, 1, 0);
Quat.fromViewUp(q, forward, up);

const lookAt = new Vec3(10, 0, 0);
const eye = new Vec3(0, 0, 0);
const upDir = new Vec3(0, 1, 0);
Quat.fromRotationTo(q, new Vec3(0, 0, 1), lookAt.subtract(eye).normalize());
```

## Color — 颜色

### 创建

```typescript
const c1 = new Color(255, 0, 0, 255);
const c2 = new Color(0, 255, 0);
const c3 = Color.RED;
const c4 = Color.GREEN;
const c5 = Color.BLUE;
const c6 = Color.WHITE;
const c7 = Color.BLACK;
const c8 = Color.YELLOW;
const c9 = Color.CYAN;
const c10 = Color.MAGENTA;
const c11 = Color.TRANSPARENT;
const c12 = Color.GRAY;
```

### 属性

```typescript
const c = new Color();
c.r = 255;
c.g = 128;
c.b = 0;
c.a = 255;
```

### 运算

```typescript
const out = new Color();
Color.lerp(out, colorA, colorB, 0.5);

Color.transformRGBA(out, color, mat4);

const hex = c.toCSS();
const rgb = c.toRGB();
```

### 工具方法

```typescript
const fromHex = new Color();
Color.fromHEX(fromHex, '#FF5733');
Color.fromHEX(fromHex, 0xFF5733FF);

const hsla = Color.toHSV(color);
Color.fromHSV(out, hsla.h, hsla.s, hsla.v);
```

## Rect — 矩形

```typescript
const rect = new Rect(0, 0, 100, 200);
const zero = Rect.ZERO;
const one = Rect.ONE;
const unit = Rect.UNIT;

rect.x = 10;
rect.y = 20;
rect.width = 100;
rect.height = 200;

rect.center;
rect.origin;
rect.size;
rect.xMin;
rect.xMax;
rect.yMin;
rect.yMax;

const contains = rect.contains(new Vec2(50, 100));
const intersects = rect.intersects(otherRect);

rect.merge(otherRect);

const intersection = new Rect();
Rect.intersection(intersection, rectA, rectB);

const union = new Rect();
Rect.union(union, rectA, rectB);

Rect.fromVec2Points(rect, new Vec2(0, 0), new Vec2(100, 200));
```

## Size — 尺寸

```typescript
const size = new Size(100, 200);
const zero = Size.ZERO;
const one = Size.ONE;

size.width = 150;
size.height = 300;

const equals = size.equals(otherSize);
const clone = size.clone();
```

## math 命名空间

`math` 命名空间提供额外的数学工具函数：

```typescript
import { math } from 'cc';

const deg = math.toDegree(Math.PI);
const rad = math.toRadian(180);

const clamped = math.clamp(15, 0, 10);
const lerped = math.lerp(0, 100, 0.5);
const approx = math.approx(1.0001, 1.0, 0.001);

const nextPow2 = math.nextPow2(5);
const isPow2 = math.isPowerOfTwo(8);
const random = math.random();
const randomRange = math.randomRange(10, 20);
const randomRangeInt = math.randomRangeInt(0, 10);

const sign = math.sign(-5);
const pingPong = math.pingPong(3, 5);
const smoothstep = math.smoothstep(0, 1, 0.5);
```

## 性能优化：out-parameter 模式

Cocos 数学库的核心设计理念是 **避免 GC**。所有运算方法都要求传入输出参数：

```typescript
// 正确：复用 out 对象，零 GC
const out = new Vec3();
for (let i = 0; i < 1000; i++) {
    Vec3.add(out, a, b);
}

// 错误：每次创建新对象，产生大量 GC
for (let i = 0; i < 1000; i++) {
    const result = Vec3.add(new Vec3(), a, b);
}
```

### 模块级缓存 Math 方法

```typescript
const sqrt = Math.sqrt;
const sin = Math.sin;
const cos = Math.cos;
const abs = Math.abs;

function fastDistance(a: Vec3, b: Vec3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return sqrt(dx * dx + dy * dy + dz * dz);
}
```

## 注意事项

- 所有数学运算优先使用静态方法（out-parameter 模式），实例方法会修改自身
- `Vec3` 是最常用的类型，3D 位置、缩放、欧拉角都用 `Vec3`
- `Quat` 用于旋转，避免使用欧拉角进行旋转插值（万向锁问题）
- `Color` 的 RGBA 分量范围是 0-255（不是 0-1）
- `Mat4` 按列主序存储，与 WebGL 一致
- 热循环中缓存 `Math.*` 方法到模块作用域可提升性能
