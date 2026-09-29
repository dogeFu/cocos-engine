export const ASSET_REF_BRAND: unique symbol = Symbol("AssetRef");

export interface AssetRef<T = any> {
    readonly [ASSET_REF_BRAND]: true;
    readonly bundle: string;
    readonly path: string;
    readonly type?: new (...args: any[]) => T;
}

export interface AssetRefUUID<T = any> {
    readonly [ASSET_REF_BRAND]: true;
    readonly uuid: string;
    readonly type?: new (...args: any[]) => T;
}

export function isAssetRef(value: unknown): value is AssetRef | AssetRefUUID {
    return (
        typeof value === "object" &&
        value !== null &&
        ASSET_REF_BRAND in value
    );
}

export function assetRef<T = any>(
    bundle: string,
    path: string,
    type?: new (...args: any[]) => T,
): AssetRef<T> {
    return { [ASSET_REF_BRAND]: true as const, bundle, path, type };
}

export function uuidRef<T = any>(
    uuid: string,
    type?: new (...args: any[]) => T,
): AssetRefUUID<T> {
    return { [ASSET_REF_BRAND]: true as const, uuid, type };
}
