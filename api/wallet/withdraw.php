<?php
/**
 * Withdrawal Request API
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

// Database connection
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}

// Validate session
$user = validateSession($conn);

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['currency']) || !isset($data['amount']) || !isset($data['wallet_address'])) {
    sendResponse(HTTP_BAD_REQUEST, [], 'Currency, amount, and wallet address are required');
}

$currency = strtoupper(trim($data['currency']));
$amount = (float)$data['amount'];
$wallet_address = trim($data['wallet_address']);

// Validate currency
if (!in_array($currency, WITHDRAWAL_CURRENCIES)) {
    sendResponse(HTTP_BAD_REQUEST, [], 'Only USDT and TRX withdrawals are supported');
}

// Validate minimum withdrawal
if ($amount < MIN_WITHDRAWAL) {
    sendResponse(HTTP_BAD_REQUEST, [], 'Minimum withdrawal amount is $' . MIN_WITHDRAWAL);
}

// Check if today is Saturday for ROI withdrawals
$today = date('l');
$is_saturday = ($today === 'Saturday');

try {
    // Get user's wallet
    $stmt = $conn->prepare("SELECT balance, roi_balance FROM wallets WHERE user_id = ? AND currency = ?");
    $stmt->bind_param("is", $user['id'], $currency);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(HTTP_BAD_REQUEST, [], 'Wallet not found');
    }
    
    $wallet = $result->fetch_assoc();
    
    // Check if user has sufficient balance
    if ($amount > $wallet['balance']) {
        sendResponse(HTTP_BAD_REQUEST, [], 'Insufficient balance');
    }
    
    // Check ROI withdrawal day restriction
    if ($wallet['roi_balance'] > 0 && !$is_saturday) {
        sendResponse(HTTP_BAD_REQUEST, [], 'ROI withdrawals are only allowed on Saturdays');
    }
    
    // Calculate fee
    $fee = ($amount * WITHDRAWAL_FEE_PERCENT) / 100;
    $net_amount = $amount - $fee;
    
    // Start transaction
    $conn->begin_transaction();
    
    // Create withdrawal request
    $stmt = $conn->prepare("INSERT INTO withdrawal_requests (user_id, currency, amount, fee, net_amount, wallet_address, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')");
    $stmt->bind_param("isddds", $user['id'], $currency, $amount, $fee, $net_amount, $wallet_address);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to create withdrawal request');
    }
    
    $withdrawal_id = $conn->insert_id;
    
    // Deduct from wallet balance
    $stmt = $conn->prepare("UPDATE wallets SET balance = balance - ? WHERE user_id = ? AND currency = ?");
    $stmt->bind_param("dis", $amount, $user['id'], $currency);
    $stmt->execute();
    
    // Create transaction record
    $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, currency, amount, fee, net_amount, status, reference_id, wallet_address) VALUES (?, 'withdrawal', ?, ?, ?, ?, 'pending', ?, ?)");
    $stmt->bind_param("isdddis", $user['id'], $currency, $amount, $fee, $net_amount, $withdrawal_id, $wallet_address);
    $stmt->execute();
    
    // Log activity
    logActivity($conn, $user['id'], 'withdrawal_requested', 'withdrawal', $withdrawal_id, [
        'currency' => $currency,
        'amount' => $amount,
        'fee' => $fee
    ]);
    
    // Commit transaction
    $conn->commit();
    
    sendResponse(HTTP_CREATED, [
        'withdrawal_id' => $withdrawal_id,
        'amount' => $amount,
        'fee' => $fee,
        'net_amount' => $net_amount,
        'currency' => $currency,
        'status' => 'pending'
    ], SUCCESS_WITHDRAWAL);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("Withdrawal error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}
?>
