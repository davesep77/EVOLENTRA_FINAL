<?php
/**
 * Get Wallet Balance API
 * Evolentra Platform
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../config/constants.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(HTTP_BAD_REQUEST, [], 'Invalid request method');
}

// Database connection
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}

// Validate session
$user = validateSession($conn);

try {
    // Get all wallets for user
    $stmt = $conn->prepare("
        SELECT 
            currency,
            wallet_address,
            balance,
            roi_balance,
            referral_balance,
            binary_balance,
            total_deposited,
            total_withdrawn
        FROM wallets
        WHERE user_id = ?
        ORDER BY currency ASC
    ");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $wallets = [];
    $total_balance = 0;
    
    while ($row = $result->fetch_assoc()) {
        $wallets[] = [
            'currency' => $row['currency'],
            'wallet_address' => $row['wallet_address'],
            'balance' => (float)$row['balance'],
            'roi_balance' => (float)$row['roi_balance'],
            'referral_balance' => (float)$row['referral_balance'],
            'binary_balance' => (float)$row['binary_balance'],
            'total_deposited' => (float)$row['total_deposited'],
            'total_withdrawn' => (float)$row['total_withdrawn']
        ];
        
        $total_balance += (float)$row['balance'];
    }
    
    sendResponse(HTTP_OK, [
        'wallets' => $wallets,
        'total_balance' => $total_balance
    ], 'Wallet balances retrieved successfully');
    
} catch (Exception $e) {
    error_log("Get wallet error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}
?>
