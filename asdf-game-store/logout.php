<?php
require_once 'includes/config.php';

// Destroy session
session_destroy();
$_SESSION = [];

// Redirect to home
header('Location: index.php');
exit;
