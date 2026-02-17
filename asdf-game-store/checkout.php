<?php
require_once 'includes/config.php';
requiert_connexion();
$page_title = 'Finaliser la commande - ASDF Store';

if (empty($_SESSION['panier'])) {
    header('Location: panier.php');
    exit;
}

$erreur = '';
$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $pdo->beginTransaction();

        // Calculate total
        $total = 0;
        $items_data = [];

        foreach ($_SESSION['panier'] as $item_id => $quantite) {
            $stmt = $pdo->prepare("SELECT i.*, s.quantite as stock FROM items i
                                   LEFT JOIN stock s ON i.id = s.item_id
                                   WHERE i.id = ?");
            $stmt->execute([$item_id]);
            $item = $stmt->fetch();

            if (!$item || $item['stock'] < $quantite) {
                throw new Exception("Stock insuffisant pour " . $item['nom']);
            }

            $total += $item['prix'] * $quantite;
            $items_data[] = [
                'id' => $item_id,
                'prix' => $item['prix'],
                'quantite' => $quantite
            ];
        }

        // Create order
        $stmt = $pdo->prepare("INSERT INTO commandes (user_id, total, statut) VALUES (?, ?, 'completed')");
        $stmt->execute([$_SESSION['user_id'], $total]);
        $commande_id = $pdo->lastInsertId();

        // Add order items and update stock
        foreach ($items_data as $data) {
            // Add to order
            $stmt = $pdo->prepare("INSERT INTO commande_items (commande_id, item_id, quantite, prix_unitaire)
                                   VALUES (?, ?, ?, ?)");
            $stmt->execute([$commande_id, $data['id'], $data['quantite'], $data['prix']]);

            // Update stock
            $stmt = $pdo->prepare("UPDATE stock SET quantite = quantite - ? WHERE item_id = ?");
            $stmt->execute([$data['quantite'], $data['id']]);
        }

        $pdo->commit();

        // Clear cart
        $_SESSION['panier'] = [];

        // Redirect to order history
        header('Location: historique.php?success=1');
        exit;

    } catch (Exception $e) {
        $pdo->rollBack();
        $erreur = $e->getMessage();
    }
}

include 'includes/header.php';
?>

<h1 style="margin-bottom: 2rem;">Finaliser la commande</h1>

<?php if ($erreur): ?>
    <div class="message message-error"><?= echapper($erreur) ?></div>
<?php endif; ?>

<div class="card">
    <h2 style="margin-bottom: 1.5rem;">Récapitulatif</h2>

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
            $total = 0;
            $items = implode(',', array_keys($_SESSION['panier']));
            $stmt = $pdo->query("SELECT * FROM items WHERE id IN ($items)");

            while ($item = $stmt->fetch()) {
                $quantite = $_SESSION['panier'][$item['id']];
                $subtotal = $item['prix'] * $quantite;
                $total += $subtotal;
            ?>
                <tr>
                    <td><?= echapper($item['nom']) ?></td>
                    <td><?= format_prix($item['prix']) ?></td>
                    <td><?= $quantite ?></td>
                    <td style="color: var(--accent);"><?= format_prix($subtotal) ?></td>
                </tr>
            <?php } ?>
            <tr style="border-top: 2px solid var(--border);">
                <td colspan="3" style="text-align: right; font-weight: 600; font-size: 1.2rem;">
                    TOTAL À PAYER
                </td>
                <td style="color: var(--accent); font-weight: 700; font-size: 1.3rem;">
                    <?= format_prix($total) ?>
                </td>
            </tr>
        </tbody>
    </table>

    <form method="POST" style="margin-top: 2rem;">
        <div style="display: flex; justify-content: space-between;">
            <a href="panier.php" class="btn btn-secondary">Retour au panier</a>
            <button type="submit" class="btn btn-primary" style="font-size: 1.1rem; padding: 1rem 2rem;">
                Confirmer la commande
            </button>
        </div>
    </form>
</div>

<?php include 'includes/footer.php'; ?>
