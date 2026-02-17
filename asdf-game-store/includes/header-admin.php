<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?? 'Admin - ASDF Store' ?></title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <header style="background: linear-gradient(135deg, #1a1f29 0%, #2d1f3f 100%);">
        <nav>
            <a href="../index.php" class="logo">▲ ASDF Admin</a>
            <ul class="nav-links">
                <li><a href="dashboard.php">Dashboard</a></li>
                <li><a href="products.php">Produits</a></li>
                <li><a href="users.php">Utilisateurs</a></li>
                <li><a href="../index.php">Retour au site</a></li>
                <li><a href="../logout.php">Déconnexion</a></li>
            </ul>
        </nav>
    </header>
    <main class="container">
