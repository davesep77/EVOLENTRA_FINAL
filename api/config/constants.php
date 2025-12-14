<?php
/**
 * System Constants
 * Evolentra Platform
 */

// Withdrawal settings
define('MIN_WITHDRAWAL', 15.00);
define('WITHDRAWAL_FEE_PERCENT', 7.00);
define('ROI_WITHDRAWAL_DAY', 'Saturday');

// Supported cryptocurrencies
define('DEPOSIT_CURRENCIES', ['BTC', 'ETH', 'USDT', 'TRX', 'XRP']);
define('WITHDRAWAL_CURRENCIES', ['USDT', 'TRX']);

// Binary settings
define('BINARY_COMMISSION_RATE', 10.00);
define('BINARY_MATCHING_RATIO', 1); // 1:1 matching

// Investment settings
define('INVESTMENT_DURATION_DAYS', 250);
define('ROI_ACCRUAL_FREQUENCY', 'daily'); // Daily ROI accrual

// Session settings
define('SESSION_LIFETIME', 86400); // 24 hours in seconds

// API Response codes
define('HTTP_OK', 200);
define('HTTP_CREATED', 201);
define('HTTP_BAD_REQUEST', 400);
define('HTTP_UNAUTHORIZED', 401);
define('HTTP_FORBIDDEN', 403);
define('HTTP_NOT_FOUND', 404);
define('HTTP_INTERNAL_ERROR', 500);

// Error messages
define('ERROR_UNAUTHORIZED', 'Unauthorized access');
define('ERROR_INVALID_INPUT', 'Invalid input data');
define('ERROR_NOT_FOUND', 'Resource not found');
define('ERROR_SERVER', 'Internal server error');

// Success messages
define('SUCCESS_LOGIN', 'Login successful');
define('SUCCESS_REGISTER', 'Registration successful');
define('SUCCESS_INVESTMENT', 'Investment created successfully');
define('SUCCESS_WITHDRAWAL', 'Withdrawal request submitted');

/**
 * Send JSON response
 */
function sendResponse($status, $data = [], $message = '') {
    http_response_code($status);
    header('Content-Type: application/json');
    
    $response = [
        'success' => ($status >= 200 && $status < 300),
        'message' => $message,
        'data' => $data
    ];
    
    echo json_encode($response);
    exit;
}

/**
 * Get request headers
 */
function getRequestHeaders() {
    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (substr($key, 0, 5) == 'HTTP_') {
            $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
            $headers[$header] = $value;
        }
    }
    return $headers;
}

/**
 * Get authorization token from header
 */
function getAuthToken() {
    $headers = getRequestHeaders();
    
    if (isset($headers['Authorization'])) {
        $auth = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }
    }
    
    return null;
}

/**
 * Validate session and get user
 */
function validateSession($conn) {
    session_start();
    
    if (!isset($_SESSION['user_id'])) {
        sendResponse(HTTP_UNAUTHORIZED, [], ERROR_UNAUTHORIZED);
    }
    
    $user_id = $_SESSION['user_id'];
    
    // Verify user exists and is active
    $stmt = $conn->prepare("SELECT id, email, first_name, last_name, role, status FROM users WHERE id = ? AND status = 'active'");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        session_destroy();
        sendResponse(HTTP_UNAUTHORIZED, [], ERROR_UNAUTHORIZED);
    }
    
    return $result->fetch_assoc();
}

/**
 * Require admin role
 */
function requireAdmin($user) {
    if ($user['role'] !== 'admin') {
        sendResponse(HTTP_FORBIDDEN, [], 'Admin access required');
    }
}

/**
 * Log activity
 */
function logActivity($conn, $user_id, $action, $entity_type = null, $entity_id = null, $details = null) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    $details_json = $details ? json_encode($details) : null;
    
    $stmt = $conn->prepare("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("issssss", $user_id, $action, $entity_type, $entity_id, $ip, $user_agent, $details_json);
    $stmt->execute();
}

/**
 * Generate unique referral code
 */
function generateReferralCode($conn) {
    do {
        $code = 'EVO' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));
        $stmt = $conn->prepare("SELECT id FROM users WHERE referral_code = ?");
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();
    } while ($result->num_rows > 0);
    
    return $code;
}

/**
 * Validate email format
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate password strength
 */
function validatePassword($password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    return strlen($password) >= 8 && 
           preg_match('/[A-Z]/', $password) && 
           preg_match('/[a-z]/', $password) && 
           preg_match('/[0-9]/', $password);
}
?>
