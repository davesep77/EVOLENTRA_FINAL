<?php
/**
 * Get Binary Tree Data API
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
    // Get user's binary tree data
    $stmt = $conn->prepare("
        SELECT 
            bt.user_id,
            bt.parent_id,
            bt.position,
            bt.left_child_id,
            bt.right_child_id,
            bt.left_volume,
            bt.right_volume,
            bt.left_carry_forward,
            bt.right_carry_forward,
            bt.total_matched,
            u.first_name,
            u.last_name,
            u.email
        FROM binary_tree bt
        JOIN users u ON bt.user_id = u.id
        WHERE bt.user_id = ?
    ");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(HTTP_NOT_FOUND, [], 'Binary tree data not found');
    }
    
    $tree_data = $result->fetch_assoc();
    
    // Get left child info
    $left_child = null;
    if ($tree_data['left_child_id']) {
        $left_child = getUserInfo($conn, $tree_data['left_child_id']);
    }
    
    // Get right child info
    $right_child = null;
    if ($tree_data['right_child_id']) {
        $right_child = getUserInfo($conn, $tree_data['right_child_id']);
    }
    
    // Get binary commission history
    $stmt = $conn->prepare("
        SELECT 
            left_volume,
            right_volume,
            matched_volume,
            commission_amount,
            left_carry_forward,
            right_carry_forward,
            created_at
        FROM binary_commissions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 10
    ");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $commission_history = [];
    while ($row = $result->fetch_assoc()) {
        $commission_history[] = [
            'left_volume' => (float)$row['left_volume'],
            'right_volume' => (float)$row['right_volume'],
            'matched_volume' => (float)$row['matched_volume'],
            'commission_amount' => (float)$row['commission_amount'],
            'left_carry_forward' => (float)$row['left_carry_forward'],
            'right_carry_forward' => (float)$row['right_carry_forward'],
            'created_at' => $row['created_at']
        ];
    }
    
    sendResponse(HTTP_OK, [
        'tree' => [
            'left_volume' => (float)$tree_data['left_volume'],
            'right_volume' => (float)$tree_data['right_volume'],
            'left_carry_forward' => (float)$tree_data['left_carry_forward'],
            'right_carry_forward' => (float)$tree_data['right_carry_forward'],
            'total_matched' => (float)$tree_data['total_matched'],
            'left_child' => $left_child,
            'right_child' => $right_child
        ],
        'commission_history' => $commission_history
    ], 'Binary tree data retrieved successfully');
    
} catch (Exception $e) {
    error_log("Get binary tree error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}

function getUserInfo($conn, $user_id) {
    $stmt = $conn->prepare("SELECT first_name, last_name, email FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        return null;
    }
    
    $user = $result->fetch_assoc();
    return [
        'id' => $user_id,
        'name' => $user['first_name'] . ' ' . $user['last_name'],
        'email' => $user['email']
    ];
}
?>
