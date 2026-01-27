<?php
/**
 * ASDF Games - Leaderboard Service
 *
 * Provides leaderboard data for SSR and API endpoints.
 * Fetches data from the backend API or returns cached/mock data.
 */

declare(strict_types=1);

namespace ASDF\Api\Services;

class LeaderboardService
{
    private ConfigService $config;
    private GameService $games;

    /** @var array<string, array{data: array, expires: int}> */
    private array $cache = [];

    private const CACHE_TTL = 60; // 1 minute

    public function __construct(ConfigService $config, GameService $games)
    {
        $this->config = $config;
        $this->games = $games;
    }

    /**
     * Get weekly leaderboard for a game
     *
     * @param string $gameId Game identifier
     * @param int $limit Max entries to return
     * @return array{leaderboard: array, game: string, period: string}
     */
    public function getWeekly(string $gameId, int $limit = 10): array
    {
        if (!$this->games->isValid($gameId)) {
            return ['leaderboard' => [], 'game' => $gameId, 'period' => 'weekly', 'error' => 'Invalid game'];
        }

        $cacheKey = "weekly_{$gameId}_{$limit}";

        // Check cache
        if ($this->isCached($cacheKey)) {
            return $this->cache[$cacheKey]['data'];
        }

        // Fetch from API
        $data = $this->fetchFromApi("/leaderboard/weekly/{$gameId}?limit={$limit}");

        if ($data === null) {
            // Return mock data for SSR fallback
            $data = [
                'leaderboard' => $this->getMockLeaderboard($limit),
                'game' => $gameId,
                'period' => 'weekly',
            ];
        }

        $this->setCache($cacheKey, $data);
        return $data;
    }

    /**
     * Get cycle leaderboard (total slots earned)
     *
     * @param int $limit Max entries to return
     * @return array{leaderboard: array, period: string}
     */
    public function getCycle(int $limit = 10): array
    {
        $cacheKey = "cycle_{$limit}";

        if ($this->isCached($cacheKey)) {
            return $this->cache[$cacheKey]['data'];
        }

        $data = $this->fetchFromApi("/leaderboard/cycle?limit={$limit}");

        if ($data === null) {
            $data = [
                'leaderboard' => $this->getMockCycleLeaderboard($limit),
                'period' => 'cycle',
            ];
        }

        $this->setCache($cacheKey, $data);
        return $data;
    }

    /**
     * Fetch data from backend API
     */
    private function fetchFromApi(string $endpoint): ?array
    {
        $url = $this->config->get('API_BASE') . $endpoint;

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 5,
                'header' => "Accept: application/json\r\n",
            ],
        ]);

        try {
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                return null;
            }
            return json_decode($response, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Check if cache entry is valid
     */
    private function isCached(string $key): bool
    {
        return isset($this->cache[$key]) && $this->cache[$key]['expires'] > time();
    }

    /**
     * Set cache entry
     */
    private function setCache(string $key, array $data): void
    {
        $this->cache[$key] = [
            'data' => $data,
            'expires' => time() + self::CACHE_TTL,
        ];
    }

    /**
     * Generate mock leaderboard for SSR fallback
     */
    private function getMockLeaderboard(int $limit): array
    {
        $entries = [];
        for ($i = 1; $i <= min($limit, 10); $i++) {
            $entries[] = [
                'rank' => $i,
                'player' => $this->generateMockAddress(),
                'score' => max(0, 10000 - ($i * 1000) + random_int(0, 500)),
            ];
        }
        return $entries;
    }

    /**
     * Generate mock cycle leaderboard
     */
    private function getMockCycleLeaderboard(int $limit): array
    {
        $entries = [];
        $rewardSlots = $this->games->getRewardSlots();

        for ($i = 1; $i <= min($limit, 10); $i++) {
            $entries[] = [
                'rank' => $i,
                'player' => $this->generateMockAddress(),
                'slots' => ($rewardSlots[$i] ?? 0) * random_int(1, 5),
            ];
        }
        return $entries;
    }

    /**
     * Generate mock wallet address (truncated)
     */
    private function generateMockAddress(): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
        $addr = '';
        for ($i = 0; $i < 8; $i++) {
            $addr .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $addr . '...';
    }

    /**
     * Render leaderboard as HTML (for SSR)
     */
    public function renderHtml(array $leaderboard, string $type = 'weekly'): string
    {
        if (empty($leaderboard)) {
            return '<div class="leaderboard-empty">No scores yet</div>';
        }

        $html = '';
        foreach ($leaderboard as $entry) {
            $rank = (int) ($entry['rank'] ?? 0);
            $player = htmlspecialchars($entry['player'] ?? '', ENT_QUOTES, 'UTF-8');
            $value = $type === 'cycle'
                ? ((int) ($entry['slots'] ?? 0)) . ' slots'
                : number_format((int) ($entry['score'] ?? 0));

            $rankClass = match ($rank) {
                1 => 'gold',
                2 => 'silver',
                3 => 'bronze',
                default => '',
            };

            $html .= <<<HTML
            <div class="leaderboard-item">
                <div class="leaderboard-rank {$rankClass}">{$rank}</div>
                <div class="leaderboard-player">{$player}</div>
                <div class="leaderboard-score">{$value}</div>
            </div>
            HTML;
        }

        return $html;
    }
}
