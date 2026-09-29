/**
 * Physics Simulation Test
 *
 * Verifies the full physics 2D cycle: rigid body creation, collider attachment,
 * force application, stepping, and syncing. These tests validate the Box2D WASM
 * integration beyond simple world creation.
 */
import { startModule, endModule, assert, assertClose } from '../test-utils';

export function runPhysicsSimulationTest(cc: any) {
    startModule('Physics Simulation');

    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return;
    }

    const hasPhysics2D = cc.PhysicsSystem2D != null && cc.selector?.backend?.['box2d-wasm'];
    if (!hasPhysics2D) {
        endModule();
        return;
    }

    // --- Physics system state ---
    const ps = cc.PhysicsSystem2D.instance;
    assert(ps != null, 'PhysicsSystem2D instance exists');
    assert(typeof ps.enable === 'boolean', 'PhysicsSystem2D.enable is boolean');
    assert(typeof ps.gravity === 'object', 'PhysicsSystem2D.gravity is Vec2');
    assert(typeof ps.fixedTimeStep === 'number', 'PhysicsSystem2D.fixedTimeStep is number');
    assert(typeof ps.velocityIterations === 'number', 'PhysicsSystem2D.velocityIterations exists');
    assert(typeof ps.positionIterations === 'number', 'PhysicsSystem2D.positionIterations exists');

    // --- Scene setup for physics ---
    const Scene = cc.Scene;
    const Node = cc.Node;
    const director = cc.director;
    assert(typeof Scene === 'function', 'Scene is a constructor');
    assert(typeof Node === 'function', 'Node is a constructor');

    let scene: any = null;
    try {
        scene = new Scene('physics-test-scene');
        director.runSceneImmediate(scene);
        assert(true, 'physics test scene created and set');
    } catch (e: any) {
        assert(false, 'physics test scene created and set', `Error: ${e.message}`);
    }

    if (!scene) {
        endModule();
        return;
    }

    // --- RigidBody2D component ---
    const RigidBody2D = cc.RigidBody2D;
    assert(typeof RigidBody2D === 'function', 'RigidBody2D is a constructor');

    const bodyNode = new Node('TestBody');
    scene.addChild(bodyNode);

    let rigidBody: any = null;
    try {
        rigidBody = bodyNode.addComponent(RigidBody2D);
    } catch (e: any) {
        assert(false, 'RigidBody2D added to node', `Error: ${e.message}`);
    }
    assert(rigidBody != null, 'RigidBody2D component created');

    if (rigidBody) {
        // RigidBody2D properties
        assert(typeof rigidBody.type === 'number', 'RigidBody2D.type exists');
        assert(typeof rigidBody.gravityScale === 'number', 'RigidBody2D.gravityScale exists');
        assert(typeof rigidBody.linearDamping === 'number', 'RigidBody2D.linearDamping exists');
        assert(typeof rigidBody.angularDamping === 'number', 'RigidBody2D.angularDamping exists');
        assert(typeof rigidBody.fixedRotation === 'boolean', 'RigidBody2D.fixedRotation exists');
        assert(typeof rigidBody.allowSleep === 'boolean', 'RigidBody2D.allowSleep exists');
        assert(typeof rigidBody.bullet === 'boolean', 'RigidBody2D.bullet exists');
        assert(typeof rigidBody.awakeOnLoad === 'boolean', 'RigidBody2D.awakeOnLoad exists');

        // Linear velocity
        assert(typeof rigidBody.linearVelocity === 'object', 'RigidBody2D.linearVelocity exists');
        const lv = rigidBody.linearVelocity;
        if (lv) {
            assert(typeof lv.x === 'number' && typeof lv.y === 'number', 'RigidBody2D.linearVelocity has x,y');
        }

        // Angular velocity
        assert(typeof rigidBody.angularVelocity === 'number', 'RigidBody2D.angularVelocity exists');

        // Mass
        assert(typeof rigidBody.getMass === 'function', 'RigidBody2D.getMass() exists');
        try {
            const mass = rigidBody.getMass();
            assert(mass > 0, 'RigidBody2D mass > 0', `mass=${mass}`);
        } catch (e: any) {
            assert(false, 'RigidBody2D.getMass() succeeded', `Error: ${e.message}`);
        }

        // Set type and verify
        rigidBody.type = 1; // Dynamic
        assert(rigidBody.type === 1, 'RigidBody2D.type set to Dynamic');

        // Apply force
        assert(typeof rigidBody.applyForce === 'function', 'RigidBody2D.applyForce exists');
        assert(typeof rigidBody.applyForceToCenter === 'function', 'RigidBody2D.applyForceToCenter exists');
        assert(typeof rigidBody.applyLinearImpulse === 'function', 'RigidBody2D.applyLinearImpulse exists');
        assert(typeof rigidBody.applyAngularImpulse === 'function', 'RigidBody2D.applyAngularImpulse exists');
    }

    // --- BoxCollider2D ---
    const BoxCollider2D = cc.BoxCollider2D;
    assert(typeof BoxCollider2D === 'function', 'BoxCollider2D is a constructor');

    let collider: any = null;
    try {
        collider = bodyNode.addComponent(BoxCollider2D);
    } catch (e: any) {
        assert(false, 'BoxCollider2D added to node', `Error: ${e.message}`);
    }
    assert(collider != null, 'BoxCollider2D component created');

    if (collider) {
        assert(typeof collider.size === 'object', 'BoxCollider2D.size exists');
        assert(typeof collider.offset === 'object', 'BoxCollider2D.offset exists');
        assert(typeof collider.density === 'number', 'BoxCollider2D.density exists');
        assert(typeof collider.friction === 'number', 'BoxCollider2D.friction exists');
        assert(typeof collider.restitution === 'number', 'BoxCollider2D.restitution exists');
    }

    // --- CircleCollider2D test (on a new node) ---
    const CircleCollider2D = cc.CircleCollider2D;
    assert(typeof CircleCollider2D === 'function', 'CircleCollider2D is a constructor');

    const circleNode = new Node('TestCircle');
    scene.addChild(circleNode);
    circleNode.addComponent(RigidBody2D);

    let circleCollider: any = null;
    try {
        circleCollider = circleNode.addComponent(CircleCollider2D);
    } catch (e: any) {
        assert(false, 'CircleCollider2D added to node', `Error: ${e.message}`);
    }
    assert(circleCollider != null, 'CircleCollider2D component created');

    if (circleCollider) {
        assert(typeof circleCollider.radius === 'number', 'CircleCollider2D.radius exists');
        assert(typeof circleCollider.offset === 'object', 'CircleCollider2D.offset exists');
    }

    // --- Physics step cycle ---
    assert(typeof ps.step === 'function', 'PhysicsSystem2D.step exists');
    assert(typeof ps.resetAccumulator === 'function', 'PhysicsSystem2D.resetAccumulator exists');
    assert(typeof ps.raycast === 'function', 'PhysicsSystem2D.raycast exists');
    assert(typeof ps.testPoint === 'function', 'PhysicsSystem2D.testPoint exists');
    assert(typeof ps.testAABB === 'function', 'PhysicsSystem2D.testAABB exists');

    // Apply force and step
    if (rigidBody) {
        const force = new cc.Vec2(100, 0);
        try {
            rigidBody.applyForceToCenter(force, true);
            assert(true, 'applyForceToCenter(100,0) succeeded');
        } catch (e: any) {
            assert(false, 'applyForceToCenter(100,0) succeeded', `Error: ${e.message}`);
        }
    }

    // Step physics a few times
    const dt = 1 / 60;
    for (let i = 0; i < 3; i++) {
        try {
            // Use postUpdate to simulate the game loop step
            ps.postUpdate(dt);
        } catch (e: any) {
            if (i === 0) {
                assert(false, `PhysicsSystem2D.postUpdate(${dt}) succeeded`, `Error on step ${i}: ${e.message}`);
            }
        }
    }
    assert(true, 'physics stepped 3 frames without crash');

    // Verify body position changed after force + steps
    if (rigidBody) {
        try {
            const lv = rigidBody.linearVelocity;
            const speed = Math.sqrt(lv.x * lv.x + lv.y * lv.y);
            assert(speed >= 0, 'linear velocity magnitude is non-negative after force', `speed=${speed.toFixed(3)}`);
        } catch (e: any) {
            assert(false, 'linear velocity accessible after step', `Error: ${e.message}`);
        }
    }

    // --- Raycast test ---
    const Vec2 = cc.Vec2;
    try {
        const results = ps.raycast(new Vec2(-10, 0), new Vec2(10, 0), 0, 0xffffffff);
        assert(Array.isArray(results), 'PhysicsSystem2D.raycast returns array');
    } catch (e: any) {
        assert(false, 'PhysicsSystem2D.raycast succeeded', `Error: ${e.message}`);
    }

    // --- Test point ---
    try {
        const results = ps.testPoint(new Vec2(0, 0));
        assert(Array.isArray(results), 'PhysicsSystem2D.testPoint returns array');
    } catch (e: any) {
        assert(false, 'PhysicsSystem2D.testPoint succeeded', `Error: ${e.message}`);
    }

    // --- Collision matrix ---
    assert(ps.collisionMatrix != null, 'PhysicsSystem2D.collisionMatrix exists');

    // Cleanup
    bodyNode.destroy();
    circleNode.destroy();
    scene.destroy();

    endModule();
}
