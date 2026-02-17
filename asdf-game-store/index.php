<?php
require_once 'includes/config.php';
$page_title = 'Accueil - ASDF Store';
include 'includes/header.php';
?>

<div class="card" style="text-align: center; padding: 3rem;">
    <h1 style="font-size: 3rem; margin-bottom: 1rem; background: linear-gradient(135deg, #00ff88 0%, #00ccff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        ▲ ASDF Store
    </h1>
    <p style="font-size: 1.2rem; color: var(--text-secondary); margin-bottom: 2rem;">
        Verify. Burn. Hold. — Dark terminal vibes.
    </p>
    <a href="articles.php" class="btn btn-primary" style="font-size: 1.1rem; padding: 1rem 2rem;">
        Parcourir le catalogue →
    </a>
</div>

<h2 style="margin-top: 3rem; margin-bottom: 1.5rem;">Produits populaires</h2>

<div class="products-grid">
    <?php
    $stmt = $pdo->query("SELECT * FROM items LIMIT 4");
    while ($produit = $stmt->fetch()) {
        $stock_stmt = $pdo->prepare("SELECT quantite FROM stock WHERE item_id = ?");
        $stock_stmt->execute([$produit['id']]);
        $stock = $stock_stmt->fetch();
        $en_stock = $stock && $stock['quantite'] > 0;
    ?>
        <div class="product-card">
            <img src="assets/img/categories/<?= echapper($produit['image']) ?>"
                 alt="<?= echapper($produit['nom']) ?>"
                 class="product-img"
                 onerror="this.src='assets/img/categories/default.png'">
            <div class="product-info">
                <h3 class="product-name"><?= echapper($produit['nom']) ?></h3>
                <p class="product-desc"><?= echapper(substr($produit['description'], 0, 80)) ?>...</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <span class="product-price"><?= format_prix($produit['prix']) ?></span>
                    <?php if ($en_stock): ?>
                        <span style="color: var(--success); font-size: 0.85rem;">● En stock</span>
                    <?php else: ?>
                        <span style="color: var(--danger); font-size: 0.85rem;">● Rupture</span>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    <?php } ?>
</div>

<?php include 'includes/footer.php'; ?>
