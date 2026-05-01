# Cocos Creator Engine: 3D, Physics, and Particle Systems -- AI Scripting Reference

This document covers the 3D system, 3D/2D physics engines, primitive geometry generation, and the 3D particle system in the Cocos Creator engine. It is written as a reference for AI-assisted scripting, focusing on correct API usage, hidden behaviors, and non-obvious dependencies.

---

## Table of Contents

1. [3D System (`cocos/3d/`)](#1-3d-system)
2. [3D Physics (`cocos/physics/`)](#2-3d-physics)
3. [2D Physics (`cocos/physics-2d/`)](#3-2d-physics)
4. [Primitive Geometry (`cocos/primitive/`)](#4-primitive-geometry)
5. [Particle System (`cocos/particle/`)](#5-particle-system)

---

## 1. 3D System

### 1.1 Mesh (`cocos/3d/assets/mesh.ts`)

**Class:** `Mesh extends Asset` (line 280)

The `Mesh` class is the core data container for all 3D geometry. A mesh holds one or more sub-meshes (primitives), each referencing vertex bundles with interleaved vertex attributes.

**Key interfaces:**

- `Mesh.IStruct` (line 181): The structural description of a mesh. Contains `vertexBundles`, `primitives`, `minPosition`, `maxPosition`, optional `morph`, and `dynamic` data.
- `Mesh.IVertexBundle` (line 74): One interleaved set of vertex attributes. `view` is an `IBufferView` (offset, length, count, stride) and `attributes` is an array of GFX `Attribute`.
- `Mesh.ISubMesh` (line 103): References vertex bundles via `vertexBundelIndices` (note: the typo `vertexBundelIndices` is in the actual API). Contains `primitiveMode` and optional `indexView`.
- `Mesh.ICreateInfo` (line 254): The pair of `struct` + `data` (Uint8Array) used to create or reset a mesh.

**Key methods:**

- `initialize()` (line 409): Lazily builds GPU resources. Must be called (or triggered by accessing `renderingSubMeshes`) before the mesh can render. Handles compressed, encoded, and quantized mesh data transparently.
- `reset(info: Mesh.ICreateInfo)` (line 729): Replaces the mesh struct and data. Destroys existing GPU resources. This is the way to programmatically create a mesh.
- `updateSubMesh(primitiveIndex, dynamicGeometry)` (line 573): Updates a sub-mesh for dynamic meshes. The mesh must have `struct.dynamic` set. Writes vertex/index data to GPU buffers and updates bounds.
- `readAttribute(primitiveIndex, attributeName)` (line 1168): Returns a typed array of the requested attribute (e.g., `AttributeName.ATTR_POSITION`). Returns null if not found.
- `readIndices(primitiveIndex)` (line 1261): Returns index data as Uint8/16/32Array.
- `merge(mesh, worldMatrix?, validate?)` (line 790): Merges another mesh into this one. If `worldMatrix` is provided, positions are transformed. Two meshes must have matching vertex bundle layouts.
- `getBoneSpaceBounds(skeleton)` (line 742): Computes per-bone AABB bounds for skeletal animation.

**Hidden knowledge:**
- The `_allowDataAccess` flag (line 383) controls whether CPU-side mesh data is kept after GPU upload. Setting it to false frees memory but prevents `readAttribute`/`readIndices` from working. Default is true.
- Mesh data can be compressed (zlib), encoded (meshopt), or quantized (half-float). `initialize()` handles all three transparently.
- Index stride is automatically downgraded from 32-bit to 16-bit if the device lacks `Feature.ELEMENT_INDEX_UINT` and vertex count < 65536 (line 509).
- `renderingSubMeshes` is lazily initialized. Accessing it triggers `initialize()`.

**File path index (mesh.ts):**

| Item | Line |
|------|------|
| `class Mesh` | 280 |
| `Mesh.IStruct` | 181 |
| `Mesh.IVertexBundle` | 74 |
| `Mesh.ISubMesh` | 103 |
| `Mesh.ICreateInfo` | 254 |
| `initialize()` | 409 |
| `reset()` | 729 |
| `updateSubMesh()` | 573 |
| `readAttribute()` | 1168 |
| `readIndices()` | 1261 |
| `merge()` | 790 |
| `renderingSubMeshes` getter | 358 |

### 1.2 MeshRenderer (`cocos/3d/framework/mesh-renderer.ts`)

**Class:** `MeshRenderer extends ModelRenderer` (line 313)

The primary component for rendering 3D meshes. Creates and manages a `scene.Model` in the render scene.

**Key properties:**

- `mesh: Mesh | null` (line 483): The mesh to render. Setting this triggers full model re-initialization, morph weight reset, and material reassignment.
- `shadowCastingMode` (line 414): `ModelShadowCastingMode.OFF` (0) or `ON` (1). Controls whether this model casts shadows.
- `shadowReceivingMode` (line 455): `ModelShadowReceivingMode.OFF` (0) or `ON` (1). Controls whether this model receives shadows.
- `shadowBias` / `shadowNormalBias` (lines 379, 396): Per-model shadow bias values.
- `bakeSettings: ModelBakeSettings` (line 333): Lightmap baking, light probe, and reflection probe configuration.
- `model: Model | null` (line 509): Read-only access to the underlying render-scene model.

**Key methods:**

- `getWeight(subMeshIndex, shapeIndex)` / `setWeight(weight, subMeshIndex, shapeIndex)` (lines 677, 720): Control per-morph-target weights.
- `setWeights(weights[], subMeshIndex)` (line 695): Set all morph target weights for a sub-mesh at once.
- `setInstancedAttribute(name, value)` (line 733): Set per-instance attribute data.

**Hidden knowledge:**
- If `highQualityMode` is enabled in project settings, `shadowCastingMode` defaults to ON and `bakeSettings.castShadow`/`receiveShadow` default to true (line 569).
- Setting `mesh` resets all morph target weights to zero.
- When a `MorphModel` is needed (mesh has morph data + `enableMorph` is true), it is automatically used instead of the base `scene.Model`.
- A missing material is replaced by the pink `missing-material` builtin (line 1118).

### 1.3 Light Components (`cocos/3d/lights/`)

All light types extend the base `Light` class and are `Component` subclasses.

**Base class:** `Light extends Component` (`cocos/3d/lights/light-component.ts`, line 107)

Common properties across all lights:
- `color: Color` (line 139): Light color (RGB 0-255).
- `useColorTemperature: boolean` (line 159): Enable color temperature.
- `colorTemperature: number` (line 176): Range 1000-15000.
- `visibility: number` (line 231): Bitmask controlling which layers the light affects.
- `baked: boolean` (line 213): Whether this light participates in lightmap baking.

**Lifecycle:** `onLoad` creates the light, `onEnable` attaches to the render scene, `onDisable` detaches. The light object is obtained from `cclegacy.director.root.createLight(this._lightType)`.

#### DirectionalLight (`cocos/3d/lights/directional-light-component.ts`, line 45)

- `illuminance: number` (line 102): Light intensity. Value depends on HDR/LDR mode. Default HDR: 65000.
- `shadowEnabled: boolean` (line 131): Enable realtime shadow casting.
- `shadowDistance: number` (line 240): Max shadow distance from camera. Default: 50.
- `csmLevel` (line 288): Cascaded Shadow Map level (CSMLevel enum).
- `enableCSM: boolean` (line 313): Convenience setter. CSM requires `csmLevel > LEVEL_1`.
- `shadowFixedArea: boolean` (line 376): Use fixed orthographic shadow camera.
- **Only one real-time directional light is allowed per scene.** It is automatically set as the main light (line 287).

#### SphereLight (`cocos/3d/lights/sphere-light-component.ts`, line 42)

- `luminousFlux: number` (line 64): Total luminous output.
- `luminance: number` (line 92): Surface brightness.
- `term: PhotometricTerm` (line 121): Choose between LUMINOUS_FLUX (0) and LUMINANCE (1).
- `size: number` (line 139): Light source size. Range 0-10. Default: 0.15.
- `range: number` (line 157): Maximum influence range. Default: 1.

#### SpotLight (`cocos/3d/lights/spot-light-component.ts`, line 42)

All SphereLight properties plus:
- `spotAngle: number` (line 191): Cone angle in degrees. Range 2-180. Default: 60.
- `angleAttenuationStrength: number` (line 208): Edge softness. 0=hard, 1=soft.
- `shadowEnabled/shadowPcf/shadowBias/shadowNormalBias`: Shadow map support.

#### PointLight (`cocos/3d/lights/point-light-component.ts`, line 41)

- `luminousFlux: number` (line 61)
- `luminance: number` (line 92)
- `term: PhotometricTerm` (line 121)
- `range: number` (line 136): Default: 1.

**Hidden knowledge:**
- All light intensity values have separate HDR and LDR storage. The getter returns the appropriate one based on `getPipelineSceneData().isHDR`.
- Luminous flux and luminance are related by `scene.nt2lm(size)`. Changing one auto-computes the other.
- The `visibility` bitmask on a light must match the node layer of a `MeshRenderer` for that light to affect it.

### 1.4 createMesh (`cocos/3d/misc/create-mesh.ts`)

**Function:** `createMesh(geometry: IGeometry, out?: Mesh, options?: ICreateMeshOptions): Mesh` (line 44)

This is the primary way to create a `Mesh` from raw geometry data at runtime.

**Parameter `geometry` (IGeometry):**
- `positions: number[]` -- Required. Flat array of xyz triplets.
- `normals?: number[]` -- Optional.
- `uvs?: number[]` -- Optional. Flat xy pairs.
- `tangents?: number[]` -- Optional. Flat xyzw quads.
- `colors?: number[]` -- Optional. Flat xyzw quads.
- `indices?: number[]` -- Optional. Triangle indices.
- `primitiveMode?: PrimitiveMode` -- Default: `TRIANGLE_LIST`.
- `minPos/maxPos?: Vec3` -- Bounding box. If omitted and `options.calculateBounds` is true, computed automatically.
- `attributes?: Attribute[]` -- Override default attribute formats.
- `customAttributes?: { attr: Attribute, values: number[] }[]` -- Custom vertex attributes.

**Default attribute formats** (line 32):
- Position: `RGB32F`
- Normal: `RGB32F`
- TexCoord: `RG32F`
- Tangent: `RGBA32F`
- Color: `RGBA32F`

**Options:** `{ calculateBounds?: boolean }`

**Dynamic mesh creation:** `createDynamicMesh(primitiveIndex, geometry, out?, options?)` (line 254). Requires `ICreateDynamicMeshOptions` with `maxSubMeshes`, `maxSubMeshVertices`, `maxSubMeshIndices`.

**Also available via:** `MeshUtils.createMesh()` and `MeshUtils.createDynamicMesh()` (lines 396, 409).

**Hidden knowledge:**
- The function internally uses `BufferBlob` to build a contiguous binary blob. Index buffer always uses 16-bit (`R16UI`).
- If no output mesh is provided, a new `Mesh` is created.
- For dynamic meshes, you must call `mesh.updateSubMesh()` after initial creation to upload actual geometry data.

---

## 2. 3D Physics (`cocos/physics/`)

### 2.1 PhysicsSystem (`cocos/physics/framework/physics-system.ts`, line 47)

**Class:** `PhysicsSystem extends System` (singleton)

The global physics simulation manager. Registered as `'PHYSICS'` system.

**Key properties:**

- `enable: boolean` (line 91): Pause/resume the entire physics system.
- `gravity: Vec3` (line 149): Default `(0, -10, 0)`.
- `fixedTimeStep: number` (line 135): Fixed timestep per step. Default: `1/60`.
- `maxSubSteps: number` (line 121): Max sub-steps per frame. Default: 1.
- `autoSimulation: boolean` (line 180): Whether the system auto-steps each frame. Default: true.
- `allowSleep: boolean` (line 104): Allow bodies to sleep. Default: true.
- `sleepThreshold: number` (line 166): Velocity threshold for sleep. Default: 0.1.
- `collisionMatrix` (line 303): `ICollisionMatrix` for group/mask filtering.
- `minVolumeSize` (line 311): Minimum collision body size. Default: 1e-5.

**Access:** `PhysicsSystem.instance` (static getter, line 81).

**Simulation loop** (`postUpdate`, line 340):
1. Emits `DirectorEvent.BEFORE_PHYSICS`.
2. Accumulates `deltaTime`. While accumulator >= `fixedTimeStep` and substep count < `maxSubSteps`:
   - `syncSceneToPhysics()` -- syncs node transforms to physics.
   - `step(fixedTimeStep)` -- advances simulation.
   - `emitEvents()` -- fires collision/trigger callbacks.
   - `syncAfterEvents()` -- post-event sync.
3. Emits `DirectorEvent.AFTER_PHYSICS`.

### 2.2 Raycasting API

All raycasting is performed through `PhysicsSystem.instance`.

**`raycast(worldRay, mask?, maxDistance?, queryTrigger?)`** (line 499)
- `worldRay: geometry.Ray` -- `{ o: Vec3 (origin), d: Vec3 (direction) }`. Direction should be normalized.
- `mask: number` -- Group mask, default `0xffffffff`.
- `maxDistance: number` -- Default `10000000`. Do NOT use `Infinity` or `Number.MAX_VALUE`.
- `queryTrigger: boolean` -- Whether to include trigger colliders. Default: true.
- Returns `boolean` indicating if any hit was found.
- Results stored in `PhysicsSystem.instance.raycastResults: PhysicsRayResult[]`.

**`raycastClosest(worldRay, mask?, maxDistance?, queryTrigger?)`** (line 522)
- Same parameters. Result in `PhysicsSystem.instance.raycastClosestResult`.

**`PhysicsRayResult`** (`cocos/physics/framework/physics-ray-result.ts`, line 34):
- `hitPoint: Vec3` -- World-space hit position.
- `distance: number` -- Distance from ray origin.
- `collider: Collider` -- The hit collider component.
- `hitNormal: Vec3` -- World-space surface normal at hit.
- `closestHitFraction: number` -- 0-1 fraction (Bullet only).

**Sweep tests:**
- `sweepBox(worldRay, halfExtent, orientation, mask?, maxDistance?, queryTrigger?)` (line 637)
- `sweepBoxClosest(...)` (line 676)
- `sweepSphere(worldRay, radius, ...)` (line 711)
- `sweepSphereClosest(...)` (line 747)
- `sweepCapsule(worldRay, radius, height, orientation, ...)` (line 784)
- `sweepCapsuleClosest(...)` (line 828)

**Line strip cast:**
- `lineStripCast(samplePointsWorldSpace, ...)` (line 543) -- Raycasts between consecutive points.
- `lineStripCastClosest(...)` (line 593)

**Debug drawing:**
- `debugDrawFlags: number` (line 465) -- Bitmask of `EPhysicsDrawFlags`.
- `debugDrawConstraintSize: number` (line 479) -- Default: 0.3.

**Hidden knowledge:**
- `maxDistance` must not be `Infinity`. Use `10000000` as the practical max.
- The builtin physics engine is a simplified implementation; for full physics use Bullet or other backends selected via project settings.
- `PhysicsSystem` is auto-constructed on `DirectorEvent.INIT` (line 893).
- Default gravity is `(0, -10, 0)`, not `(0, -9.81, 0)`.

### 2.3 RigidBody (`cocos/physics/framework/components/rigid-body.ts`, line 60)

**Class:** `RigidBody extends Component`

**Key properties:**

- `type: ERigidBodyType` (line 102): `DYNAMIC` (1), `STATIC` (2), `KINEMATIC` (4). Default: DYNAMIC.
- `group: number` (line 80): Physics group bitmask.
- `mass: number` (line 121): Default: 1. Warns if <= 0 (clamped to 0.0001).
- `linearDamping: number` (line 160): Range 0-1. Default: 0.1.
- `angularDamping: number` (line 179): Range 0-1. Default: 0.1.
- `useGravity: boolean` (line 199): Default: true.
- `linearFactor: Vec3` (line 216): Per-axis velocity scaling. Default: `(1,1,1)`.
- `angularFactor: Vec3` (line 234): Per-axis rotation scaling. Default: `(1,1,1)`.
- `allowSleep: boolean` (line 140): Default: true.
- `useCCD: boolean` (line 272): Continuous collision detection for fast bodies.

**Convenience getters:**
- `isStatic`, `isDynamic`, `isKinematic` -- Boolean getters/setters (lines 324, 339, 354).
- `isAwake`, `isSleepy`, `isSleeping` -- State queries (lines 291, 302, 313).

**Force/impulse methods:**
- `applyForce(force: Vec3, relativePoint?: Vec3)` (line 440) -- World-space force.
- `applyLocalForce(force: Vec3, localPoint?: Vec3)` (line 452) -- Local-space force.
- `applyImpulse(impulse: Vec3, relativePoint?: Vec3)` (line 464) -- World-space impulse.
- `applyLocalImpulse(impulse: Vec3, localPoint?: Vec3)` (line 476) -- Local-space impulse.
- `applyTorque(torque: Vec3)` (line 487) / `applyLocalTorque(torque: Vec3)` (line 498).

**Velocity methods:**
- `getLinearVelocity(out: Vec3)` (line 559) / `setLinearVelocity(value: Vec3)` (line 570).
- `getAngularVelocity(out: Vec3)` (line 581) / `setAngularVelocity(value: Vec3)` (line 592).
- `clearState()` (line 528) / `clearForces()` (line 538) / `clearVelocity()` (line 548).
- `wakeUp()` (line 508) / `sleep()` (line 518).

**Group/Mask:**
- `getGroup/setGroup/addGroup/removeGroup` (lines 605-641)
- `getMask/setMask/addMask/removeMask` (lines 650-686)

**Hidden knowledge:**
- The `_isInitialized` guard (line 404) checks that the body has been created during `onLoad`. Calling force/impulse methods before `onLoad` triggers an error.
- `executionOrder` is -1 (line 59), ensuring rigid body updates happen before renderers.
- Group values must be powers of two (single bit).

### 2.4 Colliders (`cocos/physics/framework/components/colliders/`)

**Base class:** `Collider extends Eventify(Component)` (`collider.ts`, line 46)

Common properties:
- `attachedRigidBody: RigidBody | null` (line 76) -- Finds `RigidBody` on the same node (does NOT traverse parent).
- `sharedMaterial: PhysicsMaterial | null` (line 91) -- The physics material.
- `material: PhysicsMaterial | null` (line 109) -- Clone-on-write accessor. Accessing this when shared clones the material.
- `isTrigger: boolean` (line 149) -- Whether this is a trigger (no physical response). Always true in builtin mode.
- `center: Vec3` (line 167) -- Local offset.

**Event callbacks** (register via `node.on()` on the collider's node, NOT on the collider itself):
- `onTriggerEnter`, `onTriggerStay`, `onTriggerExit` -- For trigger colliders.
- `onCollisionEnter`, `onCollisionStay`, `onCollisionExit` -- For physical colliders.
- Callback signature: `(event?: ICollisionEvent | ITriggerEvent) => void`.
- Event object contains `selfCollider`, `otherCollider`, `contacts` (array of contact points).

**Collider types** (enum `EColliderType` in `physics-enum.ts`, line 185):

| Type | Class | File | Key Properties |
|------|-------|------|----------------|
| BOX | `BoxCollider` | `box-collider.ts:50` | `size: Vec3` (default 1,1,1) |
| SPHERE | `SphereCollider` | `sphere-collider.ts:47` | `radius: number` (default 0.5) |
| CAPSULE | `CapsuleCollider` | `capsule-collider.ts:49` | `radius` (0.5), `cylinderHeight` (1), `direction` (Y_AXIS), `height` (computed) |
| MESH | `MeshCollider` | `mesh-collider.ts:52` | `mesh: Mesh`, `convex: boolean` |
| CYLINDER | `CylinderCollider` | `cylinder-collider.ts` | Similar to capsule |
| CONE | `ConeCollider` | `cone-collider.ts` | Cone shape |
| PLANE | `PlaneCollider` | `plane-collider.ts` | Infinite plane |
| SIMPLEX | `SimplexCollider` | `simplex-collider.ts` | Point/line/triangle/tetrahedron |

**Hidden knowledge:**
- `CapsuleCollider.height` is a computed property: `radius * 2 + cylinderHeight` (line 118). Setting `height` adjusts `cylinderHeight`.
- `MeshCollider` with a `DYNAMIC` rigid body requires `convex = true`. A warning is emitted if `convex` is false with a dynamic body (mesh-collider.ts line 107).
- `BoxCollider.size` values are forced non-negative via `absolute()` (box-collider.ts line 68).
- The `attachedRigidBody` only looks on the **same node**, not parent nodes (collider.ts line 492).

### 2.5 Physics Enums (`cocos/physics/framework/physics-enum.ts`)

**`ERigidBodyType`** (line 33): `DYNAMIC=1`, `STATIC=2`, `KINEMATIC=4`.

**`EColliderType`** (line 185): `BOX`, `SPHERE`, `CAPSULE`, `CYLINDER`, `CONE`, `MESH`, `PLANE`, `SIMPLEX`.

**`EAxisDirection`** (line 64): `X_AXIS=0`, `Y_AXIS=1`, `Z_AXIS=2`.

**`EConstraintType`** (line 251): `POINT_TO_POINT`, `HINGE`, `FIXED`, `CONFIGURABLE`.

**`EPhysicsDrawFlags`** (line 391): `NONE=0`, `WIRE_FRAME=0x0001`, `CONSTRAINT=0x0002`, `AABB=0x0004`.

**`PhysicsGroup`** (line 380): `DEFAULT=1`.

---

## 3. 2D Physics (`cocos/physics-2d/`)

### 3.1 PhysicsSystem2D (`cocos/physics-2d/framework/physics-system.ts`, line 40)

**Class:** `PhysicsSystem2D extends Eventify(System)` (singleton)

**Key properties:**
- `enable: boolean` (line 47): Pause/resume.
- `gravity: Vec2` (line 76): Default `(0, -10 * PHYSICS_2D_PTM_RATIO)`. Internally converted to Box2D units.
- `fixedTimeStep: number` (line 106): Default `1/60`.
- `maxSubSteps: number` (line 92): Default 1.
- `autoSimulation: boolean` (line 120): Default true.
- `velocityIterations: number` (line 141): Box2D velocity solver iterations. Default: 10.
- `positionIterations: number` (line 147): Box2D position solver iterations. Default: 10.
- `debugDrawFlags: number` (line 128).

**Access:** `PhysicsSystem2D.instance` (static, line 200).

**Raycast API:**
- `raycast(p1: IVec2Like, p2: IVec2Like, type: ERaycast2DType, mask: number)` (line 362)
- `testPoint(p: Vec2)` (line 370) -- Point-in-collider test.
- `testAABB(rect: Rect)` (line 378) -- AABB overlap test.

**Backends:** Builtin (simple), Box2D (JSB), Box2D-WASM. Selected via `selector.id`.

**Hidden knowledge:**
- `PHYSICS_2D_PTM_RATIO` converts between pixel and physics meter units.
- Gravity is multiplied by `PHYSICS_2D_PTM_RATIO` internally.
- Box2D backend requires manual loading in some configurations (`LOAD_BOX2D_MANUALLY`).

### 3.2 RigidBody2D (`cocos/physics-2d/framework/components/rigid-body-2d.ts`)

**Class:** `RigidBody2D extends Component` (line 39)

**Key properties:**
- `type: ERigidBody2DType` (line 84): Static, Kinematic, Dynamic, or Animated (line 84).
- `group: number` (line 48): Physics group.
- `enabledContactListener: boolean` (line 57): Must be true to receive collision callbacks.
- `bullet: boolean` (line 74): CCD for fast-moving bodies.
- `allowSleep: boolean` (line 107): Default true.
- `gravityScale: number` (line ~120): Multiplier for gravity on this body.

**Hidden knowledge:**
- `Animated` type is internally mapped to `Kinematic` (line 91) but uses `setTransform` each frame.
- Contact callbacks only fire when `enabledContactListener` is true on the `RigidBody2D`.

### 3.3 Collider2D (`cocos/physics-2d/framework/components/colliders/collider-2d.ts`, line 39)

**Class:** `Collider2D extends Eventify(Component)`

**Key properties:**
- `tag: number` (line 50): Identifies which collider was hit when a node has multiple colliders.
- `group: number` (line 60): Physics group.
- `density: number` (line 76): Shape density.

**2D Collider types** (from file structure):
- `BoxCollider2D` (`box-collider-2d.ts`)
- `CircleCollider2D` (`circle-collider-2d.ts`)
- `PolygonCollider2D` (`polygon-collider-2d.ts`)

**2D Joint types:**
- `DistanceJoint2D`, `FixedJoint2D`, `HingeJoint2D`, `MouseJoint2D`, `RelativeJoint2D`, `SliderJoint2D`, `SpringJoint2D`, `WheelJoint2D` (all in `framework/components/joints/`).

---

## 4. Primitive Geometry (`cocos/primitive/`)

### 4.1 Geometry Definition (`cocos/primitive/define.ts`)

**`IGeometry`** (line 76): The standard geometry data structure.

| Field | Type | Description |
|-------|------|-------------|
| `positions` | `number[]` | **Required.** Flat xyz triplets. |
| `normals` | `number[]` | Optional flat xyz triplets. |
| `uvs` | `number[]` | Optional flat xy pairs. |
| `tangents` | `number[]` | Optional flat xyzw quads. |
| `colors` | `number[]` | Optional flat xyzw quads. |
| `indices` | `number[]` | Optional triangle indices. |
| `primitiveMode` | `PrimitiveMode` | Default `TRIANGLE_LIST`. |
| `doubleSided` | `boolean` | For raycast backface collision. |
| `minPos/maxPos` | `{x,y,z}` | Bounding box. |
| `boundingRadius` | `number` | Bounding sphere radius. |
| `customAttributes` | `{attr, values}[]` | Custom vertex attributes. |

**`IDynamicGeometry`** (line 193): Same as IGeometry but uses `Float32Array`/`Uint16Array`/`Uint32Array`.

### 4.2 Primitive Component (`cocos/primitive/primitive.ts`, line 49)

**Class:** `Primitive extends Mesh` (ccclass `cc.Primitive`)

A `Mesh` subclass that auto-generates geometry on load.

- `type: PrimitiveType` (line 60): One of BOX=0, SPHERE=1, CYLINDER=2, CONE=3, CAPSULE=4, TORUS=5, PLANE=6, QUAD=7.
- `info: Record<string, number>` (line 70): Parameters passed to the geometry factory.

**On load** (line 83): Calls `primitives[PrimitiveType[this.type].toLowerCase()](this.info)` then `createMesh(geometry, this)`.

### 4.3 Geometry Factory Functions

All functions return `IGeometry`.

**`box(options?)`** -- `cocos/primitive/box.ts`, line 92
- `width`, `height`, `length`: Extents (default 1).
- `widthSegments`, `heightSegments`, `lengthSegments`: Subdivisions (default 1).
- Produces: positions, normals, uvs, tangents, indices.

**`sphere(radius?, opts?)`** -- `cocos/primitive/sphere.ts`, line 46
- `radius`: Default 0.5.
- `opts.segments`: Latitude/longitude divisions. Default 32.
- UV mapping: standard equirectangular.

**`cylinder(radiusTop?, radiusBottom?, height?, opts?)`** -- `cocos/primitive/cylinder.ts`
- `radialSegments`, `heightSegments`: Subdivisions.
- `capped: boolean`: Include caps.
- `arc: number`: Partial cylinder (degrees).

**`cone(radius?, height?, opts?)`** -- `cocos/primitive/cone.ts`
- Convenience wrapper: cylinder with `radiusTop = 0`.

**`capsule(radius?, height?, opts?)`** -- `cocos/primitive/capsule.ts`
- Capsule = cylinder + two hemisphere caps.

**`torus(radius?, tube?, opts?)`** -- `cocos/primitive/torus.ts`, line 49
- `radius`: Ring radius (default 0.4).
- `tube`: Tube radius (default 0.1).
- `radialSegments`, `tubularSegments`: Subdivisions.
- `arc`: Partial torus (degrees).

**`plane(width?, length?, opts?)`** -- `cocos/primitive/plane.ts`
- `widthSegments`, `lengthSegments`: Subdivisions.
- Lying on XZ plane, normal facing +Y.

**`quad(width?, height?)`** -- `cocos/primitive/quad.ts`
- Single quad (2 triangles) on XY plane.

### 4.4 Runtime Mesh Creation Pattern

To create a mesh from a primitive at runtime:

1. Call a geometry factory (e.g., `sphere(1.0, { segments: 32 })`).
2. Pass the result to `createMesh(geometry)` from `cocos/3d/misc`.
3. Assign to a `MeshRenderer.mesh` or use as a `MeshCollider` mesh.

```typescript
import { SphereCollider } from 'cc';
import { createMesh } from 'cocos/3d/misc';
import sphere from 'cocos/primitive/sphere';

const geo = sphere(1.0, { segments: 16 });
const mesh = createMesh(geo);
meshRenderer.mesh = mesh;
```

**Hidden knowledge:**
- Primitive functions are plain functions, not classes. They return `IGeometry`, not `Mesh`.
- `Primitive.onLoaded()` is called during deserialization. The `type` and `info` must be set **before** the asset loads.
- All primitive functions use pre-allocated `Vec3` temporaries -- do not store returned references across frames.
- The `center` option in geometry functions repositions the geometry center.

---

## 5. Particle System (`cocos/particle/`)

### 5.1 ParticleSystem (`cocos/particle/particle-system.ts`, line 76)

**Class:** `ParticleSystem extends ModelRenderer` (ccclass `cc.ParticleSystem`)

The main particle system component. Extends `ModelRenderer` so it manages a render-scene model internally via a `processor` (either CPU or GPU renderer).

**Core properties:**

- `capacity: number` (line 84): Max particles. Default: 100.
- `duration: number` (line 241): Emission duration in seconds. Default: 5.0.
- `loop: boolean` (line 251): Loop emission. Default: true.
- `prewarm: boolean` (line 259): Start with one full cycle simulated. Only effective with `loop = true`.
- `playOnAwake: boolean` (line 308): Auto-play on enable. Default: true.
- `simulationSpeed: number` (line 299): Time multiplier. Default: 1.0.
- `simulationSpace: ParticleSpace` (line 278): `World` (0), `Local` (1), or `Custom` (2). Default: Local.
- `playOnAwake: boolean` (line 308): Default true.

**Emission properties (CurveRange-based):**

- `rateOverTime: CurveRange` (line 330): Particles per second. Default constant: 10.
- `rateOverDistance: CurveRange` (line 341): Particles per unit distance moved.
- `bursts: Burst[]` (line 351): Timed burst events.

**Initial particle properties (CurveRange-based):**

- `startDelay: CurveRange` (line 222): Delay before emission starts.
- `startLifetime: CurveRange` (line 232): Particle lifetime. Default constant: 5.
- `startSpeed: CurveRange` (line 167): Initial velocity. Default constant: 5.
- `startSizeX/Y/Z: CurveRange` (lines 133, 145, 157): Initial size. Default: 1. `startSize3D: boolean` enables per-axis sizing.
- `startRotationX/Y/Z: CurveRange` (lines 188, 199, 211): Initial rotation. `startRotation3D: boolean` enables per-axis.
- `startColor: GradientRange` (line 103): Initial color.
- `gravityModifier: CurveRange` (line 318): Gravity multiplier.
- `scaleSpace: ParticleSpace` (line 113): Space for scale calculations.

**Modules** (lazy-initialized in editor):

| Module | Property | Line |
|--------|----------|------|
| Shape | `shapeModule` | 539 |
| Color over lifetime | `colorOverLifetimeModule` | 514 |
| Size over lifetime | `sizeOvertimeModule` | 564 |
| Velocity over lifetime | `velocityOvertimeModule` | 589 |
| Force over lifetime | `forceOvertimeModule` | 614 |
| Limit velocity | `limitVelocityOvertimeModule` | 640 |
| Rotation over lifetime | `rotationOvertimeModule` | 665 |
| Texture animation | `textureAnimationModule` | 690 |
| Noise | `noiseModule` | 719 |
| Trail | `trailModule` | 744 |
| Renderer | `renderer` | 767 |

**Control methods:**

- `play()` (line 947): Start or resume emission.
- `pause()` (line 986): Pause emission. Warns if already stopped.
- `stop()` (line 1011): Stop and clear all particles.
- `stopEmitting()` (line 1002): Stop emitting but let existing particles finish.
- `clear()` (line 1048): Remove all particles immediately.
- `getParticleCount(): number` (line 1060): Current live particle count.
- `emit(count, dt)` (line 1340): Engine-internal. Emits `count` particles.

**Culling:**

- `renderCulling: boolean` (line 361): Enable frustum culling.
- `cullingMode: ParticleCullingMode` (line 385): `Pause` (0), `PauseAndCatchup` (1), `AlwaysSimulate` (2).
- `aabbHalfX/Y/Z` (lines 409, 428, 455): Manual bounding box override.

### 5.2 Particle (`cocos/particle/particle.ts`, line 29)

**Class:** `Particle`

The per-particle data structure. Key fields:
- `position: Vec3`, `velocity: Vec3`, `ultimateVelocity: Vec3`
- `rotation: Vec3`, `startEuler: Vec3`
- `startSize: Vec3`, `size: Vec3`
- `startColor: Color`, `color: Color`
- `remainingLifetime: number`, `startLifetime: number`
- `randomSeed: number`, `loopCount: number`
- `frameIndex: number`, `startRow: number` (for texture animation)
- `trailDelay: number`

**Static constants:**
- `INDENTIFY_NEG_QUAT = 10` (line 30)
- `R2D = 180 / Math.PI` (line 31)

### 5.3 ShapeModule (`cocos/particle/emitter/shape-module.ts`, line 64)

Defines the emitter volume/surface shape.

**Shape types** (`ParticleShapeType` enum, `cocos/particle/enum.ts`, line 95):
- `Box` (0), `Circle` (1), `Cone` (2), `Sphere` (3), `Hemisphere` (4).

**Emit location** (`ParticleEmitLocation`, line 127):
- `Base` (0), `Edge` (1), `Shell` (2), `Volume` (3).
- Applicability varies by shape type.

**Key properties:**
- `position: Vec3` (line 71): Emitter local offset.
- `rotation: Vec3` (line 85): Emitter rotation.
- `scale: Vec3` (line 99): Emitter scale.
- `shapeType: ParticleShapeType` -- The emitter shape.
- `emitFrom: ParticleEmitLocation` -- Emit from surface or volume.

### 5.4 Particle Enums (`cocos/particle/enum.ts`)

**`ParticleSpace`** (line 27): `World=0`, `Local=1`, `Custom=2`.

**`ParticleCullingMode`** (line 39): `Pause=0`, `PauseAndCatchup=1`, `AlwaysSimulate=2`.

**`ParticleRenderMode`** (line 62): `Billboard=0`, `StretchedBillboard=1`, `HorizontalBillboard=2`, `VerticalBillboard=3`, `Mesh=4`.

**`ParticleAlignmentSpace`** (line 51): `World=0`, `Local=1`, `View=2`.

**`ParticleArcMode`** (line 154): `Random=0`, `Loop=1`, `PingPong=2`.

### 5.5 CurveRange and GradientRange

- `CurveRange` (`cocos/particle/animator/curve-range.ts`): A curve with constant/random/modes. Used for time-varying values.
- `GradientRange` (`cocos/particle/animator/gradient-range.ts`): Color gradient with constant/random/two-gradient modes.

**Hidden knowledge:**
- Module properties are lazily created in the editor (`EDITOR_NOT_IN_PREVIEW`). Accessing `shapeModule` in editor code creates a new instance if null.
- Trail module is CPU-only. `useGPU` on the renderer disables trail support.
- The `emit()` method (line 1340) is public but engine-internal. It is used by `Burst` objects.
- `_prewarmSystem()` (line 1427) simulates the entire duration in 1-second steps. It sets `startDelay` to 0 during prewarm.
- Particle system `update()` is the main simulation entry point. It runs in the component update loop, NOT the director event system.
- The `beforeRender()` callback (line 1302) is registered on `DirectorEvent.BEFORE_COMMIT` and handles scene attach/detach based on particle count.

---

## Appendix: File Path Quick Reference

### 3D System

| Component | Path |
|-----------|------|
| Mesh | `cocos/3d/assets/mesh.ts` |
| MeshRenderer | `cocos/3d/framework/mesh-renderer.ts` |
| Light base | `cocos/3d/lights/light-component.ts` |
| DirectionalLight | `cocos/3d/lights/directional-light-component.ts` |
| SphereLight | `cocos/3d/lights/sphere-light-component.ts` |
| SpotLight | `cocos/3d/lights/spot-light-component.ts` |
| PointLight | `cocos/3d/lights/point-light-component.ts` |
| createMesh | `cocos/3d/misc/create-mesh.ts` |
| MeshUtils | `cocos/3d/misc/create-mesh.ts:387` |

### 3D Physics

| Component | Path |
|-----------|------|
| PhysicsSystem | `cocos/physics/framework/physics-system.ts` |
| PhysicsRayResult | `cocos/physics/framework/physics-ray-result.ts` |
| RigidBody | `cocos/physics/framework/components/rigid-body.ts` |
| Collider (base) | `cocos/physics/framework/components/colliders/collider.ts` |
| BoxCollider | `cocos/physics/framework/components/colliders/box-collider.ts` |
| SphereCollider | `cocos/physics/framework/components/colliders/sphere-collider.ts` |
| CapsuleCollider | `cocos/physics/framework/components/colliders/capsule-collider.ts` |
| MeshCollider | `cocos/physics/framework/components/colliders/mesh-collider.ts` |
| ConstantForce | `cocos/physics/framework/components/constant-force.ts` |
| PhysicsMaterial | `cocos/physics/framework/assets/physics-material.ts` |
| Physics enums | `cocos/physics/framework/physics-enum.ts` |
| Constraint (base) | `cocos/physics/framework/components/constraints/constraint.ts` |
| ConfigurableConstraint | `cocos/physics/framework/components/constraints/configurable-constraint.ts` |
| CharacterController | `cocos/physics/framework/components/character-controllers/character-controller.ts` |

### 2D Physics

| Component | Path |
|-----------|------|
| PhysicsSystem2D | `cocos/physics-2d/framework/physics-system.ts` |
| RigidBody2D | `cocos/physics-2d/framework/components/rigid-body-2d.ts` |
| Collider2D (base) | `cocos/physics-2d/framework/components/colliders/collider-2d.ts` |
| BoxCollider2D | `cocos/physics-2d/framework/components/colliders/box-collider-2d.ts` |
| CircleCollider2D | `cocos/physics-2d/framework/components/colliders/circle-collider-2d.ts` |
| PolygonCollider2D | `cocos/physics-2d/framework/components/colliders/polygon-collider-2d.ts` |
| 2D physics types | `cocos/physics-2d/framework/physics-types.ts` |

### Primitive Geometry

| Component | Path |
|-----------|------|
| IGeometry / IDynamicGeometry | `cocos/primitive/define.ts` |
| Primitive (component) | `cocos/primitive/primitive.ts` |
| box() | `cocos/primitive/box.ts` |
| sphere() | `cocos/primitive/sphere.ts` |
| cylinder() | `cocos/primitive/cylinder.ts` |
| cone() | `cocos/primitive/cone.ts` |
| capsule() | `cocos/primitive/capsule.ts` |
| torus() | `cocos/primitive/torus.ts` |
| plane() | `cocos/primitive/plane.ts` |
| quad() | `cocos/primitive/quad.ts` |

### Particle System

| Component | Path |
|-----------|------|
| ParticleSystem | `cocos/particle/particle-system.ts` |
| Particle | `cocos/particle/particle.ts` |
| ShapeModule | `cocos/particle/emitter/shape-module.ts` |
| Enums | `cocos/particle/enum.ts` |
| Burst | `cocos/particle/burst.ts` |
| CurveRange | `cocos/particle/animator/curve-range.ts` |
| GradientRange | `cocos/particle/animator/gradient-range.ts` |
| ColorOverLifetimeModule | `cocos/particle/animator/color-overtime.ts` |
| ForceOvertimeModule | `cocos/particle/animator/force-overtime.ts` |
| VelocityOvertimeModule | `cocos/particle/animator/velocity-overtime.ts` |
| SizeOvertimeModule | `cocos/particle/animator/size-overtime.ts` |
| RotationOvertimeModule | `cocos/particle/animator/rotation-overtime.ts` |
| TextureAnimationModule | `cocos/particle/animator/texture-animation.ts` |
| LimitVelocityOvertimeModule | `cocos/particle/animator/limit-velocity-overtime.ts` |
| NoiseModule | `cocos/particle/animator/noise-module.ts` |
| TrailModule | `cocos/particle/renderer/trail.ts` |
| ParticleSystemRenderer (data) | `cocos/particle/renderer/particle-system-renderer-data.ts` |
| Renderer (CPU) | `cocos/particle/renderer/particle-system-renderer-cpu.ts` |
| Renderer (GPU) | `cocos/particle/renderer/particle-system-renderer-gpu.ts` |
| BillboardRenderer | `cocos/particle/billboard.ts` |
