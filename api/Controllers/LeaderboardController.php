<?php
/**
 * ASDF Games - Leaderboard API Controller
 *
 * Handles leaderboard API requests.
 * Mirrors JavaScript ApiClient endpoints.
 */

declare(strict_types=1);

namespace ASDF\Api\Controllers;

use ASDF\Api\Services\LeaderboardService;
use ASDF\Api\Services\GameService;

class LeaderboardController
{
    private LeaderboardService $leaderboard;
    private GameService $games;

    public function __construct(LeaderboardService $leaderboard, GameService $games)
    {
        $this->leaderboard = $leaderboard;
        $this->games = $games;
    }

    /**
     * GET /api/leaderboard/weekly/{gameId}
     */
    public function weekly(string $gameId): array
    {
        $limit = min((int) ($_GET['limit'] ?? 10), 100);

        if (!$this->games->isValid($gameId)) {
            return [
                'error' => 'Invalid game ID',
                'validGames' => $this->games->validIds(),
            ];
        }

        return $this->leaderboard->getWeekly($gameId, $limit);
    }

    /**
     * GET /api/leaderboard/cycle
     */
    public function cycle(): array
    {
        $limit = min((int) ($_GET['limit'] ?? 10), 100);
        return $this->leaderboard->getCycle($limit);
    }

    /**
     * GET /api/leaderboard/current
     * Get leaderboard for current featured game
     */
    public function current(): array
    {
        $currentGame = $this->games->getCurrentGame();
        $limit = min((int) ($_GET['limit'] ?? 10), 100);

        return [
            'game' => $currentGame,
            'nextRotation' => $this->games->getNextRotationTime()->format('c'),
            'leaderboard' => $this->leaderboard->getWeekly($currentGame['id'], $limit)['leaderboard'],
        ];
    }
}
