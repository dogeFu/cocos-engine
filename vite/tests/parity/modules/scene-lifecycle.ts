/**
 * Scene & Node Lifecycle Test
 *
 * Verifies Scene creation, Node hierarchy, component lifecycle events,
 * active/inactive transitions, and scene switching in the built engine.
 */
import { startModule, endModule, assert, assertEqual } from '../test-utils';

export function runSceneLifecycleTest(cc: any) {
    startModule('Scene Lifecycle');

    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return;
    }

    const Scene = cc.Scene;
    const Node = cc.Node;
    const director = cc.director;
    const Component = cc.Component;

    assert(typeof Scene === 'function', 'Scene is a constructor');
    assert(typeof Node === 'function', 'Node is a constructor');
    assert(typeof Component === 'function', 'Component is a constructor');
    assert(director != null, 'cc.director exists');

    // --- Scene creation ---
    let scene: any = null;
    try {
        scene = new Scene('test-scene');
    } catch (e: any) {
        assert(false, 'Scene created', `Error: ${e.message}`);
    }
    assert(scene != null, 'Scene instance created');
    assertEqual(scene.name, 'test-scene', 'Scene name set');

    if (!scene) {
        endModule();
        return;
    }

    // --- Run scene via director ---
    let prevScene: any = null;
    try {
        prevScene = director.getScene();
        director.runSceneImmediate(scene);
    } catch (e: any) {
        assert(false, 'director.runSceneImmediate succeeded', `Error: ${e.message}`);
    }
    assert(director.getScene() === scene, 'getScene() returns current scene');

    // --- Node creation & hierarchy ---
    const root = new Node('root');
    const childA = new Node('childA');
    const childB = new Node('childB');
    const grandchild = new Node('grandchild');

    scene.addChild(root);
    root.addChild(childA);
    root.addChild(childB);
    childA.addChild(grandchild);

    assert(root.parent === scene, 'root.parent is scene');
    assert(childA.parent === root, 'childA.parent is root');
    assert(grandchild.parent === childA, 'grandchild.parent is childA');
    assertEqual(root.children.length, 2, 'root has 2 children');
    assertEqual(scene.children.length, 1, 'scene has 1 child (root)');

    // Node name
    assertEqual(childA.name, 'childA', 'Node.name retained');

    // --- Node active/inactive ---
    assertEqual(childA.active, true, 'Node default active=true');
    childA.active = false;
    assertEqual(childA.active, false, 'Node set active=false');

    // grandchild should still be inactive-in-hierarchy when parent is inactive
    assertEqual(grandchild.activeInHierarchy, false, 'grandchild.activeInHierarchy=false when parent inactive');

    childA.active = true;
    assertEqual(grandchild.activeInHierarchy, true, 'grandchild.activeInHierarchy=true when parent re-activated');

    // --- Node transform ---
    root.setPosition(100, 200, 0);
    const pos = root.position;
    assert(typeof pos.x === 'number' && typeof pos.y === 'number', 'Node.position has x,y');
    assert(Math.abs(pos.x - 100) < 0.01, 'Node.setPosition x', `expected 100, got ${pos.x}`);
    assert(Math.abs(pos.y - 200) < 0.01, 'Node.setPosition y', `expected 200, got ${pos.y}`);

    root.setScale(2, 3, 1);
    const scale = root.scale;
    assert(Math.abs(scale.x - 2) < 0.01 && Math.abs(scale.y - 3) < 0.01, 'Node.setScale', `got (${scale.x}, ${scale.y})`);

    // --- World transform ---
    root.setPosition(0, 0, 0);
    root.setScale(1, 1, 1);
    childB.setPosition(50, 0, 0);
    const worldPos = childB.worldPosition;
    assert(typeof worldPos.x === 'number', 'Node.worldPosition accessible');
    assert(Math.abs(worldPos.x - 50) < 0.01, 'child worldPosition reflects local offset', `expected 50, got ${worldPos.x}`);

    // --- Sibling index ---
    assert(typeof root.getSiblingIndex === 'function', 'Node.getSiblingIndex exists');
    assertEqual(root.getSiblingIndex(), 0, 'root is first child of scene');

    // --- Component management ---
    assert(typeof root.getComponent === 'function', 'Node.getComponent exists');
    assert(typeof root.getComponents === 'function', 'Node.getComponents exists');
    assert(typeof root.addComponent === 'function', 'Node.addComponent exists');
    assert(typeof root.removeComponent === 'function', 'Node.removeComponent exists');
    assert(typeof root.getComponentsInChildren === 'function', 'Node.getComponentsInChildren exists');
    assert(typeof root.getComponentInChildren === 'function', 'Node.getComponentInChildren exists');

    // --- Node events ---
    assert(typeof root.on === 'function', 'Node.on exists');
    assert(typeof root.off === 'function', 'Node.off exists');
    assert(typeof root.once === 'function', 'Node.once exists');
    assert(typeof root.emit === 'function', 'Node.emit exists');
    assert(typeof root.dispatchEvent === 'function', 'Node.dispatchEvent exists');
    assert(typeof root.walk === 'function', 'Node.walk exists');

    // --- Node walk ---
    let walkCount = 0;
    try {
        root.walk(() => { walkCount++; });
        assert(walkCount >= 3, 'Node.walk visits all descendants', `visited ${walkCount} nodes`);
    } catch (e: any) {
        assert(false, 'Node.walk succeeded', `Error: ${e.message}`);
    }

    // --- Node destroy (deferred to end of frame in Cocos) ---
    assert(typeof childA.destroy === 'function', 'Node.destroy exists');
    try {
        childA.destroy();
        assert(true, 'Node.destroy() called without error');
    } catch (e: any) {
        assert(false, 'Node.destroy() called without error', `Error: ${e.message}`);
    }

    // --- Director scene switching ---
    const scene2 = new Scene('test-scene-2');
    try {
        director.runSceneImmediate(scene2);
    } catch (e: any) {
        assert(false, 'director.runSceneImmediate second scene', `Error: ${e.message}`);
    }
    assert(director.getScene() !== scene, 'getScene() returns new scene after switch');

    // --- Director loadScene existence ---
    assert(typeof director.loadScene === 'function', 'director.loadScene exists');
    assert(typeof director.preloadScene === 'function', 'director.preloadScene exists');

    // --- Scene auto-release ---
    assert(typeof scene.autoReleaseAssets === 'boolean', 'Scene.autoReleaseAssets is boolean');

    // Cleanup
    scene2.destroy();

    // Restore original scene if possible
    if (prevScene && prevScene.isValid) {
        try { director.runSceneImmediate(prevScene); } catch (_) {}
    }

    endModule();
}
