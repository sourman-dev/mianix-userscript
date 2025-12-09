/**
 * Phase 04: Global Worldbooks Implementation - Test Runner
 * Executes all test suites for global worldbook functionality
 */

import crudTests from './worldbook-crud.test';
import linkingTests from './worldbook-linking.test';
import mergeTests from './worldbook-merge.test';
import retrievalTests from './worldbook-retrieval.test';
import uiTests from './ui-components.test';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

class TestRunner {
  private allResults: TestResult[] = [];
  private testSuites = [
    { name: 'CRUD Operations', runner: crudTests },
    { name: 'Character Linking', runner: linkingTests },
    { name: 'Worldbook Merge Logic', runner: mergeTests },
    { name: 'Hybrid Retrieval', runner: retrievalTests },
    { name: 'UI Components', runner: uiTests },
  ];

  async run() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Phase 04: Global Worldbooks Implementation - Full Test Suite  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    const startTime = Date.now();

    for (const suite of this.testSuites) {
      const results = suite.runner.run();
      this.allResults.push(...results);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    this.printSummary(duration);
    return this.generateReport();
  }

  private printSummary(duration: string) {
    const totalTests = this.allResults.length;
    const passedTests = this.allResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const passPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                            ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Total Tests:       ${String(totalTests).padEnd(50)}║`);
    console.log(`║ Passed:            ${String(`${passedTests} ✓`).padEnd(50)}║`);
    console.log(`║ Failed:            ${String(`${failedTests} ✗`).padEnd(50)}║`);
    console.log(`║ Success Rate:      ${String(`${passPercentage}%`).padEnd(50)}║`);
    console.log(`║ Execution Time:    ${String(`${duration}s`).padEnd(50)}║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');

    console.log('\n');

    // Print detailed results
    console.log('DETAILED RESULTS:');
    console.log('─────────────────────────────────────────────────────────────────');

    let currentSuite = '';
    for (const result of this.allResults) {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${statusColor}${status}${reset} ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`      Error: ${result.error}`);
      }
    }

    console.log('─────────────────────────────────────────────────────────────────\n');
  }

  private generateReport(): {
    totalTests: number;
    passed: number;
    failed: number;
    passPercentage: string;
    results: TestResult[];
    status: 'PASSED' | 'FAILED';
  } {
    const totalTests = this.allResults.length;
    const passedTests = this.allResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const passPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';

    return {
      totalTests,
      passed: passedTests,
      failed: failedTests,
      passPercentage,
      results: this.allResults,
      status: failedTests === 0 ? 'PASSED' : 'FAILED',
    };
  }
}

// Run tests
const runner = new TestRunner();
runner.run().then(report => {
  console.log('\n');
  console.log(`Final Status: ${report.status}`);
  console.log(`Coverage: ${report.passPercentage}% (${report.passed}/${report.totalTests})`);

  // Exit with appropriate code
  if (report.failed > 0) {
    console.log(`\nWarning: ${report.failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
    process.exit(0);
  }
});

export default runner;
