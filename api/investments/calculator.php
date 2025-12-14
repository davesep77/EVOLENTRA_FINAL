<?php
/**
 * Investment ROI Calculator API
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
if (!isset($data['plan_id']) || !isset($data['amount'])) {
    sendResponse(HTTP_BAD_REQUEST, [], 'Plan ID and amount are required');
}

$plan_id = intval($data['plan_id']);
$amount = floatval($data['amount']);
$referrals = isset($data['referrals']) ? intval($data['referrals']) : 0;
$binary_volume = isset($data['binary_volume']) ? floatval($data['binary_volume']) : 0;

if ($amount <= 0) {
    sendResponse(HTTP_BAD_REQUEST, [], 'Invalid amount');
}

// Database connection
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}

try {
    // Get plan details
    $stmt = $conn->prepare("SELECT * FROM investment_plans WHERE id = ? AND status = 'active'");
    $stmt->bind_param("i", $plan_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(HTTP_BAD_REQUEST, [], 'Invalid plan');
    }
    
    $plan = $result->fetch_assoc();
    
    // Validate amount range
    if ($amount < $plan['min_amount'] || $amount > $plan['max_amount']) {
        sendResponse(HTTP_BAD_REQUEST, [], "Amount must be between {$plan['min_amount']} and {$plan['max_amount']}");
    }
    
    // Calculate ROI
    $roi_rate_min = floatval($plan['roi_rate_min']);
    $roi_rate_max = floatval($plan['roi_rate_max']);
    $roi_rate_avg = ($roi_rate_min + $roi_rate_max) / 2;
    $duration_days = intval($plan['duration_days']);
    
    // Daily ROI calculations
    $daily_roi_min = ($amount * $roi_rate_min) / 100;
    $daily_roi_max = ($amount * $roi_rate_max) / 100;
    $daily_roi_avg = ($amount * $roi_rate_avg) / 100;
    
    // Weekly ROI
    $weekly_roi_min = $daily_roi_min * 7;
    $weekly_roi_max = $daily_roi_max * 7;
    $weekly_roi_avg = $daily_roi_avg * 7;
    
    // Monthly ROI (30 days)
    $monthly_roi_min = $daily_roi_min * 30;
    $monthly_roi_max = $daily_roi_max * 30;
    $monthly_roi_avg = $daily_roi_avg * 30;
    
    // Total ROI over duration
    $total_roi_min = $daily_roi_min * $duration_days;
    $total_roi_max = $daily_roi_max * $duration_days;
    $total_roi_avg = $daily_roi_avg * $duration_days;
    
    // Capital return
    $capital_return = $plan['capital_return'] ? $amount : 0;
    
    // Total return
    $total_return_min = $total_roi_min + $capital_return;
    $total_return_max = $total_roi_max + $capital_return;
    $total_return_avg = $total_roi_avg + $capital_return;
    
    // Referral commission potential
    $referral_commission_rate = floatval($plan['referral_commission']);
    $referral_potential = ($amount * $referral_commission_rate / 100) * $referrals;
    
    // Binary commission potential
    $binary_commission_rate = floatval($plan['binary_commission']);
    $binary_potential = ($binary_volume * $binary_commission_rate) / 100;
    
    // Generate daily projections for chart
    $projections = [];
    $cumulative_roi = 0;
    
    for ($day = 1; $day <= min($duration_days, 250); $day++) {
        $cumulative_roi += $daily_roi_avg;
        
        // Add projection every 10 days to reduce data size
        if ($day % 10 === 0 || $day === 1 || $day === $duration_days) {
            $projections[] = [
                'day' => $day,
                'daily_roi' => round($daily_roi_avg, 2),
                'cumulative_roi' => round($cumulative_roi, 2),
                'total_value' => round($amount + $cumulative_roi, 2)
            ];
        }
    }
    
    // Calculate ROI percentage
    $roi_percentage_min = ($total_roi_min / $amount) * 100;
    $roi_percentage_max = ($total_roi_max / $amount) * 100;
    $roi_percentage_avg = ($total_roi_avg / $amount) * 100;
    
    // Return calculations
    sendResponse(HTTP_OK, [
        'plan' => [
            'id' => $plan['id'],
            'name' => $plan['name'],
            'roi_rate_min' => $roi_rate_min,
            'roi_rate_max' => $roi_rate_max,
            'duration_days' => $duration_days
        ],
        'investment_amount' => round($amount, 2),
        'daily_roi' => [
            'min' => round($daily_roi_min, 2),
            'max' => round($daily_roi_max, 2),
            'avg' => round($daily_roi_avg, 2)
        ],
        'weekly_roi' => [
            'min' => round($weekly_roi_min, 2),
            'max' => round($weekly_roi_max, 2),
            'avg' => round($weekly_roi_avg, 2)
        ],
        'monthly_roi' => [
            'min' => round($monthly_roi_min, 2),
            'max' => round($monthly_roi_max, 2),
            'avg' => round($monthly_roi_avg, 2)
        ],
        'total_roi' => [
            'min' => round($total_roi_min, 2),
            'max' => round($total_roi_max, 2),
            'avg' => round($total_roi_avg, 2)
        ],
        'capital_return' => round($capital_return, 2),
        'total_return' => [
            'min' => round($total_return_min, 2),
            'max' => round($total_return_max, 2),
            'avg' => round($total_return_avg, 2)
        ],
        'roi_percentage' => [
            'min' => round($roi_percentage_min, 2),
            'max' => round($roi_percentage_max, 2),
            'avg' => round($roi_percentage_avg, 2)
        ],
        'referral_potential' => round($referral_potential, 2),
        'binary_potential' => round($binary_potential, 2),
        'projections' => $projections
    ], 'Calculation completed successfully');
    
} catch (Exception $e) {
    error_log("Calculator error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}
?>
