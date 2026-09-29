import type { Asset } from "../asset/assets";

import type { AssetRef, AssetRefUUID } from "./asset-ref";
import { loadAsset, loadAssetByUUID } from "./asset";

export interface PaceConfig {
    perFrame: number;
    concurrency: number;
}

const DEFAULT_PACE: PaceConfig = { perFrame: 5, concurrency: 10 };

type ResourceRef = AssetRef | AssetRefUUID;
type ProgressCallback = (done: number, total: number) => void;

interface QueueEntry {
    ref: ResourceRef;
    resolve: (asset: Asset) => void;
    reject: (error: Error) => void;
}

export class ResourceLoader {
    private _queue: QueueEntry[] = [];
    private _active = 0;
    private _total = 0;
    private _completed = 0;
    private _pace: PaceConfig = { ...DEFAULT_PACE };
    private _running = false;
    private _progressCbs: ProgressCallback[] = [];
    private _completeCbs: Array<() => void> = [];
    private _readyResolve: (() => void) | null = null;
    private _readyPromise: Promise<void> | null = null;
    private _dedupMap = new Map<string, Promise<Asset>>();

    /** Register a resource to be loaded. Returns a Promise that resolves when loaded. */
    register(ref: ResourceRef): Promise<Asset> {
        const key = this._refKey(ref);
        const existing = this._dedupMap.get(key);
        if (existing) return existing;

        this._total++;
        const promise = new Promise<Asset>((resolve, reject) => {
            this._queue.push({ ref, resolve, reject });
        });
        this._dedupMap.set(key, promise);
        return promise;
    }

    /** Configure loading pace. Must be called before run() / ready(). */
    pace(config: Partial<PaceConfig>): void {
        if (config.perFrame !== undefined) this._pace.perFrame = config.perFrame;
        if (config.concurrency !== undefined)
            this._pace.concurrency = config.concurrency;
    }

    /** Start loading if not already started. Idempotent. */
    ensureStarted(): void {
        if (this._running) return;
        if (this._queue.length === 0 && this._total === 0) return;
        this._running = true;
        this._readyPromise = new Promise(
            (resolve) => {
                this._readyResolve = resolve;
            },
        );
        this._tick();
    }

    onProgress(fn: ProgressCallback): void {
        this._progressCbs.push(fn);
    }

    onComplete(fn: () => void): void {
        this._completeCbs.push(fn);
    }

    ready(): Promise<void> {
        this.ensureStarted();
        return this._readyPromise ?? Promise.resolve();
    }

    // ── private ──

    private _refKey(ref: ResourceRef): string {
        if ("uuid" in ref) return `uuid:${ref.uuid}`;
        return `bundle:${ref.bundle}/${ref.path}`;
    }

    private _tick(): void {
        const process = (): void => {
            let started = 0;
            while (
                started < this._pace.perFrame &&
                this._active < this._pace.concurrency &&
                this._queue.length > 0
            ) {
                const entry = this._queue.shift()!;
                this._startOne(entry);
                started++;
                this._active++;
            }

            if (this._completed >= this._total && this._total > 0) {
                this._completeCbs.forEach((fn) => fn());
                this._readyResolve?.();
                return;
            }

            if (this._queue.length > 0 || this._active > 0) {
                requestAnimationFrame(process);
            } else {
                this._running = false;
            }
        };
        requestAnimationFrame(process);
    }

    private async _startOne(entry: QueueEntry): Promise<void> {
        try {
            const asset = "uuid" in entry.ref
                ? await loadAssetByUUID(entry.ref as AssetRefUUID)
                : await loadAsset(entry.ref as AssetRef);
            entry.resolve(asset);
        } catch (e) {
            entry.reject(e as Error);
        } finally {
            this._active--;
            this._completed++;
            this._progressCbs.forEach((fn) => fn(this._completed, this._total));
        }
    }
}
