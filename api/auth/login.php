<?php
/**
 * User Login API
 * Evolentra Platform
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../config/constants.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(HTTP_BAD_REQUEST, [], 'Invalid request method');
}

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (!isset($data['email']) || !isset($data['password'])) {
    sendResponse(HTTP_BAD_REQUEST, [], 'Email and password are required');
}

$email = trim($data['email']);
$password = $data['password'];

// Database connection
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}

try {
    // Get user by email
    $stmt = $conn->prepare("SELECT id, email, password_hash, first_name, last_name, role, status FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(HTTP_UNAUTHORIZED, [], 'Invalid email or password');
    }
    
    $user = $result->fetch_assoc();
    
    // Check if user is active
    if ($user['status'] !== 'active') {
        sendResponse(HTTP_FORBIDDEN, [], 'Account is suspended or inactive');
    }
    
    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        sendResponse(HTTP_UNAUTHORIZED, [], 'Invalid email or password');
    }
    
    // Start session
    session_start();
    
    // Generate session ID
    $session_id = session_id();
    
    // Store session in database
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    $stmt = $conn->prepare("INSERT INTO sessions (id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE last_activity = CURRENT_TIMESTAMP, ip_address = ?, user_agent = ?");
    $stmt->bind_param("sissss", $session_id, $user['id'], $ip, $user_agent, $ip, $user_agent);
    $stmt->execute();
    
    // Update last login
    $stmt = $conn->prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    
    // Set session variables
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role'] = $user['role'];
    
    // Log activity
    logActivity($conn, $user['id'], 'user_login', 'user', $user['id']);
    
    // Return user data
    sendResponse(HTTP_OK, [
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'role' => $user['role']
        ],
        'session_id' => $session_id
    ], SUCCESS_LOGIN);
    
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}
?>
