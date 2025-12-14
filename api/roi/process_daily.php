<?php
/**
 * Daily ROI Processing Script
 * Evolentra Platform
 * 
 * This script should be run daily via cron job to calculate and distribute ROI
 * Cron: 0 0 * * * /usr/bin/php /path/to/process_daily.php
 */

require_once '../config/database.php';
require_once '../config/constants.php';

// Database connection
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    die("Database connection failed\n");
}

$today = date('Y-m-d');
$processed_count = 0;
$total_roi_distributed = 0;

try {
    echo "Starting daily ROI processing for $today\n";
    
    // Get all active investments
    $stmt = $conn->prepare("
        SELECT 
            i.id,
            i.user_id,
            i.amount,
            i.roi_rate,
            i.start_date,
            i.end_date,
            i.days_elapsed,
            p.duration_days,
            p.capital_return
        FROM investments i
        JOIN investment_plans p ON i.plan_id = p.id
        WHERE i.status = 'active'
        AND i.start_date <= ?
        AND i.end_date >= ?
    ");
    $stmt->bind_param("ss", $today, $today);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($investment = $result->fetch_assoc()) {
        $conn->begin_transaction();
        
        try {
            // Calculate days elapsed
            $start = new DateTime($investment['start_date']);
            $current = new DateTime($today);
            $days_elapsed = $current->diff($start)->days + 1;
            
            // Check if already processed today
            $stmt = $conn->prepare("SELECT id FROM roi_payouts WHERE investment_id = ? AND payout_date = ?");
            $stmt->bind_param("is", $investment['id'], $today);
            $stmt->execute();
            $check_result = $stmt->get_result();
            
            if ($check_result->num_rows > 0) {
                echo "Investment {$investment['id']} already processed for today\n";
                $conn->commit();
                continue;
            }
            
            // Calculate daily ROI
            $daily_roi = ($investment['amount'] * $investment['roi_rate']) / 100;
            
            // Insert ROI payout
            $stmt = $conn->prepare("INSERT INTO roi_payouts (investment_id, user_id, amount, payout_date, day_number) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("iidsi", $investment['id'], $investment['user_id'], $daily_roi, $today, $days_elapsed);
            $stmt->execute();
            
            // Update investment
            $stmt = $conn->prepare("UPDATE investments SET total_roi_earned = total_roi_earned + ?, days_elapsed = ? WHERE id = ?");
            $stmt->bind_param("dii", $daily_roi, $days_elapsed, $investment['id']);
            $stmt->execute();
            
            // Update user's wallet
            $stmt = $conn->prepare("UPDATE wallets SET roi_balance = roi_balance + ?, balance = balance + ? WHERE user_id = ? AND currency = 'USDT'");
            $stmt->bind_param("ddi", $daily_roi, $daily_roi, $investment['user_id']);
            $stmt->execute();
            
            // Create transaction record
            $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, currency, amount, net_amount, status, reference_id) VALUES (?, 'roi', 'USDT', ?, ?, 'completed', ?)");
            $stmt->bind_param("iddi", $investment['user_id'], $daily_roi, $daily_roi, $investment['id']);
            $stmt->execute();
            
            // Check if investment completed
            if ($days_elapsed >= $investment['duration_days']) {
                $stmt = $conn->prepare("UPDATE investments SET status = 'completed' WHERE id = ?");
                $stmt->bind_param("i", $investment['id']);
                $stmt->execute();
                
                // Return capital if applicable
                if ($investment['capital_return']) {
                    $stmt = $conn->prepare("UPDATE wallets SET balance = balance + ? WHERE user_id = ? AND currency = 'USDT'");
                    $stmt->bind_param("di", $investment['amount'], $investment['user_id']);
                    $stmt->execute();
                    
                    $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, currency, amount, net_amount, status, reference_id) VALUES (?, 'capital_return', 'USDT', ?, ?, 'completed', ?)");
                    $stmt->bind_param("iddi", $investment['user_id'], $investment['amount'], $investment['amount'], $investment['id']);
                    $stmt->execute();
                    
                    $stmt = $conn->prepare("UPDATE investments SET capital_returned = TRUE WHERE id = ?");
                    $stmt->bind_param("i", $investment['id']);
                    $stmt->execute();
                    
                    echo "Investment {$investment['id']} completed - Capital returned\n";
                }
            }
            
            $conn->commit();
            $processed_count++;
            $total_roi_distributed += $daily_roi;
            
            echo "Processed investment {$investment['id']} - ROI: $$daily_roi\n";
            
        } catch (Exception $e) {
            $conn->rollback();
            echo "Error processing investment {$investment['id']}: " . $e->getMessage() . "\n";
        }
    }
    
    echo "\n=== ROI Processing Complete ===\n";
    echo "Date: $today\n";
    echo "Investments processed: $processed_count\n";
    echo "Total ROI distributed: $$total_roi_distributed\n";
    
} catch (Exception $e) {
    echo "Fatal error: " . $e->getMessage() . "\n";
}

$conn->close();
?>
