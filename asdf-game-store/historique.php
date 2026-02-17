<?php
require_once 'includes/config.php';
requiert_connexion();
$page_title = 'Historique - ASDF Store';

include 'includes/header.php';
?>

<h1 style="margin-bottom: 2rem;">Historique de mes commandes</h1>

<?php if (isset($_GET['success'])): ?>
    <div class="message message-success">
        ✓ Commande validée avec succès!
    </div>
<?php endif; ?>

<?php
$stmt = $pdo->prepare("SELECT * FROM commandes WHERE user_id = ? ORDER BY created_at DESC");
$stmt->execute([$_SESSION['user_id']]);
$commandes = $stmt->fetchAll();

if (empty($commandes)): ?>
    <div class="card" style="text-align: center; padding: 3rem;">
        <p style="font-size: 1.2rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            Vous n'avez pas encore passé de commande
        </p>
        <a href="articles.php" class="btn btn-primary">Voir les produits</a>
    </div>
<?php else: ?>
    <?php foreach ($commandes as $commande): ?>
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                <div>
                    <h3 style="color: var(--accent);">Commande #<?= $commande['id'] ?></h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">
                        <?= date('d/m/Y à H:i', strtotime($commande['created_at'])) ?>
                    </p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 1.3rem; font-weight: 700; color: var(--accent);">
                        <?= format_prix($commande['total']) ?>
                    </p>
                    <span style="padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.85rem;
                                 background: <?= $commande['statut'] === 'completed' ? 'rgba(0,255,136,0.2)' : 'rgba(255,170,0,0.2)' ?>;
                                 color: <?= $commande['statut'] === 'completed' ? 'var(--success)' : 'var(--warning)' ?>;">
                        <?= $commande['statut'] === 'completed' ? '✓ Complétée' : '⏳ En cours' ?>
                    </span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Produit</th>
                        <th>Prix unitaire</th>
                        <th>Quantité</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $stmt_items = $pdo->prepare("
                        SELECT ci.*, i.nom
                        FROM commande_items ci
                        JOIN items i ON ci.item_id = i.id
                        WHERE ci.commande_id = ?
                    ");
                    $stmt_items->execute([$commande['id']]);
                    $items = $stmt_items->fetchAll();

                    foreach ($items as $item): ?>
                        <tr>
                            <td><?= echapper($item['nom']) ?></td>
                            <td><?= format_prix($item['prix_unitaire']) ?></td>
                            <td><?= $item['quantite'] ?></td>
                            <td style="color: var(--accent);">
                                <?= format_prix($item['prix_unitaire'] * $item['quantite']) ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endforeach; ?>
<?php endif; ?>

<?php include 'includes/footer.php'; ?>
