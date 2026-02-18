<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?? 'ASDF Store' ?></title>

    <!-- Critical CSS inline to prevent FOUC - MUST be first -->
    <style>
        /* CRITICAL: Prevent FOUC by hiding everything until fully loaded */
        html {
            visibility: hidden;
            opacity: 0;
        }

        html.loaded {
            visibility: visible;
            opacity: 1;
            transition: opacity 0.3s ease;
        }

        /* Preloader to show during load */
        .preloader {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: #0a0e14 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            transition: opacity 0.4s ease, visibility 0.4s ease;
        }

        .preloader.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .preloader-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(0, 255, 136, 0.15);
            border-top-color: #00ff88;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Base styles to prevent layout shift */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: #0a0e14;
            color: #e8edf4;
            overflow-x: hidden;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
    </style>

    <!-- Make HTML visible immediately after this script -->
    <script>
        // Mark HTML as loaded to make it visible
        document.documentElement.classList.add('loaded');
    </script>

    <!-- Preload critical CSS -->
    <link rel="preload" href="assets/css/style.css" as="style">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <!-- Preloader -->
    <div class="preloader" id="preloader">
        <div class="preloader-spinner"></div>
    </div>

    <header>
        <nav>
            <a href="index.php" class="logo">ASDF Store</a>
            <ul class="nav-links">
                <li><a href="index.php">Accueil</a></li>
                <li><a href="articles.php">Produits</a></li>
                <?php if (est_connecte()): ?>
                    <li><a href="historique.php">Historique</a></li>
                    <li><a href="panier.php">Panier <?php
                        $cart_count = isset($_SESSION['panier']) ? array_sum($_SESSION['panier']) : 0;
                        if ($cart_count > 0) echo '<span class="cart-badge">' . $cart_count . '</span>';
                    ?></a></li>
                    <?php if (est_admin()): ?>
                        <li><a href="admin/dashboard.php">Admin</a></li>
                    <?php endif; ?>
                    <li><a href="logout.php">Déconnexion</a></li>
                <?php else: ?>
                    <li><a href="login.php">Connexion</a></li>
                    <li><a href="register.php">Inscription</a></li>
                <?php endif; ?>
                <!-- Theme Switcher -->
                <li>
                    <button id="theme-switcher" class="theme-btn" title="Changer de thème" style="background: none; border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 8px; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; transition: all 0.3s;">
                        🎨
                    </button>
                </li>
            </ul>
        </nav>
    </header>
    <main class="container">

    <script>
        // Improved preloader removal with better error handling
        (function() {
            let preloaderRemoved = false;

            function removePreloader() {
                if (preloaderRemoved) return;
                preloaderRemoved = true;

                const preloader = document.getElementById('preloader');
                if (preloader) {
                    // Small delay for smoother transition
                    setTimeout(() => {
                        preloader.classList.add('hidden');
                    }, 150);
                }
            }

            // Remove on full page load
            if (document.readyState === 'complete') {
                removePreloader();
            } else {
                window.addEventListener('load', removePreloader);
            }

            // Fallback: remove after 1.5s maximum
            setTimeout(removePreloader, 1500);

            // Remove on DOMContentLoaded as backup
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(removePreloader, 500);
                });
            }
        })();
    </script>
