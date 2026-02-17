<?php
require_once 'includes/config.php';
$page_title = 'Catalogue - ASDF Store';

// Search functionality (BONUS #3)
$search = $_GET['search'] ?? '';
$categorie = $_GET['categorie'] ?? '';

$query = "SELECT i.*, s.quantite FROM items i
          LEFT JOIN stock s ON i.id = s.item_id
          WHERE 1=1";
$params = [];

if ($search) {
    $query .= " AND (i.nom LIKE ? OR i.description LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if ($categorie) {
    $query .= " AND i.categorie = ?";
    $params[] = $categorie;
}

$query .= " ORDER BY i.created_at DESC";

include 'includes/header.php';
?>

<h1 style="margin-bottom: 2rem;">Catalogue des produits</h1>

<!-- Search Bar (BONUS #3) -->
<div class="search-bar">
    <form method="GET" style="position: relative;">
        <span class="search-icon">🔍</span>
        <input type="text"
               name="search"
               class="search-input"
               placeholder="Rechercher un produit..."
               value="<?= echapper($search) ?>">
    </form>
</div>

<!-- Category Filter -->
<div style="display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap;">
    <a href="articles.php" class="btn <?= !$categorie ? 'btn-primary' : 'btn-secondary' ?>">Tout</a>
    <?php
    $cats = $pdo->query("SELECT DISTINCT categorie FROM items")->fetchAll();
    foreach ($cats as $cat) {
        $active = $categorie === $cat['categorie'];
        $class = $active ? 'btn-primary' : 'btn-secondary';
        echo "<a href='articles.php?categorie=" . urlencode($cat['categorie']) . "' class='btn $class'>" .
             echapper(ucfirst($cat['categorie'])) . "</a>";
    }
    ?>
</div>

<?php if ($search): ?>
    <p style="color: var(--text-secondary); margin-bottom: 1rem;">
        Résultats pour "<?= echapper($search) ?>"
    </p>
<?php endif; ?>

<div class="products-grid">
    <?php
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $produits = $stmt->fetchAll();

    if (count($produits) === 0) {
        echo "<p style='grid-column: 1/-1; text-align: center; color: var(--text-secondary);'>Aucun produit trouvé.</p>";
    }

    foreach ($produits as $produit) {
        $en_stock = $produit['quantite'] > 0;
    ?>
        <div class="product-card">
            <img src="assets/img/uploads/<?= echapper($produit['image']) ?>"
                 alt="<?= echapper($produit['nom']) ?>"
                 class="product-img"
                 onerror="this.src='assets/img/categories/<?= echapper($produit['categorie']) ?>.png'">
            <div class="product-info">
                <h3 class="product-name"><?= echapper($produit['nom']) ?></h3>
                <p class="product-desc"><?= echapper(substr($produit['description'], 0, 100)) ?>...</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <span class="product-price"><?= format_prix($produit['prix']) ?></span>
                    <span style="color: <?= $en_stock ? 'var(--success)' : 'var(--danger)' ?>; font-size: 0.85rem;">
                        ● <?= $en_stock ? $produit['quantite'] . ' en stock' : 'Rupture' ?>
                    </span>
                </div>
                <?php if ($en_stock): ?>
                    <form method="POST" action="panier.php" style="margin-top: 1rem;">
                        <input type="hidden" name="item_id" value="<?= $produit['id'] ?>">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            Ajouter au panier
                        </button>
                    </form>
                <?php endif; ?>
            </div>
        </div>
    <?php } ?>
</div>

<?php include 'includes/footer.php'; ?>
