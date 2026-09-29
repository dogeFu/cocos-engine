import type { Plugin } from "vite";
import * as fs from "fs";
import * as path from "path";
import { featuresToConstants } from "../utils/constants";

export interface CocosModulesOptions {
    configPath?: string;
    features?: {
        spine: boolean;
        spineVersion: "3.8" | "4.2";
        dragonBones: boolean;
        marionette: boolean;
        proceduralAnimation: boolean;
        vendorGoogle: boolean;
        physics: boolean;
        physics2D: boolean;
        particle?: boolean;
        particle2D?: boolean;
        skeletalAnimation?: boolean;
    };
    platform?: string;
}

interface ModuleConfig {
    enabledModules: string[];
    disabledModules: string[];
    buildConstants: Record<string, boolean | number | string>;
}

const MODULE_EXPORTS: Record<string, string[]> = {
    base: ["export * from '../../exports/base';"],
    "2d": ["export * from '../../exports/2d';"],
    "3d": ["export * from '../../exports/3d';"],
    animation: ["export * from '../../exports/animation';"],
    audio: ["export * from '../../exports/audio';"],
    video: ["export * from '../../exports/video';"],
    webview: ["export * from '../../exports/webview';"],
    tween: ["export * from '../../exports/tween';"],
    "tiled-map": ["export * from '../../exports/tiled-map';"],
    profiler: ["export * from '../../exports/profiler';"],
    primitive: ["export * from '../../exports/primitive';"],
    graphics: ["export * from '../../exports/graphics';"],
    mask: ["export * from '../../exports/mask';"],
    "rich-text": ["export * from '../../exports/rich-text';"],
    ui: ["export * from '../../exports/ui';"],
    "ui-skew": ["export * from '../../exports/ui-skew';"],
    particle: ["export * from '../../exports/particle';"],
    "particle-2d": ["export * from '../../exports/particle-2d';"],
    "intersection-2d": ["export * from '../../exports/intersection-2d';"],
    "affine-transform": ["export * from '../../exports/affine-transform';"],
    sorting: ["export * from '../../exports/sorting';"],
    "sorting-2d": ["export * from '../../exports/sorting-2d';"],
    "legacy-pipeline": ["export * from '../../exports/legacy-pipeline';"],
    "light-probe": ["export * from '../../exports/light-probe';"],
    "geometry-renderer": ["export * from '../../exports/geometry-renderer';"],
    "physics-framework": ["export * from '../../exports/physics-framework';"],
    "physics-builtin": ["export * from '../../exports/physics-builtin';"],
    "physics-2d-framework": [
        "export * from '../../exports/physics-2d-framework';",
    ],
    "physics-2d-builtin": ["export * from '../../exports/physics-2d-builtin';"],
    "physics-2d-box2d": ["export * from '../../exports/physics-2d-box2d';"],
    "physics-2d-box2d-wasm": ["export * from '../../exports/physics-2d-box2d-wasm';"],
    "spine-3.8": ["export * from '../../exports/spine';"],
    "spine-4.2": ["export * from '../../exports/spine';"],
    "dragon-bones": ["export * from '../../exports/dragon-bones';"],
    "vendor-google": ["export * from '../../exports/vendor-google';"],
    "skeletal-animation": ["export * from '../../exports/skeletal-animation';"],
    "gfx-webgl": ["export * from '../../exports/gfx-webgl';"],
    "gfx-webgl2": ["export * from '../../exports/gfx-webgl2';"],
    "gfx-empty": ["export * from '../../exports/gfx-empty';"],
    "combo-core": ["export * from '../../exports/combo-core';"],
    "gfx-webgpu": ["export * from '../../exports/gfx-webgpu';"],
};

const MODULE_DEPENDENCIES: Record<string, string[]> = {
    "2d": ["base", "sorting"],
    "3d": ["base"],
    animation: ["base"],
    ui: ["2d"],
    "spine-3.8": ["2d"],
    "spine-4.2": ["2d"],
    "dragon-bones": ["2d"],
    "skeletal-animation": ["animation"],
    "physics-framework": ["base"],
    "physics-builtin": ["physics-framework"],
    "physics-2d-framework": ["base"],
    "physics-2d-builtin": ["physics-2d-framework"],
    "physics-2d-box2d": ["physics-2d-framework"],
    "physics-2d-box2d-wasm": ["physics-2d-framework"],
    "tiled-map": ["2d"],
    graphics: ["2d"],
    mask: ["2d"],
    "rich-text": ["2d"],
    "ui-skew": ["2d"],
    "particle-2d": ["2d"],
    "intersection-2d": ["2d"],
    "sorting-2d": ["2d"],
    "light-probe": ["3d"],
    "combo-core": ["2d"],
    "geometry-renderer": ["3d"],
};

function resolveDependencies(modules: string[]): string[] {
    const resolved = new Set<string>();

    function addModule(module: string) {
        if (resolved.has(module)) return;

        const deps = MODULE_DEPENDENCIES[module] || [];
        deps.forEach((dep) => addModule(dep));
        resolved.add(module);
    }

    modules.forEach((m) => addModule(m));
    return Array.from(resolved);
}

function featuresToModules(features: CocosModulesOptions["features"]): {
    enabled: string[];
    disabled: string[];
} {
    if (!features) {
        // No features specified — use a minimal safe default
        return {
            enabled: [
                "base",
                "2d",
                "3d",
                "animation",
                "audio",
                "gfx-webgl",
                "gfx-webgl2",
                "gfx-empty",
                "tween",
                "ui",
            ],
            disabled: [],
        };
    }

    // Blacklist approach: start from ALL known modules, only disable
    // what feature flags explicitly turn off. This is safer than a
    // whitelist because new modules are included by default.
    const allModules = Object.keys(MODULE_EXPORTS);
    const disabled = new Set<string>();

    // Platform-specific: gfx-webgpu requires native external files (glslang.js),
    // never included in standard web builds
    disabled.add("gfx-webgpu");

    // -- Feature-gated modules (disabled unless feature is on) --

    if (features.spine) {
        // Keep the selected version, disable the other
        const wrongVersion = features.spineVersion === "4.2" ? "spine-3.8" : "spine-4.2";
        disabled.add(wrongVersion);
    } else {
        disabled.add("spine-3.8");
        disabled.add("spine-4.2");
    }

    if (!features.dragonBones) {
        disabled.add("dragon-bones");
    }

    if (!features.vendorGoogle) {
        disabled.add("vendor-google");
    }

    if (!features.physics) {
        disabled.add("physics-framework");
        disabled.add("physics-builtin");
    }

    if (!features.physics2D) {
        disabled.add("physics-2d-framework");
        disabled.add("physics-2d-builtin");
        disabled.add("physics-2d-box2d");
        disabled.add("physics-2d-box2d-wasm");
    }

    if (!features.particle) {
        disabled.add("particle");
    }

    if (!features.particle2D) {
        disabled.add("particle-2d");
    }

    // skeletal-animation has no disable counterpart —
    // it's an add-on to the animation module, always safe to include

    const enabled = allModules.filter((m) => !disabled.has(m));
    return { enabled, disabled: [...disabled] };
}

function createBuildConstants(
    features: CocosModulesOptions["features"],
    platform: string,
): Record<string, boolean> {
    const featureConstants = featuresToConstants(features);

    const constants: Record<string, boolean | number> = {
        HTML5:
            platform === "web" ||
            platform === "wechat" ||
            platform.startsWith("minigame"),
        NATIVE: platform === "native",
        EDITOR: false,
        PREVIEW: false,
        BUILD: true,
        DEBUG: false,
        DEV: false,
        USE_3D: true,
        USE_UI_SKEW: false,
        USE_SORTING_2D: false,
        SUPPORT_JIT: true,
        ...featureConstants,
        MARIONETTE: features?.marionette ?? false,
        PROCEDURAL_ANIMATION: features?.proceduralAnimation ?? false,
        USE_VENDOR_GOOGLE: features?.vendorGoogle ?? false,
        CULL_MESHOPT: false,
        LOAD_SPINE_MANUALLY: false,
        LOAD_BOX2D_MANUALLY: false,
        WASM_SUBPACKAGE: false,
    };

    return constants;
}

export function cocosModules(options: CocosModulesOptions = {}): Plugin {
    const { configPath, features, platform = "web" } = options;
    const engineRoot = path.resolve(__dirname, "../../");

    let config: ModuleConfig;
    let entryContent: string;

    return {
        name: "vite-plugin-cocos-modules",
        enforce: "pre",

        config() {
            if (features) {
                const { enabled, disabled } = featuresToModules(features);
                config = {
                    enabledModules: enabled,
                    disabledModules: disabled,
                    buildConstants: createBuildConstants(features, platform),
                };
            } else if (configPath && fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, "utf-8");
                config = JSON.parse(configContent);
            } else {
                config = {
                    enabledModules: [
                        "base",
                        "2d",
                        "3d",
                        "animation",
                        "audio",
                        "gfx-webgl",
                        "gfx-webgl2",
                        "gfx-empty",
                        "tween",
                        "ui",
                    ],
                    disabledModules: [],
                    buildConstants: createBuildConstants(null, platform),
                };
            }

            const enabledModules = resolveDependencies(config.enabledModules);
            const uniqueModules = [...new Set(enabledModules)];

            const exports: string[] = [];
            const addedModules = new Set<string>();

            uniqueModules.forEach((module) => {
                if (addedModules.has(module)) return;

                const moduleExports = MODULE_EXPORTS[module];
                if (moduleExports) {
                    moduleExports.forEach((exp) => {
                        const exportPath = exp.match(/from '([^']+)'/)?.[1];
                        if (exportPath) {
                            const absolutePath = path.resolve(
                                engineRoot,
                                "vite/plugins",
                                exportPath,
                            );
                            exports.push(exp.replace(exportPath, absolutePath));
                        }
                    });
                    addedModules.add(module);
                }
            });

            entryContent = `// Auto-generated entry file based on features configuration
// Enabled modules: ${uniqueModules.join(", ")}

${exports.join("\n")}

// Force re-export types that get tree-shaken in dev mode
export { EventMouse, EventTouch, EventKeyboard, EventAcceleration, EventGamepad } from '${path.resolve(engineRoot, "cocos/input/types")}';
export { KeyCode } from '${path.resolve(engineRoot, "cocos/input/types")}';
export { Touch } from '${path.resolve(engineRoot, "cocos/input/types")}';
export { SystemEventType } from '${path.resolve(engineRoot, "cocos/input/types")}';
`;

            const define: Record<string, string> = {};
            Object.entries(config.buildConstants).forEach(([key, value]) => {
                define[`${key}`] = JSON.stringify(value);
            });
            return {
                define,
            };
        },

        resolveId(id) {
            if (id === "virtual:cocos-entry") {
                return id;
            }
            return null;
        },

        load(id) {
            if (id === "virtual:cocos-entry") {
                return entryContent;
            }
            return null;
        },

        buildStart() {
            console.log("\n📦 Cocos Modules Plugin:");
            console.log(
                "   Enabled modules:",
                config.enabledModules.join(", "),
            );
            console.log(
                "   Disabled modules:",
                config.disabledModules.slice(0, 5).join(", ") +
                    (config.disabledModules.length > 5 ? "..." : ""),
            );
            console.log("   Spine version:", features?.spineVersion || "none");
            console.log("");
        },
    };
}
