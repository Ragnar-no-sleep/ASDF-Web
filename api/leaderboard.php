<?php
/**
 * ASDF Games - Leaderboard API Endpoint
 *
 * Routes:
 *   GET /api/leaderboard.php?action=weekly&game={gameId}&limit={n}
 *   GET /api/leaderboard.php?action=cycle&limit={n}
 *   GET /api/leaderboard.php?action=current&limit={n}
 *
 * Example:
 *   /api/leaderboard.php?action=weekly&game=tokencatcher&limit=10
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

use ASDF\Api\Controllers\LeaderboardController;

// CORS headers for API
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only GET allowed
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

// Get container and controller
$container = getContainer();
$controller = new LeaderboardController(
    $container->get('leaderboard'),
    $container->get('games')
);

// Route action
$action = $_GET['action'] ?? 'current';

try {
    $response = match ($action) {
        'weekly' => $controller->weekly($_GET['game'] ?? ''),
        'cycle' => $controller->cycle(),
        'current' => $controller->current(),
        default => ['error' => 'Unknown action', 'validActions' => ['weekly', 'cycle', 'current']],
    };

    $status = isset($response['error']) ? 400 : 200;
    jsonResponse($response, $status);

} catch (Throwable $e) {
    // Log error in dev mode
    if (service('config')->isDev()) {
        error_log($e->getMessage());
    }
    errorResponse('Internal server error', 500);
}
