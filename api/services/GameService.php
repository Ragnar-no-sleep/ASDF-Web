<?php
/**
 * ASDF Games - Game Service
 *
 * Provides game definitions and rotation logic.
 * Mirrors the JavaScript GAMES array and rotation functions.
 */

declare(strict_types=1);

namespace ASDF\Api\Services;

class GameService
{
    private ConfigService $config;
    private array $games;

    public function __construct(ConfigService $config)
    {
        $this->config = $config;
        $this->games = $this->defineGames();
    }

    /**
     * Define all available games
     * Must match JavaScript GAMES array exactly
     */
    private function defineGames(): array
    {
        return [
            [
                'id' => 'tokencatcher',
                'name' => 'Token Catcher',
                'icon' => '🪙',
                'type' => 'Arcade',
                'description' => 'Catch falling tokens, avoid scam coins!',
            ],
            [
                'id' => 'burnrunner',
                'name' => 'Burn Runner',
                'icon' => '🔥',
                'type' => 'Endless Runner',
                'description' => 'Run through the burn, collect what remains.',
            ],
            [
                'id' => 'scamblaster',
                'name' => 'Scam Blaster',
                'icon' => '🎯',
                'type' => 'Shooter',
                'description' => 'Blast the scams, protect the community.',
            ],
            [
                'id' => 'cryptoheist',
                'name' => 'Crypto Heist',
                'icon' => '💎',
                'type' => 'Stealth',
                'description' => 'Infiltrate the exchange, secure the bags.',
            ],
            [
                'id' => 'whalewatch',
                'name' => 'Whale Watch',
                'icon' => '🐋',
                'type' => 'Strategy',
                'description' => 'Track the whales, predict the moves.',
            ],
            [
                'id' => 'stakestacker',
                'name' => 'Stake Stacker',
                'icon' => '📊',
                'type' => 'Puzzle',
                'description' => 'Stack your stakes, maximize returns.',
            ],
            [
                'id' => 'dexdash',
                'name' => 'DEX Dash',
                'icon' => '💹',
                'type' => 'Racing',
                'description' => 'Race across DEXes, find the best routes.',
            ],
            [
                'id' => 'burnorhold',
                'name' => 'Burn or HODL',
                'icon' => '🎰',
                'type' => 'Decision',
                'description' => 'Quick decisions: burn it or hold it?',
            ],
            [
                'id' => 'liquiditymaze',
                'name' => 'Liquidity Maze',
                'icon' => '🌊',
                'type' => 'Maze',
                'description' => 'Navigate pools, avoid impermanent loss.',
            ],
        ];
    }

    /**
     * Get all games
     */
    public function all(): array
    {
        return $this->games;
    }

    /**
     * Get a game by ID
     */
    public function find(string $id): ?array
    {
        foreach ($this->games as $game) {
            if ($game['id'] === $id) {
                return $game;
            }
        }
        return null;
    }

    /**
     * Get valid game IDs
     */
    public function validIds(): array
    {
        return array_column($this->games, 'id');
    }

    /**
     * Check if game ID is valid
     */
    public function isValid(string $id): bool
    {
        return in_array($id, $this->validIds(), true);
    }

    /**
     * Get current week index in rotation cycle
     */
    public function getCurrentWeekIndex(): int
    {
        $epoch = new \DateTimeImmutable($this->config->get('ROTATION_EPOCH'));
        $now = new \DateTimeImmutable();
        $weekMs = 7 * 24 * 60 * 60;

        $diff = $now->getTimestamp() - $epoch->getTimestamp();
        $weeksSinceEpoch = (int) floor($diff / $weekMs);

        return $weeksSinceEpoch % $this->config->get('CYCLE_WEEKS');
    }

    /**
     * Get current featured game
     */
    public function getCurrentGame(): array
    {
        return $this->games[$this->getCurrentWeekIndex()];
    }

    /**
     * Get next rotation time (next Monday 00:00 UTC)
     */
    public function getNextRotationTime(): \DateTimeImmutable
    {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $dayOfWeek = (int) $now->format('w'); // 0 = Sunday

        $daysUntilMonday = $dayOfWeek === 0 ? 1 : (8 - $dayOfWeek);

        return $now
            ->modify("+{$daysUntilMonday} days")
            ->setTime(0, 0, 0);
    }

    /**
     * Get reward slots mapping
     */
    public function getRewardSlots(): array
    {
        return [
            1 => 5,
            2 => 2,
            3 => 1,
        ];
    }

    /**
     * Get games as JSON for JavaScript hydration
     */
    public function toJson(): string
    {
        return json_encode($this->games, JSON_THROW_ON_ERROR);
    }
}
