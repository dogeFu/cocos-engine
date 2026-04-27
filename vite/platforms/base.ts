import type { AliasOptions } from "vite";
import { resolve } from "path";
import { createRequire } from "module";
import { featuresToConstants } from "../utils/constants";

const require = createRequire(import.meta.url);
const jiti = require("jiti")(__filename);

const engineRoot = resolve(__dirname, "../..");

export interface UserConfig {
    features: {
        spine: boolean;
        spineVersion: "3.8" | "4.2";
        dragonBones: boolean;
        marionette: boolean;
        physics: boolean;
        physics2D: boolean;
        skeletalAnimation: boolean;
    };

    build: {
        debug: boolean;
        sourceMap: boolean;
        minify: boolean;
    };

    platform: string;
}

export interface PlatformConfig {
    name: string;

    required: {
        constants: Record<string, boolean | number>;
        alias: AliasOptions;
        output: {
            format: "es" | "cjs" | "iife";
            preserveModules?: boolean;
        };
    };

    defaults: {
        features?: Partial<UserConfig["features"]>;
        build?: Partial<UserConfig["build"]>;
    };

    constraints?: {
        unsupportedFeatures?: string[];
        forcedOffFeatures?: string[];
        requiredOutputFormat?: "es" | "cjs" | "iife";
    };

    jsbReplacements?: Record<string, string>;

    postBuild?: (outputDir: string, finalConfig: BuildConfig) => Promise<void>;
}

export interface BuildConfig {
    constants: Record<string, boolean | number>;
    features: UserConfig["features"];
    alias: AliasOptions;
    output: PlatformConfig["required"]["output"];
    build: UserConfig["build"];
    jsbReplacements?: Record<string, string>;
}

export function mergeConfig(
    userConfig: UserConfig,
    platformConfig: PlatformConfig,
): BuildConfig {
    const { required, defaults, constraints } = platformConfig;

    if (constraints?.unsupportedFeatures) {
        for (const feature of constraints.unsupportedFeatures) {
            if ((userConfig.features as Record<string, boolean>)[feature]) {
                throw new Error(
                    `[${platformConfig.name}] 不支持功能 "${feature}"，请在 user.config.ts 中关闭它`,
                );
            }
        }
    }

    const features = {
        ...defaults.features,
        ...userConfig.features,
    };

    if (constraints?.forcedOffFeatures) {
        for (const feature of constraints.forcedOffFeatures) {
            if (features[feature as keyof typeof features]) {
                console.warn(
                    `[${platformConfig.name}] 强制关闭功能 "${feature}"，该平台不支持`,
                );
                (features as Record<string, boolean>)[feature] = false;
            }
        }
    }

    const build = {
        ...defaults.build,
        ...userConfig.build,
    };

    const output = constraints?.requiredOutputFormat
        ? { ...required.output, format: constraints.requiredOutputFormat }
        : required.output;

    const constants = {
        ...required.constants,
        ...featuresToConstants(features),
        DEBUG: build.debug,
        BUILD: !build.debug,
    };

    return {
        constants,
        features,
        alias: required.alias,
        output,
        build,
        jsbReplacements: platformConfig.jsbReplacements,
    };
}

export function defineUserConfig(config: UserConfig): UserConfig {
    return config;
}

export function definePlatformConfig(config: PlatformConfig): PlatformConfig {
    return config;
}

export function getEngineRoot(): string {
    return engineRoot;
}

export function loadUserConfig(): UserConfig {
    const userConfigPath = resolve(engineRoot, "vite/user.config.ts");

    try {
        const config = jiti(userConfigPath);
        return config.default || config;
    } catch {
        return {
            platform: "web",
            features: {
                spine: true,
                spineVersion: "3.8",
                dragonBones: false,
                marionette: true,
                physics: true,
                physics2D: true,
            },
            build: {
                debug: false,
                sourceMap: true,
                minify: false,
            },
        };
    }
}

export function loadPlatformConfig(platform: string): PlatformConfig {
    const platformConfigPath = resolve(
        engineRoot,
        "vite/platforms",
        platform,
        "platform.config.ts",
    );

    try {
        const config = jiti(platformConfigPath);
        return config.default || config;
    } catch (error) {
        throw new Error(`无法加载平台配置: ${platform}。错误: ${error}`);
    }
}
