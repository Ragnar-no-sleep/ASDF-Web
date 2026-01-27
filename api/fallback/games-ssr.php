<?php
/**
 * ASDF Games - SSR Entry Point
 *
 * Server-side renders the games landing page with:
 * - Initial leaderboard data
 * - Featured game info
 * - Hydration script for JavaScript
 *
 * Can be used as:
 * - games.php (rename and use directly)
 * - Include from games.html via PHP include
 * - Nginx/Apache rewrite from /games to this file
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

setHtmlHeaders();

// Get services
$container = getContainer();
$config = $container->get('config');
$games = $container->get('games');
$leaderboard = $container->get('leaderboard');

// Fetch data for SSR
$currentGame = $games->getCurrentGame();
$nextRotation = $games->getNextRotationTime();
$weeklyLeaderboard = $leaderboard->getWeekly($currentGame['id'], 10);
$cycleLeaderboard = $leaderboard->getCycle(10);

// Calculate countdown
$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$diff = $nextRotation->getTimestamp() - $now->getTimestamp();
$days = floor($diff / 86400);
$hours = floor(($diff % 86400) / 3600);
$mins = floor(($diff % 3600) / 60);
$secs = $diff % 60;

// Render leaderboards HTML
$weeklyHtml = $leaderboard->renderHtml($weeklyLeaderboard['leaderboard'] ?? [], 'weekly');
$cycleHtml = $leaderboard->renderHtml($cycleLeaderboard['leaderboard'] ?? [], 'cycle');

?>
<!DOCTYPE html>
<html lang="en" style="background:#020812">
<head>
    <style>html{background:#020812!important}body{background:transparent!important}</style>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game of the Week | ASDF Ecosystem</title>
    <meta name="description" content="Play weekly games and compete for top scores. Token-gated gaming for $asdfasdfa holders.">
    <link rel="canonical" href="https://alonisthe.dev/games">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://alonisthe.dev/games">
    <meta property="og:title" content="ASDF Game of the Week - <?= htmlspecialchars($currentGame['name']) ?>">
    <meta property="og:description" content="<?= htmlspecialchars($currentGame['description']) ?>">

    <!-- Styles -->
    <link rel="stylesheet" href="/css/games.css">
    <link rel="stylesheet" href="/css/games-arcade.css">

    <!-- Hydration Script (before other JS) -->
    <?= generateHydrationScript() ?>
</head>
<body class="arcade-page">
    <!-- Skip Link -->
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <!-- SSR Content (visible immediately) -->
    <main id="main-content">
        <!-- Featured Game Section -->
        <section class="featured-section" aria-labelledby="featured-title">
            <h1 id="featured-title" class="sr-only">Game of the Week</h1>

            <div class="featured-game">
                <div class="featured-icon" id="featured-game-icon"><?= $currentGame['icon'] ?></div>
                <h2 class="featured-name" id="featured-game-name"><?= htmlspecialchars($currentGame['name']) ?></h2>
                <p class="featured-desc" id="featured-game-desc"><?= htmlspecialchars($currentGame['description']) ?></p>
            </div>

            <!-- Countdown (SSR initial values, JS will update) -->
            <div class="countdown" role="timer" aria-label="Time until next game rotation">
                <div class="countdown-item">
                    <span class="countdown-value" id="countdown-days"><?= $days ?></span>
                    <span class="countdown-label">Days</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value" id="countdown-hours"><?= str_pad((string)$hours, 2, '0', STR_PAD_LEFT) ?></span>
                    <span class="countdown-label">Hours</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value" id="countdown-mins"><?= str_pad((string)$mins, 2, '0', STR_PAD_LEFT) ?></span>
                    <span class="countdown-label">Minutes</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value" id="countdown-secs"><?= str_pad((string)$secs, 2, '0', STR_PAD_LEFT) ?></span>
                    <span class="countdown-label">Seconds</span>
                </div>
            </div>

            <button class="btn btn-primary featured-play-btn" data-action="play-featured">
                Play Now
            </button>
        </section>

        <!-- Leaderboard Section (SSR) -->
        <section class="leaderboard-section" aria-labelledby="leaderboard-title">
            <h2 id="leaderboard-title">Leaderboards</h2>

            <div class="leaderboard-tabs" role="tablist">
                <button class="leaderboard-tab active" data-period="weekly" role="tab" aria-selected="true">
                    Weekly
                </button>
                <button class="leaderboard-tab" data-period="cycle" role="tab" aria-selected="false">
                    Cycle
                </button>
            </div>

            <div class="leaderboard-list active" id="weekly-leaderboard" role="tabpanel">
                <?= $weeklyHtml ?>
            </div>

            <div class="leaderboard-list" id="cycle-leaderboard" role="tabpanel">
                <?= $cycleHtml ?>
            </div>
        </section>

        <!-- Games Grid (SSR placeholders, JS will enhance) -->
        <section class="games-section" id="games-section" aria-labelledby="games-title">
            <h2 id="games-title">All Games</h2>

            <div class="games-grid" id="games-grid">
                <?php foreach ($games->all() as $game): ?>
                    <?php $isFeatured = $game['id'] === $currentGame['id']; ?>
                    <div class="game-card <?= $isFeatured ? 'featured' : '' ?>" data-game="<?= $game['id'] ?>">
                        <div class="game-icon"><?= $game['icon'] ?></div>
                        <h3 class="game-name"><?= htmlspecialchars($game['name']) ?></h3>
                        <p class="game-type"><?= htmlspecialchars($game['type']) ?></p>
                        <button class="btn game-play-btn" data-action="open-game" data-game="<?= $game['id'] ?>">
                            Play
                        </button>
                    </div>
                <?php endforeach; ?>
            </div>
        </section>

        <!-- Noscript Fallback -->
        <noscript>
            <div class="noscript-warning" style="padding: 2rem; text-align: center; background: #1a1a2e; color: #fff; margin: 2rem;">
                <h2>JavaScript Required</h2>
                <p>Please enable JavaScript to play games. The leaderboards and game info above are available without JavaScript.</p>
            </div>
        </noscript>
    </main>

    <!-- Game Modals Container (JS will populate) -->
    <div id="game-modals"></div>

    <!-- JavaScript (progressive enhancement) -->
    <script src="/js/games/core/container.js"></script>
    <script src="/js/games/core/facades.js"></script>
    <script src="/js/games/core/bootstrap.js"></script>
    <script src="/js/games/utils.js"></script>
    <script src="/js/games/config.js"></script>
    <script src="/js/games/state.js"></script>
    <script src="/js/games/api.js"></script>
    <script src="/js/games/ui/rotation.js"></script>
    <script src="/js/games/ui/leaderboard.js"></script>
    <script src="/js/games/ui/competitive.js"></script>
    <script src="/js/games/ui/grid.js"></script>
    <script src="/js/games/ui/modal.js"></script>
    <script src="/js/games/ui/index.js"></script>
    <script src="/js/games/engine.js"></script>
    <script src="/js/games/main.js"></script>
</body>
</html>
