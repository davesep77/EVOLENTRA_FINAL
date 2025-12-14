<?php
/**
 * Create Investment API
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

if (!isset($data['plan_id']) || !isset($data['amount'])) {
    sendResponse(HTTP_BAD_REQUEST, [], 'Plan ID and amount are required');
}

$plan_id = (int)$data['plan_id'];
$amount = (float)$data['amount'];

try {
    // Get plan details
    $stmt = $conn->prepare("SELECT * FROM investment_plans WHERE id = ? AND status = 'active'");
    $stmt->bind_param("i", $plan_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(HTTP_BAD_REQUEST, [], 'Invalid investment plan');
    }
    
    $plan = $result->fetch_assoc();
    
    // Validate amount
    if ($amount < $plan['min_amount'] || $amount > $plan['max_amount']) {
        sendResponse(HTTP_BAD_REQUEST, [], "Investment amount must be between $" . $plan['min_amount'] . " and $" . $plan['max_amount']);
    }
    
    // Calculate ROI rate (use average if range)
    $roi_rate = ($plan['roi_rate_min'] + $plan['roi_rate_max']) / 2;
    
    // Calculate dates
    $start_date = date('Y-m-d');
    $end_date = date('Y-m-d', strtotime("+{$plan['duration_days']} days"));
    
    // Start transaction
    $conn->begin_transaction();
    
    // Create investment
    $stmt = $conn->prepare("INSERT INTO investments (user_id, plan_id, amount, roi_rate, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
    $stmt->bind_param("iidsss", $user['id'], $plan_id, $amount, $roi_rate, $start_date, $end_date);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to create investment');
    }
    
    $investment_id = $conn->insert_id;
    
    // AUTOMATIC WALLET CREDITING: Credit investment amount to user's wallet
    $stmt = $conn->prepare("UPDATE wallets SET balance = balance + ?, total_deposited = total_deposited + ? WHERE user_id = ? AND currency = 'USDT'");
    $stmt->bind_param("ddi", $amount, $amount, $user['id']);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to credit wallet');
    }
    
    // Create deposit transaction record
    $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, currency, amount, net_amount, status, reference_id, notes) VALUES (?, 'deposit', 'USDT', ?, ?, 'completed', ?, 'Automatic wallet credit for investment')");
    $stmt->bind_param("iddi", $user['id'], $amount, $amount, $investment_id);
    $stmt->execute();
    
    // Process referral commission if user has referrer
    $stmt = $conn->prepare("SELECT referrer_id FROM users WHERE id = ?");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $user_data = $result->fetch_assoc();
    
    if ($user_data['referrer_id']) {
        $referrer_id = $user_data['referrer_id'];
        $commission_rate = $plan['referral_commission'];
        $commission_amount = ($amount * $commission_rate) / 100;
        
        // Insert referral commission
        $stmt = $conn->prepare("INSERT INTO referral_commissions (referrer_id, referred_id, investment_id, investment_amount, commission_rate, commission_amount, status) VALUES (?, ?, ?, ?, ?, ?, 'paid')");
        $stmt->bind_param("iiiddd", $referrer_id, $user['id'], $investment_id, $amount, $commission_rate, $commission_amount);
        $stmt->execute();
        
        // Update referrer's wallet
        $stmt = $conn->prepare("UPDATE wallets SET referral_balance = referral_balance + ?, balance = balance + ? WHERE user_id = ? AND currency = 'USDT'");
        $stmt->bind_param("ddi", $commission_amount, $commission_amount, $referrer_id);
        $stmt->execute();
        
        // Create transaction record
        $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, currency, amount, net_amount, status, reference_id) VALUES (?, 'referral_commission', 'USDT', ?, ?, 'completed', ?)");
        $stmt->bind_param("iddi", $referrer_id, $commission_amount, $commission_amount, $investment_id);
        $stmt->execute();
    }
    
    // Update binary tree volumes
    updateBinaryVolumes($conn, $user['id'], $amount);
    
    // Create investment transaction
    $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, currency, amount, net_amount, status, reference_id) VALUES (?, 'investment', 'USDT', ?, ?, 'completed', ?)");
    $stmt->bind_param("iddi", $user['id'], $amount, $amount, $investment_id);
    $stmt->execute();
    
    // Log activity
    logActivity($conn, $user['id'], 'investment_created', 'investment', $investment_id, [
        'plan' => $plan['name'],
        'amount' => $amount
    ]);
    
    // Commit transaction
    $conn->commit();
    
    sendResponse(HTTP_CREATED, [
        'investment_id' => $investment_id,
        'amount' => $amount,
        'plan' => $plan['name'],
        'roi_rate' => $roi_rate,
        'start_date' => $start_date,
        'end_date' => $end_date
    ], SUCCESS_INVESTMENT);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("Create investment error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}

/**
 * Update binary tree volumes
 */
function updateBinaryVolumes($conn, $user_id, $amount) {
    // Get user's position in binary tree
    $stmt = $conn->prepare("SELECT parent_id, position FROM binary_tree WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        return;
    }
    
    $node = $result->fetch_assoc();
    $current_parent = $node['parent_id'];
    $position = $node['position'];
    
    // Traverse up the tree and update volumes
    while ($current_parent !== null) {
        if ($position === 'left') {
            $stmt = $conn->prepare("UPDATE binary_tree SET left_volume = left_volume + ? WHERE user_id = ?");
        } else {
            $stmt = $conn->prepare("UPDATE binary_tree SET right_volume = right_volume + ? WHERE user_id = ?");
        }
        $stmt->bind_param("di", $amount, $current_parent);
        $stmt->execute();
        
        // Process binary matching for this parent
        processBinaryMatching($conn, $current_parent);
        
        // Get next parent
        $stmt = $conn->prepare("SELECT parent_id, position FROM binary_tree WHERE user_id = ?");
        $stmt->bind_param("i", $current_parent);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            break;
        }
        
        $parent_node = $result->fetch_assoc();
        $current_parent = $parent_node['parent_id'];
        $position = $parent_node['position'];
    }
}

/**
 * Process binary matching
 */
function processBinaryMatching($conn, $user_id) {
    // Get current volumes
    $stmt = $conn->prepare("SELECT left_volume, right_volume, left_carry_forward, right_carry_forward FROM binary_tree WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $tree = $result->fetch_assoc();
    
    $left_total = $tree['left_volume'] + $tree['left_carry_forward'];
    $right_total = $tree['right_volume'] + $tree['right_carry_forward'];
    
    // Calculate matched volume (1:1 ratio)
    $matched_volume = min($left_total, $right_total);
    
    if ($matched_volume > 0) {
        // Calculate commission (10%)
        $commission_rate = BINARY_COMMISSION_RATE;
        $commission_amount = ($matched_volume * $commission_rate) / 100;
        
        // Calculate carry forward
        $new_left_carry = max(0, $left_total - $matched_volume);
        $new_right_carry = max(0, $right_total - $matched_volume);
        
        // Insert binary commission
        $stmt = $conn->prepare("INSERT INTO binary_commissions (user_id, left_volume, right_volume, matched_volume, commission_rate, commission_amount, left_carry_forward, right_carry_forward, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid')");
        $stmt->bind_param("iddddddd", $user_id, $left_total, $right_total, $matched_volume, $commission_rate, $commission_amount, $new_left_carry, $new_right_carry);
        $stmt->execute();
        
        // Update user's wallet
        $stmt = $conn->prepare("UPDATE wallets SET binary_balance = binary_balance + ?, balance = balance + ? WHERE user_id = ? AND currency = 'USDT'");
        $stmt->bind_param("ddi", $commission_amount, $commission_amount, $user_id);
        $stmt->execute();
        
        // Create transaction record
        $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, currency, amount, net_amount, status) VALUES (?, 'binary_commission', 'USDT', ?, ?, 'completed')");
        $stmt->bind_param("idd", $user_id, $commission_amount, $commission_amount);
        $stmt->execute();
        
        // Update binary tree with new carry forward and reset volumes
        $stmt = $conn->prepare("UPDATE binary_tree SET left_volume = 0, right_volume = 0, left_carry_forward = ?, right_carry_forward = ?, total_matched = total_matched + ? WHERE user_id = ?");
        $stmt->bind_param("dddi", $new_left_carry, $new_right_carry, $matched_volume, $user_id);
        $stmt->execute();
    }
}
?>
