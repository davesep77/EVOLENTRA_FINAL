<?php
/**
 * Admin - Manage Withdrawal Requests API
 * Evolentra Platform
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../config/constants.php';

// Database connection
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}

// Validate session and require admin
$user = validateSession($conn);
requireAdmin($user);

// Handle GET request - List withdrawals
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $status = isset($_GET['status']) ? $_GET['status'] : 'pending';
        
        $stmt = $conn->prepare("
            SELECT 
                wr.id,
                wr.user_id,
                wr.currency,
                wr.amount,
                wr.fee,
                wr.net_amount,
                wr.wallet_address,
                wr.status,
                wr.admin_notes,
                wr.created_at,
                u.email,
                u.first_name,
                u.last_name
            FROM withdrawal_requests wr
            JOIN users u ON wr.user_id = u.id
            WHERE wr.status = ?
            ORDER BY wr.created_at DESC
        ");
        $stmt->bind_param("s", $status);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $withdrawals = [];
        while ($row = $result->fetch_assoc()) {
            $withdrawals[] = [
                'id' => (int)$row['id'],
                'user' => [
                    'id' => (int)$row['user_id'],
                    'email' => $row['email'],
                    'name' => $row['first_name'] . ' ' . $row['last_name']
                ],
                'currency' => $row['currency'],
                'amount' => (float)$row['amount'],
                'fee' => (float)$row['fee'],
                'net_amount' => (float)$row['net_amount'],
                'wallet_address' => $row['wallet_address'],
                'status' => $row['status'],
                'admin_notes' => $row['admin_notes'],
                'created_at' => $row['created_at']
            ];
        }
        
        sendResponse(HTTP_OK, ['withdrawals' => $withdrawals], 'Withdrawals retrieved successfully');
        
    } catch (Exception $e) {
        error_log("Get withdrawals error: " . $e->getMessage());
        sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
    }
}

// Handle POST request - Approve/Reject withdrawal
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['withdrawal_id']) || !isset($data['action'])) {
        sendResponse(HTTP_BAD_REQUEST, [], 'Withdrawal ID and action are required');
    }
    
    $withdrawal_id = (int)$data['withdrawal_id'];
    $action = $data['action']; // 'approve' or 'reject'
    $admin_notes = isset($data['admin_notes']) ? trim($data['admin_notes']) : null;
    
    if (!in_array($action, ['approve', 'reject'])) {
        sendResponse(HTTP_BAD_REQUEST, [], 'Invalid action');
    }
    
    try {
        // Get withdrawal details
        $stmt = $conn->prepare("SELECT * FROM withdrawal_requests WHERE id = ?");
        $stmt->bind_param("i", $withdrawal_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendResponse(HTTP_NOT_FOUND, [], 'Withdrawal request not found');
        }
        
        $withdrawal = $result->fetch_assoc();
        
        if ($withdrawal['status'] !== 'pending') {
            sendResponse(HTTP_BAD_REQUEST, [], 'Withdrawal request already processed');
        }
        
        $conn->begin_transaction();
        
        if ($action === 'approve') {
            // Update withdrawal status
            $stmt = $conn->prepare("UPDATE withdrawal_requests SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, admin_notes = ? WHERE id = ?");
            $stmt->bind_param("isi", $user['id'], $admin_notes, $withdrawal_id);
            $stmt->execute();
            
            // Update transaction status
            $stmt = $conn->prepare("UPDATE transactions SET status = 'completed' WHERE reference_id = ? AND type = 'withdrawal'");
            $stmt->bind_param("i", $withdrawal_id);
            $stmt->execute();
            
            // Update wallet total withdrawn
            $stmt = $conn->prepare("UPDATE wallets SET total_withdrawn = total_withdrawn + ? WHERE user_id = ? AND currency = ?");
            $stmt->bind_param("dis", $withdrawal['amount'], $withdrawal['user_id'], $withdrawal['currency']);
            $stmt->execute();
            
            $message = 'Withdrawal approved successfully';
            
        } else {
            // Reject - refund to wallet
            $stmt = $conn->prepare("UPDATE withdrawal_requests SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP, admin_notes = ? WHERE id = ?");
            $stmt->bind_param("isi", $user['id'], $admin_notes, $withdrawal_id);
            $stmt->execute();
            
            // Refund to wallet
            $stmt = $conn->prepare("UPDATE wallets SET balance = balance + ? WHERE user_id = ? AND currency = ?");
            $stmt->bind_param("dis", $withdrawal['amount'], $withdrawal['user_id'], $withdrawal['currency']);
            $stmt->execute();
            
            // Update transaction status
            $stmt = $conn->prepare("UPDATE transactions SET status = 'cancelled' WHERE reference_id = ? AND type = 'withdrawal'");
            $stmt->bind_param("i", $withdrawal_id);
            $stmt->execute();
            
            $message = 'Withdrawal rejected and funds refunded';
        }
        
        // Log activity
        logActivity($conn, $user['id'], 'withdrawal_' . $action, 'withdrawal', $withdrawal_id, [
            'user_id' => $withdrawal['user_id'],
            'amount' => $withdrawal['amount'],
            'notes' => $admin_notes
        ]);
        
        $conn->commit();
        
        sendResponse(HTTP_OK, [], $message);
        
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Process withdrawal error: " . $e->getMessage());
        sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
    }
}
?>
