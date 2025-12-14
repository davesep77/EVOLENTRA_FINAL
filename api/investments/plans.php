<?php
/**
 * Get Investment Plans API
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

try {
    // Get all active investment plans
    $stmt = $conn->prepare("SELECT id, name, min_amount, max_amount, roi_rate_min, roi_rate_max, referral_commission, binary_commission, duration_days, capital_return FROM investment_plans WHERE status = 'active' ORDER BY min_amount ASC");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $plans = [];
    while ($row = $result->fetch_assoc()) {
        $plans[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'min_amount' => (float)$row['min_amount'],
            'max_amount' => (float)$row['max_amount'],
            'roi_rate_min' => (float)$row['roi_rate_min'],
            'roi_rate_max' => (float)$row['roi_rate_max'],
            'referral_commission' => (float)$row['referral_commission'],
            'binary_commission' => (float)$row['binary_commission'],
            'duration_days' => (int)$row['duration_days'],
            'capital_return' => (bool)$row['capital_return']
        ];
    }
    
    sendResponse(HTTP_OK, ['plans' => $plans], 'Investment plans retrieved successfully');
    
} catch (Exception $e) {
    error_log("Get plans error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}
?>
