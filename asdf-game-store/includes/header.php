<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?? 'ASDF Store' ?></title>

    <!-- Critical CSS inline to prevent FOUC -->
    <style>
        /* Preloader to hide unstyled content */
        .preloader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0a0e14;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .preloader.hidden {
            opacity: 0;
            visibility: hidden;
        }

        .preloader-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(0, 255, 136, 0.2);
            border-top-color: #00ff88;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Prevent layout shift */
        body {
            margin: 0;
            background: #0a0e14;
            color: #e8edf4;
            overflow-x: hidden;
        }

        /* Hide body until loaded */
        body:not(.loaded) {
            visibility: hidden;
        }

        body.loaded {
            visibility: visible;
        }
    </style>

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
        // Remove preloader when page is loaded
        window.addEventListener('load', function() {
            const preloader = document.getElementById('preloader');
            document.body.classList.add('loaded');
            setTimeout(() => {
                preloader.classList.add('hidden');
            }, 100);
        });

        // Fallback: remove preloader after 2s even if page isn't fully loaded
        setTimeout(function() {
            const preloader = document.getElementById('preloader');
            document.body.classList.add('loaded');
            preloader.classList.add('hidden');
        }, 2000);
    </script>
