// AI Auto-Fix Framework for Cocos Engine Vite Build
// 
// This script provides AI with structured failure analysis and repair tracking.
// AI reads this data to understand what's broken and how to fix it.
//
// AI Agent Workflow:
// 1. Load test page (e.g., /vite/test.html)
// 2. Wait for tests to complete (window.AI_TEST_FRAMEWORK.isComplete())
// 3. Read failure report: window.AI_AUTO_FIX.getDiagnosticReport()
// 4. Analyze root cause from the report
// 5. Fix source code
// 6. Rebuild: npm run build:vite
// 7. Reload page and repeat until all tests pass

window.AI_AUTO_FIX = {
    version: '2.0.0',
    config: {
        maxIterations: 10,
        testPages: [
            '/vite/test.html',
            '/vite/platform-test.html',
            '/vite/behavior-test.html'
        ]
    },
    state: {
        iteration: 0,
        totalFixed: 0,
        fixLog: [],
        currentTestPage: null,
        isRunning: false,
        startTime: null
    }
};

(function() {
    'use strict';

    const aiAutoFix = window.AI_AUTO_FIX;
    const framework = window.AI_TEST_FRAMEWORK;

    if (!framework) {
        console.error('[AI Auto-Fix] AI_TEST_FRAMEWORK not found!');
        return;
    }

    // Get comprehensive diagnostic report for AI
    aiAutoFix.getDiagnosticReport = function() {
        if (!framework.isComplete()) {
            return {
                status: 'tests_not_complete',
                message: 'Wait for tests to complete before reading diagnostics',
                currentStatus: framework.status
            };
        }
        
        const aiReport = framework.getAIReport();
        const failureReport = framework.getFailureReport();
        
        return {
            status: 'ready_for_analysis',
            timestamp: new Date().toISOString(),
            testPage: aiAutoFix.state.currentTestPage || 'unknown',
            iteration: aiAutoFix.state.iteration,
            summary: aiReport.summary,
            failureAnalysis: aiReport.failureAnalysis,
            errorAnalysis: aiReport.errorAnalysis,
            recommendations: aiReport.recommendations,
            rawFailures: failureReport.failures,
            rawErrors: failureReport.errors,
            fixHistory: aiAutoFix.state.fixLog
        };
    };

    // Get simple failure summary for quick AI assessment
    aiAutoFix.getFailureSummary = function() {
        if (!framework.isComplete()) {
            return null;
        }

        const report = framework.getFailureReport();
        return {
            total: report.summary.total,
            passed: report.summary.passed,
            failed: report.summary.failed,
            failures: report.failures.map(f => ({
                section: f.section,
                test: f.name,
                detail: f.detail
            })),
            errors: report.errors.map(e => ({
                type: e.type,
                message: e.message,
                stack: e.stack ? e.stack.split('\n').slice(0, 3).join('\n') : null
            }))
        };
    };

    // AI calls this to start auto-fix cycle
    aiAutoFix.startFixCycle = async function(testPageUrl) {
        if (aiAutoFix.state.isRunning) {
            console.warn('[AI Auto-Fix] Already running');
            return;
        }

        aiAutoFix.state.isRunning = true;
        aiAutoFix.state.currentTestPage = testPageUrl;
        aiAutoFix.state.iteration = 0;
        aiAutoFix.state.startTime = new Date().toISOString();
        aiAutoFix.state.fixLog = [];

        console.log('[AI Auto-Fix] Starting auto-fix cycle for:', testPageUrl);
        aiAutoFix.logFix('START', `Auto-fix cycle started for ${testPageUrl}`, null);

        while (aiAutoFix.state.iteration < aiAutoFix.config.maxIterations) {
            aiAutoFix.state.iteration++;
            console.log(`[AI Auto-Fix] === Iteration ${aiAutoFix.state.iteration}/${aiAutoFix.config.maxIterations} ===`);

            // Wait for tests to complete
            await aiAutoFix.waitForTests(30000);

            // Get diagnostic report
            const diagnostic = aiAutoFix.getDiagnosticReport();
            if (diagnostic.status !== 'ready_for_analysis') {
                console.warn('[AI Auto-Fix] Could not get diagnostics, retrying...');
                continue;
            }

            const failureCount = diagnostic.summary.failed;

            if (failureCount === 0) {
                console.log('[AI Auto-Fix] All tests passed!');
                aiAutoFix.logFix('SUCCESS', `All ${diagnostic.summary.total} tests passed after ${aiAutoFix.state.iteration} iterations`, {
                    duration: Date.now() - new Date(aiAutoFix.state.startTime).getTime(),
                    totalFixes: aiAutoFix.state.totalFixed
                });
                break;
            }

            console.log(`[AI Auto-Fix] Found ${failureCount} failures`);

            // Analyze failures
            const analysis = aiAutoFix.analyzeFailures(diagnostic);
            console.log('[AI Auto-Fix] Failure analysis:', analysis);

            // Propose fixes
            const fixes = aiAutoFix.proposeFixes(analysis);
            console.log('[AI Auto-Fix] Proposed fixes:', fixes);

            // Log iteration
            aiAutoFix.logFix('ITERATION', `Iteration ${aiAutoFix.state.iteration}: ${failureCount} failures`, {
                analysis: analysis,
                fixes: fixes
            });

            // AI would apply fixes here, then rebuild and reload
        }

        aiAutoFix.state.isRunning = false;
        console.log('[AI Auto-Fix] Auto-fix cycle complete');
        console.log('[AI Auto-Fix] Fix log:', aiAutoFix.state.fixLog);
    };

    // Wait for tests to complete
    aiAutoFix.waitForTests = function(timeout) {
        return new Promise((resolve) => {
            const start = Date.now();
            const check = () => {
                if (framework.isComplete()) {
                    resolve();
                    return;
                }
                if (Date.now() - start > timeout) {
                    console.warn('[AI Auto-Fix] Test timeout');
                    resolve();
                    return;
                }
                setTimeout(check, 500);
            };
            check();
        });
    };

    // Analyze failures with root cause detection
    aiAutoFix.analyzeFailures = function(diagnostic) {
        const analysis = {
            rootCauses: [],
            patterns: [],
            categories: {},
            severity: 'unknown'
        };

        // Group by section
        diagnostic.rawFailures.forEach(f => {
            const category = f.section || 'Unknown';
            if (!analysis.categories[category]) {
                analysis.categories[category] = { count: 0, failures: [] };
            }
            analysis.categories[category].count++;
            analysis.categories[category].failures.push(f);
        });

        // Detect patterns
        const failureTypes = {};
        diagnostic.rawFailures.forEach(f => {
            const type = aiAutoFix._categorizeFailure(f.detail);
            if (!failureTypes[type]) {
                failureTypes[type] = [];
            }
            failureTypes[type].push(f);
        });

        analysis.patterns = Object.entries(failureTypes).map(([type, failures]) => ({
            type: type,
            count: failures.length,
            failures: failures,
            rootCause: aiAutoFix._getRootCause(type)
        }));

        // Determine severity
        if (diagnostic.errorAnalysis.totalErrors > 5) {
            analysis.severity = 'critical';
        } else if (diagnostic.summary.failed > 10) {
            analysis.severity = 'high';
        } else if (diagnostic.summary.failed > 0) {
            analysis.severity = 'medium';
        } else {
            analysis.severity = 'low';
        }

        // Generate root causes
        analysis.rootCauses = analysis.patterns.map(p => ({
            type: p.type,
            rootCause: p.rootCause,
            affectedTests: p.count,
            fixDirection: aiAutoFix._getFixDirection(p.type)
        }));

        return analysis;
    };

    // Propose specific fixes
    aiAutoFix.proposeFixes = function(analysis) {
        const fixes = [];
        
        analysis.rootCauses.forEach(rootCause => {
            fixes.push({
                rootCause: rootCause.type,
                description: rootCause.rootCause,
                fixDirection: rootCause.fixDirection,
                affectedTests: rootCause.affectedTests,
                priority: analysis.severity === 'critical' ? 'high' : 'medium'
            });
        });

        return fixes;
    };

    // Categorize failure type
    aiAutoFix._categorizeFailure = function(detail) {
        if (!detail) return 'unknown';
        const d = detail.toLowerCase();
        if (d.includes('not found') || d.includes('not defined') || d.includes('missing')) return 'missing_api';
        if (d.includes('expected') && d.includes('got')) return 'wrong_value';
        if (d.includes('type') || d.includes('typeof')) return 'type_mismatch';
        if (d.includes('error') || d.includes('exception')) return 'runtime_error';
        if (d.includes('undefined') || d.includes('null')) return 'null_reference';
        return 'other';
    };

    // Get root cause description
    aiAutoFix._getRootCause = function(type) {
        const causes = {
            'missing_api': 'API not exported or module not included in build',
            'wrong_value': 'Algorithm implementation differs from expected behavior',
            'type_mismatch': 'Return type or parameter type incorrect',
            'runtime_error': 'Code throws exception during execution',
            'null_reference': 'Object not initialized or undefined reference',
            'other': 'Unknown cause, requires manual analysis'
        };
        return causes[type] || causes['other'];
    };

    // Get fix direction
    aiAutoFix._getFixDirection = function(type) {
        const directions = {
            'missing_api': 'Check exports/index.ts and ensure API is publicly exposed',
            'wrong_value': 'Compare implementation with reference, check math operations',
            'type_mismatch': 'Verify type signatures and return types',
            'runtime_error': 'Check stack trace, add null guards, fix logic errors',
            'null_reference': 'Initialize objects, add existence checks',
            'other': 'Manual investigation required'
        };
        return directions[type] || directions['other'];
    };

    // Log fix attempt
    aiAutoFix.logFix = function(type, message, details) {
        const entry = {
            timestamp: new Date().toISOString(),
            iteration: aiAutoFix.state.iteration,
            type: type,
            message: message,
            details: details
        };
        aiAutoFix.state.fixLog.push(entry);
        console.log(`[AI Auto-Fix] [${entry.type}] ${message}`);
    };

    // Get complete fix log
    aiAutoFix.getFixLog = function() {
        return aiAutoFix.state.fixLog;
    };

    // Get summary
    aiAutoFix.getSummary = function() {
        return {
            iterations: aiAutoFix.state.iteration,
            totalFixed: aiAutoFix.state.totalFixed,
            fixLogLength: aiAutoFix.state.fixLog.length,
            isRunning: aiAutoFix.state.isRunning,
            startTime: aiAutoFix.state.startTime,
            currentTestPage: aiAutoFix.state.currentTestPage
        };
    };

    console.log('[AI Auto-Fix] Initialized v' + aiAutoFix.version);
    console.log('[AI Auto-Fix] Use window.AI_AUTO_FIX.getDiagnosticReport() for full analysis');
    console.log('[AI Auto-Fix] Use window.AI_AUTO_FIX.getFailureSummary() for quick overview');
    console.log('[AI Auto-Fix] Use window.AI_AUTO_FIX.startFixCycle() to start auto-fix');

})();
