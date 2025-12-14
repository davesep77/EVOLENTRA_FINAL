<?php
/**
 * User Logout API
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
session_start();

if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $session_id = session_id();
    
    // Delete session from database
    $stmt = $conn->prepare("DELETE FROM sessions WHERE id = ?");
    $stmt->bind_param("s", $session_id);
    $stmt->execute();
    
    // Log activity
    logActivity($conn, $user_id, 'user_logout', 'user', $user_id);
}

// Destroy session
session_destroy();

sendResponse(HTTP_OK, [], 'Logout successful');
?>
