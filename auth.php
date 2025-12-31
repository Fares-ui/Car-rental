<?php
/**
 * Authentication API
 * Handles login, logout, and session management
 */

session_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        checkSession();
        break;
    default:
        sendResponse(false, 'Invalid action', 400);
}

/**
 * Handle login request
 */
function handleLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(false, 'Only POST method allowed', 405);
        return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $username = isset($data['username']) ? trim($data['username']) : '';
    $password = isset($data['password']) ? trim($data['password']) : '';
    
    if (empty($username) || empty($password)) {
        sendResponse(false, 'Username and password required', 400);
        return;
    }
    
    // Get database connection
    $pdo = getDBConnection();
    
    if (!$pdo) {
        sendResponse(false, 'Database connection failed', 500);
        return;
    }
    
    try {
        // Check if user exists
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username AND status = 'active'");
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            // Password is correct
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['login_time'] = time();
            
            // Update last login
            $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
            $updateStmt->execute([':id' => $user['id']]);
            
            // Create session record
            $sessionId = session_id();
            $ipAddress = $_SERVER['REMOTE_ADDR'];
            $userAgent = $_SERVER['HTTP_USER_AGENT'];
            
            $sessionStmt = $pdo->prepare("
                INSERT INTO sessions (session_id, user_id, ip_address, user_agent) 
                VALUES (:session_id, :user_id, :ip_address, :user_agent)
                ON DUPLICATE KEY UPDATE last_activity = CURRENT_TIMESTAMP
            ");
            $sessionStmt->execute([
                ':session_id' => $sessionId,
                ':user_id' => $user['id'],
                ':ip_address' => $ipAddress,
                ':user_agent' => $userAgent
            ]);
            
            sendResponse(true, 'Login successful', 200, [
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ]
            ]);
        } else {
            // Invalid credentials
            sendResponse(false, 'Invalid username or password', 401);
        }
        
    } catch (PDOException $e) {
        error_log("Login error: " . $e->getMessage());
        sendResponse(false, 'Login failed', 500);
    }
}

/**
 * Handle logout request
 */
function handleLogout() {
    if (isset($_SESSION['user_id'])) {
        $pdo = getDBConnection();
        
        if ($pdo) {
            try {
                // Delete session from database
                $stmt = $pdo->prepare("DELETE FROM sessions WHERE session_id = :session_id");
                $stmt->execute([':session_id' => session_id()]);
            } catch (PDOException $e) {
                error_log("Logout error: " . $e->getMessage());
            }
        }
    }
    
    // Destroy session
    session_unset();
    session_destroy();
    
    sendResponse(true, 'Logout successful', 200);
}

/**
 * Check if user is logged in
 */
function checkSession() {
    if (isset($_SESSION['user_id'])) {
        sendResponse(true, 'Session active', 200, [
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'email' => $_SESSION['email'],
                'role' => $_SESSION['role']
            ]
        ]);
    } else {
        sendResponse(false, 'No active session', 401);
    }
}

/**
 * Send JSON response
 */
function sendResponse($success, $message, $httpCode = 200, $data = []) {
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}
?>