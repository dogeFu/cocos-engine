// AI Test Framework v3.0.0 - Auto outputs all errors to console on test complete

(function() {
    'use strict';

    var framework = window.AI_TEST_FRAMEWORK || {
        version: '3.0.0',
        status: 'initializing',
        results: { tests: [], sections: [], failures: [], summary: { total: 0, passed: 0, failed: 0, skipped: 0 } },
        logs: [],
        errors: []
    };
    window.AI_TEST_FRAMEWORK = framework;

    var results = framework.results;
    var origError = console.error;

    window.addEventListener('error', function(event) {
        framework.errors.push({ type: 'uncaught', message: event.message, stack: event.error ? event.error.stack : null });
    });

    window.addEventListener('unhandledrejection', function(event) {
        framework.errors.push({ type: 'promise.rejection', reason: String(event.reason) });
    });

    framework.recordTest = function(sectionName, testName, status, detail) {
        var test = { section: sectionName, name: testName, status: status, detail: detail || '', timestamp: new Date().toISOString() };
        results.tests.push(test);
        results.summary.total++;
        if (status === 'pass') { results.summary.passed++; }
        else if (status === 'fail') { results.summary.failed++; results.failures.push(test); }
        else { results.summary.skipped++; }
    };

    framework.startSection = function(name) {
        results.sections.push({ name: name, startTime: new Date().toISOString() });
    };

    framework.finishSection = function() {
        if (results.sections.length > 0) {
            results.sections[results.sections.length - 1].endTime = new Date().toISOString();
        }
    };

    framework.getCurrentSection = function() {
        return results.sections.length > 0 ? results.sections[results.sections.length - 1] : null;
    };

    framework.log = function(message, type) {
        framework.logs.push({ message: message, type: type || 'info', timestamp: new Date().toISOString() });
    };

    framework.getSummary = function() { return results.summary; };
    framework.isComplete = function() { return framework.status === 'complete'; };

    framework.markComplete = function() {
        framework.status = 'complete';

        if (results.summary.failed > 0 || framework.errors.length > 0) {
            var output = '';

            if (results.summary.failed > 0) {
                output += '\n[TEST FAILED] Total: ' + results.summary.total + ', Passed: ' + results.summary.passed + ', Failed: ' + results.summary.failed + '\n';

                var sections = {};
                for (var i = 0; i < results.failures.length; i++) {
                    var f = results.failures[i];
                    var sec = f.section || 'Unknown';
                    if (!sections[sec]) sections[sec] = [];
                    sections[sec].push(f);
                }

                for (var secName in sections) {
                    output += '[' + secName + ']\n';
                    var secFailures = sections[secName];
                    for (var j = 0; j < secFailures.length; j++) {
                        var detail = secFailures[j].detail ? ' - ' + secFailures[j].detail : '';
                        output += '  FAIL: ' + secFailures[j].name + detail + '\n';
                    }
                }
            }

            if (framework.errors.length > 0) {
                output += '\n[ERRORS]\n';
                for (var k = 0; k < framework.errors.length; k++) {
                    output += '  ' + framework.errors[k].message + '\n';
                }
            }

            origError(output);
        }
    };

})();

