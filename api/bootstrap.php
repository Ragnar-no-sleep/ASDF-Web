<?php
/**
 * ASDF Games - PHP Bootstrap (Composition Root)
 *
 * This is the single entry point that wires all dependencies.
 * Include this file to get a configured container ready for use.
 *
 * Usage:
 *   require_once __DIR__ . '/api/bootstrap.php';
 *   $container = getContainer();
 *   $config = $container->get('config');
 */

declare(strict_types=1);

// Autoload (simple PSR-4 style)
spl_autoload_register(function (string $class) {
    $prefix = 'ASDF\\Api\\';
    $baseDir = __DIR__ . '/';

    if (strpos($class, $prefix) !== 0) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

use ASDF\Api\Container;
use ASDF\Api\Services\ConfigService;
use ASDF\Api\Services\GameService;
use ASDF\Api\Services\LeaderboardService;

/**
 * Create and configure the service container
 */
function createContainer(): Container
{
    $container = new Container();

    // ============================================
    // Core Services
    // ============================================

    $container->set('config', fn() => new ConfigService());

    $container->set('games', fn(Container $c) =>
        new GameService($c->get('config'))
    );

    $container->set('leaderboard', fn(Container $c) =>
        new LeaderboardService(
            $c->get('config'),
            $c->get('games')
        )
    );

    // ============================================
    // Constants (mirroring JS)
    // ============================================

    $container->set('rewardSlots', fn(Container $c) =>
        $c->get('games')->getRewardSlots()
    );

    $container->set('validGameIds', fn(Container $c) =>
        $c->get('games')->validIds()
    );

    return $container;
}

/**
 * Get the singleton container instance
 */
function getContainer(): Container
{
    static $container = null;

    if ($container === null) {
        $container = createContainer();
    }

    return $container;
}

/**
 * Helper to get a service directly
 */
function service(string $id): mixed
{
    return getContainer()->get($id);
}

/**
 * Generate hydration script for JavaScript
 * Injects server-side data for client-side hydration
 */
function generateHydrationScript(): string
{
    $container = getContainer();
    $config = $container->get('config');
    $games = $container->get('games');

    $data = [
        'CONFIG' => $config->all(),
        'GAMES' => $games->all(),
        'REWARD_SLOTS' => $games->getRewardSlots(),
        'currentGame' => $games->getCurrentGame(),
        'nextRotation' => $games->getNextRotationTime()->format('c'),
    ];

    $json = json_encode($data, JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP);

    return <<<HTML
    <script>
    // Server-side hydration data
    window.__ASDF_SSR__ = {$json};

    // Hydrate globals before other scripts load
    if (window.__ASDF_SSR__) {
        window.CONFIG = window.__ASDF_SSR__.CONFIG;
        window.GAMES = window.__ASDF_SSR__.GAMES;
        window.REWARD_SLOTS = window.__ASDF_SSR__.REWARD_SLOTS;
    }
    </script>
    HTML;
}

/**
 * Set security headers for API responses
 */
function setApiHeaders(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Cache-Control: no-store, max-age=0');
}

/**
 * Set security headers for HTML responses
 */
function setHtmlHeaders(): void
{
    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-XSS-Protection: 1; mode=block');
}

/**
 * Send JSON response
 */
function jsonResponse(mixed $data, int $status = 200): never
{
    setApiHeaders();
    http_response_code($status);
    echo json_encode($data, JSON_THROW_ON_ERROR);
    exit;
}

/**
 * Send error response
 */
function errorResponse(string $message, int $status = 400): never
{
    jsonResponse(['error' => $message], $status);
}
