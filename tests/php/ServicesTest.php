<?php
/**
 * ASDF API - Services Unit Tests
 *
 * Tests for ConfigService, GameService, LeaderboardService.
 * Run with: php tests/php/ServicesTest.php
 */

declare(strict_types=1);

// Mock HTTP context
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_METHOD'] = 'GET';

require_once __DIR__ . '/../../api/bootstrap.php';

class ServicesTest
{
    private int $passed = 0;
    private int $failed = 0;
    private array $errors = [];

    public function run(): void
    {
        echo "=== Services Unit Tests ===\n\n";

        $this->testConfigService();
        $this->testGameService();
        $this->testLeaderboardService();
        $this->testBootstrapHelpers();

        $this->printSummary();
    }

    private function assert(bool $condition, string $message): void
    {
        if ($condition) {
            echo "  ✓ {$message}\n";
            $this->passed++;
        } else {
            echo "  ✗ {$message}\n";
            $this->failed++;
            $this->errors[] = $message;
        }
    }

    private function testConfigService(): void
    {
        echo "1. ConfigService\n";

        $config = service('config');

        $this->assert(
            $config->get('ENV') === 'development',
            'Should detect development environment on localhost'
        );

        $this->assert(
            $config->isDev() === true,
            'isDev() should return true on localhost'
        );

        $this->assert(
            str_starts_with($config->get('API_BASE'), 'http://localhost'),
            'API_BASE should be localhost in dev'
        );

        $this->assert(
            $config->get('TOKEN_DECIMALS') === 6,
            'TOKEN_DECIMALS should be 6 (Solana SPL standard)'
        );

        $this->assert(
            strlen($config->get('ASDF_TOKEN_MINT')) === 44,
            'ASDF_TOKEN_MINT should be valid Solana address length'
        );

        $json = $config->toJson();
        $this->assert(
            json_decode($json) !== null,
            'toJson() should return valid JSON'
        );

        $this->assert(
            $config->get('nonexistent', 'default') === 'default',
            'get() should return default for missing keys'
        );
    }

    private function testGameService(): void
    {
        echo "\n2. GameService\n";

        $games = service('games');

        $all = $games->all();
        $this->assert(
            count($all) === 9,
            'Should have 9 games defined'
        );

        $this->assert(
            $games->isValid('tokencatcher') === true,
            'tokencatcher should be a valid game ID'
        );

        $this->assert(
            $games->isValid('invalidgame') === false,
            'invalidgame should not be valid'
        );

        $tokenCatcher = $games->find('tokencatcher');
        $this->assert(
            $tokenCatcher !== null && $tokenCatcher['name'] === 'Token Catcher',
            'find() should return Token Catcher game'
        );

        $this->assert(
            $games->find('nonexistent') === null,
            'find() should return null for unknown game'
        );

        $validIds = $games->validIds();
        $this->assert(
            count($validIds) === 9,
            'validIds() should return 9 IDs'
        );

        $this->assert(
            in_array('burnrunner', $validIds),
            'validIds() should include burnrunner'
        );

        $weekIndex = $games->getCurrentWeekIndex();
        $this->assert(
            $weekIndex >= 0 && $weekIndex < 9,
            'getCurrentWeekIndex() should be 0-8'
        );

        $current = $games->getCurrentGame();
        $this->assert(
            isset($current['id']) && isset($current['name']),
            'getCurrentGame() should return game with id and name'
        );

        $nextRotation = $games->getNextRotationTime();
        $this->assert(
            $nextRotation > new DateTimeImmutable(),
            'getNextRotationTime() should be in the future'
        );

        $this->assert(
            (int) $nextRotation->format('w') === 1, // Monday
            'Next rotation should be on Monday'
        );

        $slots = $games->getRewardSlots();
        $this->assert(
            $slots[1] === 5 && $slots[2] === 2 && $slots[3] === 1,
            'getRewardSlots() should return correct values'
        );

        $json = $games->toJson();
        $decoded = json_decode($json, true);
        $this->assert(
            is_array($decoded) && count($decoded) === 9,
            'toJson() should return valid JSON array with 9 games'
        );
    }

    private function testLeaderboardService(): void
    {
        echo "\n3. LeaderboardService\n";

        $leaderboard = service('leaderboard');

        // Test weekly leaderboard (mock data since no API)
        $weekly = $leaderboard->getWeekly('tokencatcher', 5);
        $this->assert(
            isset($weekly['leaderboard']) && isset($weekly['game']),
            'getWeekly() should return leaderboard and game'
        );

        $this->assert(
            count($weekly['leaderboard']) <= 5,
            'getWeekly() should respect limit'
        );

        $this->assert(
            $weekly['game'] === 'tokencatcher',
            'getWeekly() should return correct game ID'
        );

        // Test invalid game
        $invalid = $leaderboard->getWeekly('invalidgame', 5);
        $this->assert(
            isset($invalid['error']),
            'getWeekly() should return error for invalid game'
        );

        // Test cycle leaderboard
        $cycle = $leaderboard->getCycle(5);
        $this->assert(
            isset($cycle['leaderboard']) && $cycle['period'] === 'cycle',
            'getCycle() should return leaderboard with period=cycle'
        );

        // Test HTML rendering
        $html = $leaderboard->renderHtml($weekly['leaderboard'], 'weekly');
        $this->assert(
            str_contains($html, 'leaderboard-item') || str_contains($html, 'leaderboard-empty'),
            'renderHtml() should return valid HTML'
        );

        // Test empty leaderboard
        $emptyHtml = $leaderboard->renderHtml([], 'weekly');
        $this->assert(
            str_contains($emptyHtml, 'leaderboard-empty'),
            'renderHtml() should handle empty array'
        );
    }

    private function testBootstrapHelpers(): void
    {
        echo "\n4. Bootstrap helpers\n";

        // Test service() helper
        $config1 = service('config');
        $config2 = service('config');
        $this->assert(
            $config1 === $config2,
            'service() should return same instance (singleton)'
        );

        // Test getContainer()
        $container = getContainer();
        $this->assert(
            $container->has('config') && $container->has('games') && $container->has('leaderboard'),
            'Container should have all core services'
        );

        // Test generateHydrationScript()
        $hydration = generateHydrationScript();
        $this->assert(
            str_contains($hydration, 'window.__ASDF_SSR__'),
            'Hydration script should set window.__ASDF_SSR__'
        );

        $this->assert(
            str_contains($hydration, 'CONFIG') && str_contains($hydration, 'GAMES'),
            'Hydration script should include CONFIG and GAMES'
        );

        // Verify JSON is valid within script
        preg_match('/window\.__ASDF_SSR__ = (.+);/', $hydration, $matches);
        if (isset($matches[1])) {
            $decoded = json_decode($matches[1], true);
            $this->assert(
                $decoded !== null,
                'Hydration JSON should be valid'
            );

            $this->assert(
                isset($decoded['CONFIG']) && isset($decoded['GAMES']) && isset($decoded['currentGame']),
                'Hydration data should have CONFIG, GAMES, and currentGame'
            );
        } else {
            $this->assert(false, 'Could not extract JSON from hydration script');
        }
    }

    private function printSummary(): void
    {
        $total = $this->passed + $this->failed;
        echo "\n=== Summary ===\n";
        echo "Passed: {$this->passed}/{$total}\n";
        echo "Failed: {$this->failed}/{$total}\n";

        if ($this->failed > 0) {
            echo "\nFailed tests:\n";
            foreach ($this->errors as $error) {
                echo "  - {$error}\n";
            }
            exit(1);
        }
        exit(0);
    }
}

// Run tests
$test = new ServicesTest();
$test->run();
