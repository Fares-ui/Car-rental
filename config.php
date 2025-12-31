<?php
/**
 * Configuration File
 * Central configuration for the DriveNow application
 */

// Error reporting (change to 0 in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Timezone
date_default_timezone_set('UTC');

// CORS Settings
define('CORS_ALLOWED_ORIGINS', '*'); // In production, specify exact origins
define('CORS_ALLOWED_METHODS', 'GET, POST, PUT, DELETE, OPTIONS');
define('CORS_ALLOWED_HEADERS', 'Content-Type, Authorization');

// API Settings
define('API_VERSION', '1.0.0');
define('DEFAULT_FORMAT', 'json'); // json or xml

// Database Configuration
// IMPORTANT: Changed from 'backend-project' to 'drivenow' to match schema.sql
define('DB_HOST', 'localhost');
define('DB_NAME', 'drivenow');  // ← CHANGED THIS
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Pagination
define('ITEMS_PER_PAGE', 10);

// File Upload Settings
define('MAX_FILE_SIZE', 5242880); // 5MB in bytes
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Payment Gateway (Stripe)
define('STRIPE_PUBLIC_KEY', 'pk_test_51SVG2kBi5o9XwiiPvIdLdZGolEewq3lKOPKX58WvOopBSCpsyDIByCFrYmT3x9nARqfiV51v6AM0KfQvfmSXXYB700G1AxiOts');
define('STRIPE_SECRET_KEY', 'sk_test_51SVG2kBi5o9XwiiPj27BFn4qRNdvgbE2HcTFIN50q9aCFojNbGiZH5vorXvs7t3OszPSgWHX5hwZgt1GelYJgdcG00NhNldPHx');
define('CURRENCY', 'USD');

// Email Configuration (for future use)
define('SMTP_HOST', 'smtp.example.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'noreply@drivenow.com');
define('SMTP_PASS', 'password');
define('FROM_EMAIL', 'noreply@drivenow.com');
define('FROM_NAME', 'DriveNow Car Rental');

// Application Settings
define('APP_NAME', 'DriveNow');
define('APP_URL', 'http://localhost');
define('SUPPORT_EMAIL', 'support@drivenow.com');

// Security Settings
define('SESSION_LIFETIME', 3600); // 1 hour
define('PASSWORD_MIN_LENGTH', 8);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900); // 15 minutes

// Cache Settings
define('CACHE_ENABLED', false);
define('CACHE_LIFETIME', 3600); // 1 hour

// Database connection function
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        return null;
    }
}

/**
 * Helper function to sanitize output
 */
function sanitizeOutput($data, $encoding = 'UTF-8') {
    if (is_array($data)) {
        return array_map('sanitizeOutput', $data);
    }
    return htmlspecialchars($data, ENT_QUOTES | ENT_XML1, $encoding);
}

/**
 * Helper function to validate email
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Helper function to generate random string
 */
function generateRandomString($length = 16) {
    return bin2hex(random_bytes($length / 2));
}

/**
 * Helper function to log errors
 */
function logError($message, $context = []) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    if (!empty($context)) {
        $logMessage .= " - Context: " . json_encode($context);
    }
    error_log($logMessage . PHP_EOL, 3, __DIR__ . '/logs/error.log');
}

/**
 * Helper function to send JSON response
 */
function sendJSONResponse($success, $message, $data = [], $httpCode = 200) {
    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_PRETTY_PRINT);
    exit;
}

/**
 * Helper function to send XML response
 */
function sendXMLResponse($success, $message, $data = [], $httpCode = 200) {
    http_response_code($httpCode);
    header('Content-Type: application/xml; charset=utf-8');
    
    $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><response></response>');
    $xml->addChild('success', $success ? 'true' : 'false');
    $xml->addChild('message', htmlspecialchars($message, ENT_XML1));
    
    if (!empty($data)) {
        $dataNode = $xml->addChild('data');
        arrayToXML($data, $dataNode);
    }
    
    echo $xml->asXML();
    exit;
}

/**
 * Convert array to XML recursively
 */
function arrayToXML($array, &$xml) {
    foreach ($array as $key => $value) {
        if (is_numeric($key)) {
            $key = 'item';
        }
        
        if (is_array($value)) {
            $subNode = $xml->addChild($key);
            arrayToXML($value, $subNode);
        } else {
            $xml->addChild($key, htmlspecialchars($value, ENT_XML1));
        }
    }
}

/**
 * CORS headers setup
 */
function setupCORS() {
    header('Access-Control-Allow-Origin: ' . CORS_ALLOWED_ORIGINS);
    header('Access-Control-Allow-Methods: ' . CORS_ALLOWED_METHODS);
    header('Access-Control-Allow-Headers: ' . CORS_ALLOWED_HEADERS);
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
?>