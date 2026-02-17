<?php
require_once '../includes/config.php';
requiert_admin();
$page_title = 'Gestion des produits - ASDF Store';

$message = '';
$erreur = '';

// Add product
if (isset($_POST['ajouter'])) {
    $nom = trim($_POST['nom']);
    $description = trim($_POST['description']);
    $prix = (float)$_POST['prix'];
    $categorie = $_POST['categorie'];
    $quantite_stock = (int)$_POST['quantite_stock'];

    // Image upload (BONUS #1)
    $image_nom = $categorie . '.png'; // Default
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = '../assets/img/uploads/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }

        $extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        if (in_array(strtolower($extension), $allowed)) {
            $image_nom = 'product_' . time() . '.' . $extension;
            move_uploaded_file($_FILES['image']['tmp_name'], $upload_dir . $image_nom);
        }
    }

    if (!empty($nom) && $prix > 0) {
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO items (nom, description, prix, categorie, image) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$nom, $description, $prix, $categorie, $image_nom]);
            $item_id = $pdo->lastInsertId();

            $stmt = $pdo->prepare("INSERT INTO stock (item_id, quantite) VALUES (?, ?)");
            $stmt->execute([$item_id, $quantite_stock]);

            $pdo->commit();
            $message = "Produit ajouté avec succès!";
        } catch (Exception $e) {
            $pdo->rollBack();
            $erreur = "Erreur: " . $e->getMessage();
        }
    } else {
        $erreur = "Veuillez remplir tous les champs requis.";
    }
}

// Update product
if (isset($_POST['modifier'])) {
    $id = (int)$_POST['id'];
    $nom = trim($_POST['nom']);
    $description = trim($_POST['description']);
    $prix = (float)$_POST['prix'];
    $categorie = $_POST['categorie'];

    // Image upload (optional in edit mode)
    $image_update = '';
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = '../assets/img/uploads/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }

        $extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        if (in_array(strtolower($extension), $allowed)) {
            $image_nom = 'product_' . time() . '.' . $extension;
            move_uploaded_file($_FILES['image']['tmp_name'], $upload_dir . $image_nom);
            $image_update = ", image = '$image_nom'";
        }
    }

    $query = "UPDATE items SET nom=?, description=?, prix=?, categorie=? $image_update WHERE id=?";
    $stmt = $pdo->prepare($query);
    if ($stmt->execute([$nom, $description, $prix, $categorie, $id])) {
        $message = "Produit modifié avec succès!";
    }
}

// Delete product
if (isset($_GET['supprimer'])) {
    $id = (int)$_GET['supprimer'];
    $stmt = $pdo->prepare("DELETE FROM items WHERE id = ?");
    if ($stmt->execute([$id])) {
        $message = "Produit supprimé avec succès!";
    }
}

// Edit mode
$produit_edit = null;
if (isset($_GET['modifier'])) {
    $id = (int)$_GET['modifier'];
    $stmt = $pdo->prepare("SELECT * FROM items WHERE id = ?");
    $stmt->execute([$id]);
    $produit_edit = $stmt->fetch();
}

include '../includes/header-admin.php';
?>

<h1 style="margin-bottom: 2rem;">Gestion des produits</h1>

<?php if ($message): ?>
    <div class="message message-success"><?= echapper($message) ?></div>
<?php endif; ?>

<?php if ($erreur): ?>
    <div class="message message-error"><?= echapper($erreur) ?></div>
<?php endif; ?>

<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
    <div class="card">
        <h2 style="margin-bottom: 1.5rem;">
            <?= $produit_edit ? '✏️ Modifier le produit' : '➕ Ajouter un produit' ?>
        </h2>

        <form method="POST" enctype="multipart/form-data">
            <?php if ($produit_edit): ?>
                <input type="hidden" name="id" value="<?= $produit_edit['id'] ?>">
            <?php endif; ?>

            <div class="form-group">
                <label>Nom *</label>
                <input type="text" name="nom" value="<?= echapper($produit_edit['nom'] ?? '') ?>" required>
            </div>

            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="4"><?= echapper($produit_edit['description'] ?? '') ?></textarea>
            </div>

            <div class="form-group">
                <label>Prix (€) *</label>
                <input type="number" name="prix" step="0.01" value="<?= echapper($produit_edit['prix'] ?? '') ?>" required>
            </div>

            <div class="form-group">
                <label>Catégorie *</label>
                <select name="categorie" required>
                    <option value="apparel" <?= ($produit_edit['categorie'] ?? '') === 'apparel' ? 'selected' : '' ?>>Vêtements</option>
                    <option value="books" <?= ($produit_edit['categorie'] ?? '') === 'books' ? 'selected' : '' ?>>Livres</option>
                    <option value="accessories" <?= ($produit_edit['categorie'] ?? '') === 'accessories' ? 'selected' : '' ?>>Accessoires</option>
                    <option value="games" <?= ($produit_edit['categorie'] ?? '') === 'games' ? 'selected' : '' ?>>Jeux</option>
                </select>
            </div>

            <div class="form-group">
                <label>Image du produit (JPG, PNG, GIF, WEBP)</label>
                <input type="file" name="image" accept="image/*" style="width: 100%; padding: 0.8rem; background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary);">
                <?php if ($produit_edit && $produit_edit['image']): ?>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        Image actuelle: <?= echapper($produit_edit['image']) ?>
                    </p>
                <?php endif; ?>
            </div>

            <?php if (!$produit_edit): ?>
                <div class="form-group">
                    <label>Quantité initiale en stock *</label>
                    <input type="number" name="quantite_stock" value="0" required>
                </div>
            <?php endif; ?>

            <button type="submit" name="<?= $produit_edit ? 'modifier' : 'ajouter' ?>" class="btn btn-primary" style="width: 100%;">
                <?= $produit_edit ? 'Modifier' : 'Ajouter' ?>
            </button>

            <?php if ($produit_edit): ?>
                <a href="products.php" class="btn btn-secondary" style="width: 100%; margin-top: 0.5rem; text-align: center;">
                    Annuler
                </a>
            <?php endif; ?>
        </form>
    </div>

    <div class="card">
        <h2 style="margin-bottom: 1.5rem;">Liste des produits</h2>

        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nom</th>
                    <th>Prix</th>
                    <th>Catégorie</th>
                    <th>Stock</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php
                $stmt = $pdo->query("
                    SELECT i.*, s.quantite
                    FROM items i
                    LEFT JOIN stock s ON i.id = s.item_id
                    ORDER BY i.id DESC
                ");
                while ($produit = $stmt->fetch()):
                ?>
                    <tr>
                        <td><?= $produit['id'] ?></td>
                        <td><?= echapper($produit['nom']) ?></td>
                        <td style="color: var(--accent);"><?= format_prix($produit['prix']) ?></td>
                        <td><?= echapper($produit['categorie']) ?></td>
                        <td>
                            <span style="color: <?= $produit['quantite'] > 0 ? 'var(--success)' : 'var(--danger)' ?>;">
                                <?= $produit['quantite'] ?? 0 ?>
                            </span>
                        </td>
                        <td>
                            <a href="products.php?modifier=<?= $produit['id'] ?>" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                                ✏️
                            </a>
                            <a href="products.php?supprimer=<?= $produit['id'] ?>"
                               class="btn btn-danger"
                               style="padding: 0.4rem 0.8rem; font-size: 0.85rem;"
                               onclick="return confirm('Supprimer ce produit?')">
                                🗑️
                            </a>
                        </td>
                    </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include '../includes/footer.php'; ?>
