<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?? 'ASDF Store' ?></title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <header>
        <nav>
            <a href="index.php" class="logo">▲ ASDF Store</a>
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
            </ul>
        </nav>
    </header>
    <main class="container">
