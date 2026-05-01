/**
 * Shared test utilities for build parity tests.
 * Each module imports these utilities to define and run tests.
 *
 * Rule 3 (CLAUDE.md): skip() is forbidden. Every test either asserts or doesn't exist.
 */

export type TestStatus = 'pass' | 'fail';

export interface TestResult {
    module: string;
    name: string;
    status: TestStatus;
    detail?: string;
    duration: number;
}

export interface ModuleResult {
    name: string;
    tests: TestResult[];
    passed: number;
    failed: number;
    duration: number;
}

export interface ParityReport {
    modules: ModuleResult[];
    summary: { total: number; passed: number; failed: number };
    timestamp: string;
}

const results: ModuleResult[] = [];
let currentModule: ModuleResult | null = null;

export function startModule(name: string) {
    currentModule = { name, tests: [], passed: 0, failed: 0, duration: 0 };
    results.push(currentModule);
}

export function endModule() {
    if (currentModule) {
        currentModule.duration = currentModule.tests.reduce((s, t) => s + t.duration, 0);
        currentModule = null;
    }
}

function record(status: TestStatus, name: string, detail?: string, duration = 0) {
    if (!currentModule) throw new Error('No active module — call startModule() first');
    const result: TestResult = { module: currentModule.name, name, status, detail, duration };
    currentModule.tests.push(result);
    if (status === 'pass') currentModule.passed++;
    else currentModule.failed++;
}

export function assert(condition: boolean, name: string, detail?: string) {
    const start = performance.now();
    if (condition) {
        record('pass', name, undefined, performance.now() - start);
    } else {
        record('fail', name, detail || 'Assertion failed', performance.now() - start);
    }
}

export function assertEqual<T>(actual: T, expected: T, name: string) {
    const start = performance.now();
    if (actual === expected) {
        record('pass', name, undefined, performance.now() - start);
    } else {
        record('fail', name, `Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`, performance.now() - start);
    }
}

export function assertClose(actual: number, expected: number, tolerance: number, name: string) {
    const start = performance.now();
    if (Math.abs(actual - expected) <= tolerance) {
        record('pass', name, undefined, performance.now() - start);
    } else {
        record('fail', name, `Expected ~${expected} (±${tolerance}), Got: ${actual}`, performance.now() - start);
    }
}

export function getReport(): ParityReport {
    const total = results.reduce((s, m) => s + m.tests.length, 0);
    const passed = results.reduce((s, m) => s + m.passed, 0);
    const failed = results.reduce((s, m) => s + m.failed, 0);
    return { modules: results, summary: { total, passed, failed }, timestamp: new Date().toISOString() };
}

export function formatReport(report: ParityReport): string {
    let out = `\n=== Build Parity Test Report ===\n`;
    out += `Time: ${report.timestamp}\n`;
    out += `Total: ${report.summary.total} | Passed: ${report.summary.passed} | Failed: ${report.summary.failed}\n`;

    for (const mod of report.modules) {
        const icon = mod.failed > 0 ? 'FAIL' : mod.tests.length === 0 ? 'WARN' : 'OK';
        out += `\n[${icon}] ${mod.name} (${mod.passed}/${mod.tests.length})\n`;
        for (const t of mod.tests) {
            const prefix = t.status === 'pass' ? '  + ' : '  X ';
            out += `${prefix}${t.name}`;
            if (t.detail) out += ` — ${t.detail}`;
            out += '\n';
        }
    }
    return out;
}
