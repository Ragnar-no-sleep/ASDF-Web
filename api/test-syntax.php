<?php
/**
 * ASDF API - Syntax and Logic Test
 *
 * Run with: php api/test-syntax.php
 * Tests that all PHP files are valid without starting a server.
 */

declare(strict_types=1);

echo "=== ASDF API Syntax Test ===\n\n";

$errors = [];
$files = [
    __DIR__ . '/Container.php',
    __DIR__ . '/bootstrap.php',
    __DIR__ . '/Services/ConfigService.php',
    __DIR__ . '/Services/GameService.php',
    __DIR__ . '/Services/LeaderboardService.php',
    __DIR__ . '/Controllers/LeaderboardController.php',
    __DIR__ . '/leaderboard.php',
];

// Test 1: Syntax check
echo "1. Checking syntax...\n";
foreach ($files as $file) {
    $basename = basename($file);
    if (!file_exists($file)) {
        $errors[] = "  [MISSING] $basename";
        continue;
    }

    // Check PHP syntax
    $output = [];
    $returnVar = 0;
    exec("php -l " . escapeshellarg($file) . " 2>&1", $output, $returnVar);

    if ($returnVar !== 0) {
        $errors[] = "  [SYNTAX ERROR] $basename: " . implode("\n", $output);
    } else {
        echo "  [OK] $basename\n";
    }
}

// Test 2: Try to load bootstrap (without HTTP context)
echo "\n2. Testing bootstrap load...\n";
try {
    // Mock HTTP context
    $_SERVER['HTTP_HOST'] = 'localhost';
    $_SERVER['REQUEST_METHOD'] = 'GET';

    require_once __DIR__ . '/bootstrap.php';

    $container = getContainer();
    echo "  [OK] Container created\n";
    echo "  [OK] Services registered: " . count($container->keys()) . "\n";

} catch (Throwable $e) {
    $errors[] = "  [BOOTSTRAP ERROR] " . $e->getMessage();
}

// Test 3: Test services
echo "\n3. Testing services...\n";
try {
    $config = service('config');
    echo "  [OK] ConfigService loaded\n";
    echo "      ENV: " . $config->get('ENV') . "\n";
    echo "      API_BASE: " . $config->get('API_BASE') . "\n";

    $games = service('games');
    echo "  [OK] GameService loaded\n";
    echo "      Games count: " . count($games->all()) . "\n";
    echo "      Current game: " . $games->getCurrentGame()['name'] . "\n";
    echo "      Week index: " . $games->getCurrentWeekIndex() . "\n";

    $leaderboard = service('leaderboard');
    echo "  [OK] LeaderboardService loaded\n";

} catch (Throwable $e) {
    $errors[] = "  [SERVICE ERROR] " . $e->getMessage();
}

// Test 4: Test API response generation
echo "\n4. Testing API response format...\n";
try {
    $weekly = $leaderboard->getWeekly('tokencatcher', 5);
    echo "  [OK] Weekly leaderboard generated\n";
    echo "      Entries: " . count($weekly['leaderboard'] ?? []) . "\n";

    $cycle = $leaderboard->getCycle(5);
    echo "  [OK] Cycle leaderboard generated\n";
    echo "      Entries: " . count($cycle['leaderboard'] ?? []) . "\n";

} catch (Throwable $e) {
    $errors[] = "  [API ERROR] " . $e->getMessage();
}

// Test 5: Test hydration script
echo "\n5. Testing SSR hydration...\n";
try {
    $hydration = generateHydrationScript();
    if (str_contains($hydration, 'window.__ASDF_SSR__')) {
        echo "  [OK] Hydration script generated\n";
        echo "      Length: " . strlen($hydration) . " bytes\n";
    } else {
        $errors[] = "  [HYDRATION ERROR] Invalid script format";
    }
} catch (Throwable $e) {
    $errors[] = "  [HYDRATION ERROR] " . $e->getMessage();
}

// Summary
echo "\n=== Summary ===\n";
if (empty($errors)) {
    echo "All tests passed! ✓\n";
    exit(0);
} else {
    echo "Errors found:\n";
    foreach ($errors as $error) {
        echo $error . "\n";
    }
    exit(1);
}
