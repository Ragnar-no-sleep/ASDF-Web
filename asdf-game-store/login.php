<?php
require_once 'includes/config.php';
$page_title = 'Connexion - ASDF Store';

if (est_connecte()) {
    header('Location: index.php');
    exit;
}

$erreur = '';
$redirect = $_GET['redirect'] ?? 'index.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (!empty($username) && !empty($password)) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];

            header('Location: ' . $redirect);
            exit;
        } else {
            $erreur = "Identifiants incorrects.";
        }
    } else {
        $erreur = "Veuillez remplir tous les champs.";
    }
}

include 'includes/header.php';
?>

<div class="card" style="max-width: 500px; margin: 4rem auto;">
    <h1 style="text-align: center; margin-bottom: 2rem;">Connexion</h1>

    <?php if ($erreur): ?>
        <div class="message message-error"><?= echapper($erreur) ?></div>
    <?php endif; ?>

    <form method="POST">
        <div class="form-group">
            <label>Nom d'utilisateur ou Email</label>
            <input type="text" name="username" required autofocus>
        </div>

        <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" name="password" required>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 1rem; font-size: 1.1rem;">
            Se connecter
        </button>
    </form>

    <p style="text-align: center; margin-top: 1.5rem; color: var(--text-secondary);">
        Pas encore de compte?
        <a href="register.php" style="color: var(--accent);">Créer un compte</a>
    </p>
</div>

<?php include 'includes/footer.php'; ?>
