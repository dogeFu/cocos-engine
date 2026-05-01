/**
 * Runtime Behavior Parity Test
 *
 * Verifies that core runtime operations produce correct results.
 * Tests math, events, serialization, and component lifecycle behavior.
 *
 * Rule 3: No skip(). Rule 4: No conditional guards on core features.
 */

import { startModule, endModule, assert, assertEqual, assertClose } from '../test-utils';

export function runBehaviorParityTest(cc: any) {
    startModule('Runtime Behavior');

    // BASELINE — engine must have loaded
    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return;
    }

    // ===== Vec3 =====
    assert(cc.Vec3 != null, 'Vec3 available');
    const a = new cc.Vec3(1, 0, 0);
    const b = new cc.Vec3(0, 1, 0);
    const out = new cc.Vec3();

    // cross product
    cc.Vec3.cross(out, a, b);
    assertClose(out.x, 0, 0.001, 'Vec3.cross x');
    assertClose(out.y, 0, 0.001, 'Vec3.cross y');
    assertClose(out.z, 1, 0.001, 'Vec3.cross z');

    // dot product
    const dot = cc.Vec3.dot(a, b);
    assertClose(dot, 0, 0.001, 'Vec3.dot orthogonal');

    // normalize
    const c = new cc.Vec3(3, 4, 0);
    cc.Vec3.normalize(out, c);
    assertClose(out.length(), 1, 0.001, 'Vec3.normalize length=1');

    // distance
    const d = cc.Vec3.distance(new cc.Vec3(0, 0, 0), new cc.Vec3(3, 4, 0));
    assertClose(d, 5, 0.001, 'Vec3.distance 3-4-5');

    // ===== Vec2 =====
    assert(cc.Vec2 != null, 'Vec2 available');
    const v2 = new cc.Vec2(3, 4);
    assertClose(v2.length(), 5, 0.001, 'Vec2.length 3-4-5');

    // ===== Mat4 =====
    assert(cc.Mat4 != null, 'Mat4 available');
    const m = new cc.Mat4();
    cc.Mat4.identity(m);
    assertClose(m.m00, 1, 0.001, 'Mat4.identity m00');
    assertClose(m.m05, 1, 0.001, 'Mat4.identity m05');
    assertClose(m.m15, 1, 0.001, 'Mat4.identity m15');

    // ===== Quat =====
    assert(cc.Quat != null, 'Quat available');
    const q = new cc.Quat();
    cc.Quat.fromEuler(q, 0, 90, 0);
    const euler = new cc.Vec3();
    cc.Quat.toEuler(euler, q);
    // Quaternion→Euler roundtrip accumulates ~0.05° error due to gimbal singularity
    assertClose(euler.y, 90, 0.05, 'Quat fromEuler/toEuler roundtrip');

    // ===== Color =====
    assert(cc.Color != null, 'Color available');
    const c1 = new cc.Color(255, 128, 0, 255);
    assertEqual(c1.r, 255, 'Color.r');
    assertEqual(c1.g, 128, 'Color.g');
    assertEqual(c1.b, 0, 'Color.b');
    assertEqual(c1.a, 255, 'Color.a');

    // ===== EventTarget =====
    assert(cc.EventTarget != null, 'EventTarget available');
    const et = new cc.EventTarget();
    let fired = false;
    et.on('test', () => { fired = true; });
    et.emit('test');
    assert(fired, 'EventTarget on/emit');

    let count = 0;
    const handler = () => { count++; };
    et.once('once-test', handler);
    et.emit('once-test');
    et.emit('once-test');
    assertEqual(count, 1, 'EventTarget once fires once');

    // ===== Node creation =====
    assert(cc.Node != null, 'Node available');
    assert(cc.Component != null, 'Component available');
    const node = new cc.Node('TestNode');
    assertEqual(node.name, 'TestNode', 'Node name');
    node.setPosition(100, 200, 0);
    const pos = node.position;
    assertClose(pos.x, 100, 0.001, 'Node setPosition x');
    assertClose(pos.y, 200, 0.001, 'Node setPosition y');

    // active/inactive
    assertEqual(node.active, true, 'Node default active');
    node.active = false;
    assertEqual(node.active, false, 'Node set inactive');

    // ===== Math utilities =====
    assert(cc.clamp01 != null, 'clamp01 available');
    assertClose(cc.clamp01(-0.5), 0, 0.001, 'clamp01(-0.5) = 0');
    assertClose(cc.clamp01(0.5), 0.5, 0.001, 'clamp01(0.5) = 0.5');
    assertClose(cc.clamp01(1.5), 1, 0.001, 'clamp01(1.5) = 1');

    assert(cc.lerp != null, 'lerp available');
    assertClose(cc.lerp(0, 100, 0.5), 50, 0.001, 'lerp(0,100,0.5) = 50');
    assertClose(cc.lerp(0, 100, 0), 0, 0.001, 'lerp(0,100,0) = 0');
    assertClose(cc.lerp(0, 100, 1), 100, 0.001, 'lerp(0,100,1) = 100');

    assert(cc.toRadian != null, 'toRadian available');
    assertClose(cc.toRadian(180), Math.PI, 0.001, 'toRadian(180) = PI');

    assert(cc.toDegree != null, 'toDegree available');
    assertClose(cc.toDegree(Math.PI), 180, 0.001, 'toDegree(PI) = 180');

    // ===== Tween API =====
    assert(cc.tween != null, 'tween available');
    assert(typeof cc.tween === 'function', 'tween() is a function');
    const tw = cc.tween({ x: 0 });
    assert(tw != null, 'tween() returns tween object');
    assert(typeof tw.to === 'function', 'Tween.to exists');
    assert(typeof tw.by === 'function', 'Tween.by exists');
    assert(typeof tw.call === 'function', 'Tween.call exists');
    assert(typeof tw.delay === 'function', 'Tween.delay exists');
    assert(typeof tw.start === 'function', 'Tween.start exists');

    // ===== Serialization =====
    assert(cc.instantiate != null, 'instantiate available');
    assert(typeof cc.instantiate === 'function', 'instantiate() is a function');

    // ===== sys =====
    assert(cc.sys != null, 'sys available');
    assert(typeof cc.sys.platform === 'number' || typeof cc.sys.platform === 'string', 'sys.platform accessible');
    assert(typeof cc.sys.languageCode === 'string' || cc.sys.languageCode === undefined, 'sys.languageCode accessible');

    endModule();
}
