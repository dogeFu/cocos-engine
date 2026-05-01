/**
 * Parity test entry — bundles all test modules into a single IIFE
 * and exposes `runAllParityTests(cc)` on the window.
 */

import { getReport, formatReport, type ParityReport } from './test-utils';
import { runAPIParityTest } from './modules/api-surface';
import { runBehaviorParityTest } from './modules/runtime-behavior';
import { runWASMParityTest } from './modules/wasm-modules';
import { runRenderingParityTest } from './modules/rendering';

declare global {
    interface Window {
        runAllParityTests: (cc: any) => ParityReport;
    }
}

window.runAllParityTests = function (cc: any): ParityReport {
    runAPIParityTest(cc);
    runBehaviorParityTest(cc);
    runWASMParityTest(cc);
    runRenderingParityTest(cc);

    const report = getReport();
    console.log(formatReport(report));
    return report;
};
