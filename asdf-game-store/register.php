<?php
require_once 'includes/config.php';
$page_title = 'Inscription - ASDF Store';

if (est_connecte()) {
    header('Location: index.php');
    exit;
}

$erreur = '';
$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $password_confirm = $_POST['password_confirm'] ?? '';

    if (empty($username) || empty($email) || empty($password)) {
        $erreur = "Tous les champs sont requis.";
    } elseif (strlen($username) < 3) {
        $erreur = "Le nom d'utilisateur doit contenir au moins 3 caractères.";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erreur = "Email invalide.";
    } elseif (strlen($password) < 6) {
        $erreur = "Le mot de passe doit contenir au moins 6 caractères.";
    } elseif ($password !== $password_confirm) {
        $erreur = "Les mots de passe ne correspondent pas.";
    } else {
        // Check if username/email already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);

        if ($stmt->fetch()) {
            $erreur = "Ce nom d'utilisateur ou email est déjà utilisé.";
        } else {
            // Create user
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");

            if ($stmt->execute([$username, $email, $password_hash])) {
                // Auto-login
                $user_id = $pdo->lastInsertId();
                $_SESSION['user_id'] = $user_id;
                $_SESSION['username'] = $username;
                $_SESSION['role'] = 'user';

                header('Location: index.php');
                exit;
            } else {
                $erreur = "Erreur lors de la création du compte.";
            }
        }
    }
}

include 'includes/header.php';
?>

<div class="card" style="max-width: 500px; margin: 4rem auto;">
    <h1 style="text-align: center; margin-bottom: 2rem;">Créer un compte</h1>

    <?php if ($erreur): ?>
        <div class="message message-error"><?= echapper($erreur) ?></div>
    <?php endif; ?>

    <form method="POST">
        <div class="form-group">
            <label>Nom d'utilisateur *</label>
            <input type="text" name="username" value="<?= echapper($_POST['username'] ?? '') ?>" required autofocus>
        </div>

        <div class="form-group">
            <label>Email *</label>
            <input type="email" name="email" value="<?= echapper($_POST['email'] ?? '') ?>" required>
        </div>

        <div class="form-group">
            <label>Mot de passe * (min. 6 caractères)</label>
            <input type="password" name="password" required>
        </div>

        <div class="form-group">
            <label>Confirmer le mot de passe *</label>
            <input type="password" name="password_confirm" required>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 1rem; font-size: 1.1rem;">
            Créer mon compte
        </button>
    </form>

    <p style="text-align: center; margin-top: 1.5rem; color: var(--text-secondary);">
        Déjà un compte?
        <a href="login.php" style="color: var(--accent);">Se connecter</a>
    </p>
</div>

<?php include 'includes/footer.php'; ?>
