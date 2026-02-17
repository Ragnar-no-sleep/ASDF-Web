<?php
// ASDF Game Store - Configuration
session_start();

// Database configuration
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'asdf_store');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

// Site configuration
define('SITE_NAME', 'ASDF Store');
define('SITE_URL', 'http://localhost/asdf-game-store');
define('UPLOAD_DIR', __DIR__ . '/../assets/img/uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB

// Connect to database
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Security helper
function echapper($str) {
    return htmlspecialchars($str ?? '', ENT_QUOTES, 'UTF-8');
}

// Check if user is logged in
function est_connecte() {
    return isset($_SESSION['user_id']);
}

// Check if user is admin
function est_admin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

// Redirect if not logged in
function requiert_connexion() {
    if (!est_connecte()) {
        header('Location: login.php?redirect=' . urlencode($_SERVER['REQUEST_URI']));
        exit;
    }
}

// Redirect if not admin
function requiert_admin() {
    requiert_connexion();
    if (!est_admin()) {
        header('Location: ../index.php');
        exit;
    }
}

// Format price
function format_prix($prix) {
    return number_format($prix, 2, '.', ',') . ' €';
}
