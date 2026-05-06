/**
 * Parity test entry — bundles all test modules into a single IIFE
 * and exposes `runAllParityTests(cc, features?)` on the window.
 */

import { getReport, formatReport, type ParityReport, type FeatureManifest } from './test-utils';
import { runAPIParityTest } from './modules/api-surface';
import { runBehaviorParityTest } from './modules/runtime-behavior';
import { runWASMParityTest } from './modules/wasm-modules';
import { runRenderingParityTest } from './modules/rendering';
import { runCrossConfigParityTest } from './modules/cross-config';

declare global {
    interface Window {
        runAllParityTests: (cc: any, features?: FeatureManifest) => ParityReport;
        __PARITY_DONE__: boolean;
        __PARITY_REPORT__: ParityReport | null;
    }
}

window.runAllParityTests = function (cc: any, features?: FeatureManifest): ParityReport {
    runAPIParityTest(cc, features);
    runBehaviorParityTest(cc);
    runWASMParityTest(cc, features);
    runRenderingParityTest(cc);
    runCrossConfigParityTest(cc, features);

    const report = getReport();
    console.log(formatReport(report));
    return report;
};
