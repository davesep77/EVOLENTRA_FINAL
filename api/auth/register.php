<?php
/**
 * User Registration API
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
$required = ['email', 'password', 'first_name', 'last_name'];
foreach ($required as $field) {
    if (!isset($data[$field]) || empty(trim($data[$field]))) {
        sendResponse(HTTP_BAD_REQUEST, [], "Field '$field' is required");
    }
}

$email = trim($data['email']);
$password = $data['password'];
$first_name = trim($data['first_name']);
$last_name = trim($data['last_name']);
$phone = isset($data['phone']) ? trim($data['phone']) : null;
$referral_code = isset($data['referral_code']) ? trim($data['referral_code']) : null;

// Validate email
if (!validateEmail($email)) {
    sendResponse(HTTP_BAD_REQUEST, [], 'Invalid email format');
}

// Validate password
if (!validatePassword($password)) {
    sendResponse(HTTP_BAD_REQUEST, [], 'Password must be at least 8 characters with uppercase, lowercase, and number');
}

// Database connection
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}

try {
    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        sendResponse(HTTP_BAD_REQUEST, [], 'Email already registered');
    }
    
    // Validate referral code if provided
    $referrer_id = null;
    if ($referral_code && !empty($referral_code)) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE referral_code = ? AND status = 'active'");
        $stmt->bind_param("s", $referral_code);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendResponse(HTTP_BAD_REQUEST, [], 'Invalid referral code. Please check and try again, or leave it empty to register without a referrer.');
        }
        
        $referrer = $result->fetch_assoc();
        $referrer_id = $referrer['id'];
    }
    
    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    
    // Generate unique referral code
    $user_referral_code = generateReferralCode($conn);
    
    // Start transaction
    $conn->begin_transaction();
    
    // Insert user
    $stmt = $conn->prepare("INSERT INTO users (email, password_hash, first_name, last_name, phone, referrer_id, referral_code, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'investor', 'active')");
    $stmt->bind_param("sssssis", $email, $password_hash, $first_name, $last_name, $phone, $referrer_id, $user_referral_code);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to create user account');
    }
    
    $user_id = $conn->insert_id;
    
    // Create binary tree entry
    $parent_id = null;
    $position = null;
    
    if ($referrer_id) {
        // Find placement in binary tree
        $placement = findBinaryPlacement($conn, $referrer_id);
        $parent_id = $placement['parent_id'];
        $position = $placement['position'];
        
        // Update parent's child reference
        if ($position === 'left') {
            $stmt = $conn->prepare("UPDATE binary_tree SET left_child_id = ? WHERE user_id = ?");
        } else {
            $stmt = $conn->prepare("UPDATE binary_tree SET right_child_id = ? WHERE user_id = ?");
        }
        $stmt->bind_param("ii", $user_id, $parent_id);
        $stmt->execute();
    }
    
    // Insert into binary tree
    $stmt = $conn->prepare("INSERT INTO binary_tree (user_id, parent_id, position) VALUES (?, ?, ?)");
    $stmt->bind_param("iis", $user_id, $parent_id, $position);
    $stmt->execute();
    
    // Create default wallets
    $currencies = DEPOSIT_CURRENCIES;
    foreach ($currencies as $currency) {
        $stmt = $conn->prepare("INSERT INTO wallets (user_id, currency) VALUES (?, ?)");
        $stmt->bind_param("is", $user_id, $currency);
        $stmt->execute();
    }
    
    // Log activity
    logActivity($conn, $user_id, 'user_registered', 'user', $user_id, [
        'referrer_id' => $referrer_id,
        'referral_code' => $referral_code
    ]);
    
    // Commit transaction
    $conn->commit();
    
    // Return success
    sendResponse(HTTP_CREATED, [
        'user_id' => $user_id,
        'email' => $email,
        'referral_code' => $user_referral_code
    ], SUCCESS_REGISTER);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("Registration error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}

/**
 * Find placement in binary tree
 */
function findBinaryPlacement($conn, $referrer_id) {
    // Get referrer's binary tree info
    $stmt = $conn->prepare("SELECT user_id, left_child_id, right_child_id FROM binary_tree WHERE user_id = ?");
    $stmt->bind_param("i", $referrer_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        return ['parent_id' => $referrer_id, 'position' => 'left'];
    }
    
    $node = $result->fetch_assoc();
    
    // Check left position
    if ($node['left_child_id'] === null) {
        return ['parent_id' => $referrer_id, 'position' => 'left'];
    }
    
    // Check right position
    if ($node['right_child_id'] === null) {
        return ['parent_id' => $referrer_id, 'position' => 'right'];
    }
    
    // Both positions filled, find next available position in left subtree
    return findNextAvailablePosition($conn, $node['left_child_id']);
}

/**
 * Find next available position recursively
 */
function findNextAvailablePosition($conn, $parent_id) {
    $stmt = $conn->prepare("SELECT user_id, left_child_id, right_child_id FROM binary_tree WHERE user_id = ?");
    $stmt->bind_param("i", $parent_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $node = $result->fetch_assoc();
    
    if ($node['left_child_id'] === null) {
        return ['parent_id' => $parent_id, 'position' => 'left'];
    }
    
    if ($node['right_child_id'] === null) {
        return ['parent_id' => $parent_id, 'position' => 'right'];
    }
    
    // Recursively check left subtree
    return findNextAvailablePosition($conn, $node['left_child_id']);
}
?>
