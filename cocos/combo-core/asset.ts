import { assetManager, type Asset, type AssetManager } from "../asset/asset-manager";
import { type AssetRef, type AssetRefUUID } from "./asset-ref";

const bundleCache = new Map<string, AssetManager.Bundle>();

export async function loadBundle(name: string): Promise<AssetManager.Bundle> {
    const cached = bundleCache.get(name);
    if (cached) {
        return cached;
    }

    const bundle = await new Promise<AssetManager.Bundle>((resolve, reject) => {
        assetManager.loadBundle(name, (error, loadedBundle) => {
            if (error || !loadedBundle) {
                reject(error ?? new Error(`Failed to load bundle: ${name}`));
                return;
            }
            resolve(loadedBundle);
        });
    });

    bundleCache.set(name, bundle);
    return bundle;
}

export async function loadAsset<T extends Asset>(
    reference: AssetRef<T>,
): Promise<T> {
    const bundle = await loadBundle(reference.bundle);

    return new Promise<T>((resolve, reject) => {
        const onComplete = (error: Error | null, asset: T | null): void => {
            if (error || !asset) {
                reject(
                    error ??
                        new Error(
                            `Failed to load asset: ${reference.bundle}/${reference.path}`,
                        ),
                );
                return;
            }
            resolve(asset);
        };

        if (reference.type) {
            bundle.load(reference.path, reference.type, null, onComplete);
            return;
        }

        bundle.load<T>(reference.path, null, null, onComplete);
    });
}

export async function loadAssetByUUID<T extends Asset>(
    reference: AssetRefUUID<T>,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const onComplete = (error: Error | null, asset: T | null): void => {
            if (error || !asset) {
                reject(
                    error ??
                        new Error(`Failed to load asset by UUID: ${reference.uuid}`),
                );
                return;
            }
            resolve(asset);
        };

        assetManager.loadAny(
            { uuid: reference.uuid },
            null,
            null,
            onComplete as any,
        );
    });
}
