<?php
/**
 * Get User Investments API
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
    // Get user's investments
    $stmt = $conn->prepare("
        SELECT 
            i.id,
            i.amount,
            i.roi_rate,
            i.total_roi_earned,
            i.total_roi_withdrawn,
            i.start_date,
            i.end_date,
            i.days_elapsed,
            i.status,
            i.capital_returned,
            i.created_at,
            p.name as plan_name,
            p.duration_days
        FROM investments i
        JOIN investment_plans p ON i.plan_id = p.id
        WHERE i.user_id = ?
        ORDER BY i.created_at DESC
    ");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $investments = [];
    while ($row = $result->fetch_assoc()) {
        $investments[] = [
            'id' => (int)$row['id'],
            'plan_name' => $row['plan_name'],
            'amount' => (float)$row['amount'],
            'roi_rate' => (float)$row['roi_rate'],
            'total_roi_earned' => (float)$row['total_roi_earned'],
            'total_roi_withdrawn' => (float)$row['total_roi_withdrawn'],
            'roi_available' => (float)($row['total_roi_earned'] - $row['total_roi_withdrawn']),
            'start_date' => $row['start_date'],
            'end_date' => $row['end_date'],
            'days_elapsed' => (int)$row['days_elapsed'],
            'days_remaining' => max(0, (int)$row['duration_days'] - (int)$row['days_elapsed']),
            'status' => $row['status'],
            'capital_returned' => (bool)$row['capital_returned'],
            'created_at' => $row['created_at']
        ];
    }
    
    sendResponse(HTTP_OK, ['investments' => $investments], 'Investments retrieved successfully');
    
} catch (Exception $e) {
    error_log("Get investments error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}
?>
