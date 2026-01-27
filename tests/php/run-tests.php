<?php
/**
 * ASDF API - Test Runner
 *
 * Runs all PHP unit tests.
 * Usage: php tests/php/run-tests.php
 */

declare(strict_types=1);

echo "╔════════════════════════════════════════╗\n";
echo "║       ASDF API - PHP Test Suite        ║\n";
echo "╚════════════════════════════════════════╝\n\n";

$testDir = __DIR__;
$tests = [
    'ContainerTest.php',
    'ServicesTest.php',
];

$totalPassed = 0;
$totalFailed = 0;

foreach ($tests as $test) {
    $file = $testDir . '/' . $test;
    if (!file_exists($file)) {
        echo "⚠ Skipping {$test} (not found)\n";
        continue;
    }

    echo "Running {$test}...\n";
    echo str_repeat('─', 40) . "\n";

    // Run test in subprocess to isolate state
    $output = [];
    $exitCode = 0;
    exec('php ' . escapeshellarg($file) . ' 2>&1', $output, $exitCode);

    echo implode("\n", $output) . "\n\n";

    // Parse results from output
    foreach ($output as $line) {
        if (preg_match('/Passed: (\d+)\/(\d+)/', $line, $matches)) {
            $totalPassed += (int) $matches[1];
        }
        if (preg_match('/Failed: (\d+)\/(\d+)/', $line, $matches)) {
            $totalFailed += (int) $matches[1];
        }
    }
}

echo "╔════════════════════════════════════════╗\n";
echo "║           FINAL RESULTS                ║\n";
echo "╠════════════════════════════════════════╣\n";
printf("║  Total Passed: %-23d║\n", $totalPassed);
printf("║  Total Failed: %-23d║\n", $totalFailed);
echo "╚════════════════════════════════════════╝\n";

exit($totalFailed > 0 ? 1 : 0);
