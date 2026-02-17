<?php
require_once '../includes/config.php';
requiert_admin();
$page_title = 'Gestion des utilisateurs - ASDF Store';

$message = '';

// Delete user
if (isset($_GET['supprimer'])) {
    $id = (int)$_GET['supprimer'];

    // Prevent deleting current admin
    if ($id === $_SESSION['user_id']) {
        $message = "Vous ne pouvez pas supprimer votre propre compte!";
    } else {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        if ($stmt->execute([$id])) {
            $message = "Utilisateur supprimé avec succès!";
        }
    }
}

// Get users with stats
$users = $pdo->query("
    SELECT
        u.*,
        COUNT(DISTINCT c.id) as total_commandes,
        COALESCE(SUM(c.total), 0) as total_depense
    FROM users u
    LEFT JOIN commandes c ON u.id = c.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
")->fetchAll();

include '../includes/header-admin.php';
?>

<h1 style="margin-bottom: 2rem;">Gestion des utilisateurs</h1>

<?php if ($message): ?>
    <div class="message message-success"><?= echapper($message) ?></div>
<?php endif; ?>

<div class="card">
    <h2 style="margin-bottom: 1.5rem;">Liste des utilisateurs</h2>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Nom d'utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Commandes</th>
                <th>Total dépensé</th>
                <th>Inscrit le</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($users as $user): ?>
                <tr>
                    <td><?= $user['id'] ?></td>
                    <td><?= echapper($user['username']) ?></td>
                    <td><?= echapper($user['email']) ?></td>
                    <td>
                        <span style="padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.85rem;
                                     background: <?= $user['role'] === 'admin' ? 'rgba(255,170,0,0.2)' : 'rgba(0,255,136,0.2)' ?>;
                                     color: <?= $user['role'] === 'admin' ? 'var(--warning)' : 'var(--success)' ?>;">
                            <?= $user['role'] === 'admin' ? '👑 Admin' : '👤 User' ?>
                        </span>
                    </td>
                    <td><?= $user['total_commandes'] ?></td>
                    <td style="color: var(--accent); font-weight: 600;">
                        <?= format_prix($user['total_depense']) ?>
                    </td>
                    <td><?= date('d/m/Y', strtotime($user['created_at'])) ?></td>
                    <td>
                        <?php if ($user['id'] === $_SESSION['user_id']): ?>
                            <span style="color: var(--text-secondary); font-size: 0.85rem;">Vous</span>
                        <?php else: ?>
                            <a href="users.php?supprimer=<?= $user['id'] ?>"
                               class="btn btn-danger"
                               style="padding: 0.4rem 0.8rem; font-size: 0.85rem;"
                               onclick="return confirm('Supprimer cet utilisateur?')">
                                🗑️ Supprimer
                            </a>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<?php include '../includes/footer.php'; ?>
