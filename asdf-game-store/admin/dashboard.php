<?php
require_once '../includes/config.php';
requiert_admin();
$page_title = 'Dashboard Admin - ASDF Store';

// Stats
$stats = [
    'users' => $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(),
    'products' => $pdo->query("SELECT COUNT(*) FROM items")->fetchColumn(),
    'orders' => $pdo->query("SELECT COUNT(*) FROM commandes")->fetchColumn(),
    'revenue' => $pdo->query("SELECT SUM(total) FROM commandes WHERE statut = 'completed'")->fetchColumn() ?? 0
];

// Recent orders
$recent_orders = $pdo->query("
    SELECT c.*, u.username
    FROM commandes c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
    LIMIT 5
")->fetchAll();

include '../includes/header-admin.php';
?>

<h1 style="margin-bottom: 2rem;">Dashboard Admin</h1>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
    <div class="card" style="background: linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(0,204,170,0.1) 100%);">
        <h3 style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Utilisateurs</h3>
        <p style="font-size: 2.5rem; font-weight: 700; color: var(--accent);"><?= $stats['users'] ?></p>
    </div>

    <div class="card" style="background: linear-gradient(135deg, rgba(0,204,255,0.1) 0%, rgba(0,170,255,0.1) 100%);">
        <h3 style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Produits</h3>
        <p style="font-size: 2.5rem; font-weight: 700; color: #00ccff;"><?= $stats['products'] ?></p>
    </div>

    <div class="card" style="background: linear-gradient(135deg, rgba(255,170,0,0.1) 0%, rgba(255,136,0,0.1) 100%);">
        <h3 style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Commandes</h3>
        <p style="font-size: 2.5rem; font-weight: 700; color: var(--warning);"><?= $stats['orders'] ?></p>
    </div>

    <div class="card" style="background: linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(0,255,68,0.1) 100%);">
        <h3 style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Revenus</h3>
        <p style="font-size: 2.5rem; font-weight: 700; color: var(--success);"><?= format_prix($stats['revenue']) ?></p>
    </div>
</div>

<div class="card">
    <h2 style="margin-bottom: 1.5rem;">Dernières commandes</h2>

    <?php if (empty($recent_orders)): ?>
        <p style="color: var(--text-secondary); text-align: center;">Aucune commande pour le moment.</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Client</th>
                    <th>Total</th>
                    <th>Statut</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($recent_orders as $order): ?>
                    <tr>
                        <td>#<?= $order['id'] ?></td>
                        <td><?= echapper($order['username']) ?></td>
                        <td style="color: var(--accent); font-weight: 600;"><?= format_prix($order['total']) ?></td>
                        <td>
                            <span style="padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.85rem;
                                         background: <?= $order['statut'] === 'completed' ? 'rgba(0,255,136,0.2)' : 'rgba(255,170,0,0.2)' ?>;
                                         color: <?= $order['statut'] === 'completed' ? 'var(--success)' : 'var(--warning)' ?>;">
                                <?= $order['statut'] === 'completed' ? '✓ Complétée' : '⏳ En cours' ?>
                            </span>
                        </td>
                        <td><?= date('d/m/Y H:i', strtotime($order['created_at'])) ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<?php include '../includes/footer.php'; ?>
