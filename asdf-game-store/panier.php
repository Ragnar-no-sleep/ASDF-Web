<?php
require_once 'includes/config.php';
$page_title = 'Panier - ASDF Store';

// Initialize cart
if (!isset($_SESSION['panier'])) {
    $_SESSION['panier'] = [];
}

// Add to cart
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['item_id'])) {
    $item_id = (int)$_POST['item_id'];

    // Check stock
    $stmt = $pdo->prepare("SELECT quantite FROM stock WHERE item_id = ?");
    $stmt->execute([$item_id]);
    $stock = $stmt->fetch();

    if ($stock && $stock['quantite'] > 0) {
        if (!isset($_SESSION['panier'][$item_id])) {
            $_SESSION['panier'][$item_id] = 0;
        }

        if ($_SESSION['panier'][$item_id] < $stock['quantite']) {
            $_SESSION['panier'][$item_id]++;
            $message = "Produit ajouté au panier!";
        } else {
            $erreur = "Stock insuffisant.";
        }
    } else {
        $erreur = "Produit en rupture de stock.";
    }

    header('Location: panier.php');
    exit;
}

// Update quantity
if (isset($_GET['action']) && isset($_GET['id'])) {
    $item_id = (int)$_GET['id'];

    if ($_GET['action'] === 'increase') {
        $stmt = $pdo->prepare("SELECT quantite FROM stock WHERE item_id = ?");
        $stmt->execute([$item_id]);
        $stock = $stmt->fetch();

        if ($stock && $_SESSION['panier'][$item_id] < $stock['quantite']) {
            $_SESSION['panier'][$item_id]++;
        }
    } elseif ($_GET['action'] === 'decrease') {
        $_SESSION['panier'][$item_id]--;
        if ($_SESSION['panier'][$item_id] <= 0) {
            unset($_SESSION['panier'][$item_id]);
        }
    } elseif ($_GET['action'] === 'remove') {
        unset($_SESSION['panier'][$item_id]);
    }

    header('Location: panier.php');
    exit;
}

include 'includes/header.php';
?>

<h1 style="margin-bottom: 2rem;">Mon Panier</h1>

<?php if (empty($_SESSION['panier'])): ?>
    <div class="card" style="text-align: center; padding: 3rem;">
        <p style="font-size: 1.2rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            Votre panier est vide
        </p>
        <a href="articles.php" class="btn btn-primary">Voir les produits</a>
    </div>
<?php else: ?>
    <div class="card">
        <table>
            <thead>
                <tr>
                    <th>Produit</th>
                    <th>Prix unitaire</th>
                    <th>Quantité</th>
                    <th>Total</th>
                    <th>Actions</th>
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
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <a href="panier.php?action=decrease&id=<?= $item['id'] ?>"
                                   class="btn btn-secondary" style="padding: 0.3rem 0.7rem;">-</a>
                                <span style="min-width: 2rem; text-align: center;"><?= $quantite ?></span>
                                <a href="panier.php?action=increase&id=<?= $item['id'] ?>"
                                   class="btn btn-secondary" style="padding: 0.3rem 0.7rem;">+</a>
                            </div>
                        </td>
                        <td style="color: var(--accent); font-weight: 600;"><?= format_prix($subtotal) ?></td>
                        <td>
                            <a href="panier.php?action=remove&id=<?= $item['id'] ?>"
                               class="btn btn-danger" style="padding: 0.5rem 1rem;">
                                Retirer
                            </a>
                        </td>
                    </tr>
                <?php } ?>
                <tr style="border-top: 2px solid var(--border);">
                    <td colspan="3" style="text-align: right; font-weight: 600; font-size: 1.2rem;">
                        TOTAL
                    </td>
                    <td colspan="2" style="color: var(--accent); font-weight: 700; font-size: 1.3rem;">
                        <?= format_prix($total) ?>
                    </td>
                </tr>
            </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 2rem;">
            <a href="articles.php" class="btn btn-secondary">Continuer mes achats</a>
            <?php if (est_connecte()): ?>
                <a href="checkout.php" class="btn btn-primary" style="font-size: 1.1rem;">
                    Passer la commande →
                </a>
            <?php else: ?>
                <a href="login.php?redirect=checkout.php" class="btn btn-primary" style="font-size: 1.1rem;">
                    Se connecter pour commander →
                </a>
            <?php endif; ?>
        </div>
    </div>
<?php endif; ?>

<?php include 'includes/footer.php'; ?>
