<?php
/**
 * Evolentra Database Installation Script
 * 
 * This script creates the database and all necessary tables
 * Run this once to set up the database
 */

// Database configuration
define('DB_HOST', 'localhost:3310');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'evolentra');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set header
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Evolentra Database Installation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            max-width: 800px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 2em;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
        }
        
        .status {
            padding: 15px;
            border-radius: 10px;
            margin: 10px 0;
            font-size: 14px;
        }
        
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .warning {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        .step {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        
        .step-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            color: #e83e8c;
        }
        
        .credentials {
            background: #fff;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border: 2px solid #667eea;
        }
        
        .credentials h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        
        .credential-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: #f8f9fa;
            margin: 5px 0;
            border-radius: 5px;
        }
        
        .credential-label {
            font-weight: bold;
            color: #555;
        }
        
        .credential-value {
            color: #333;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Evolentra Installation</h1>
        <p class="subtitle">Database Setup & Configuration</p>

<?php

try {
    // Step 1: Connect to MySQL server (without database)
    echo '<div class="step">';
    echo '<div class="step-title">Step 1: Connecting to MySQL Server</div>';
    
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    echo '<div class="status success">✓ Connected to MySQL server successfully</div>';
    echo '</div>';
    
    // Step 2: Create database
    echo '<div class="step">';
    echo '<div class="step-title">Step 2: Creating Database</div>';
    
    $sql = "CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    if ($conn->query($sql) === TRUE) {
        echo '<div class="status success">✓ Database <code>' . DB_NAME . '</code> created successfully</div>';
    } else {
        throw new Exception("Error creating database: " . $conn->error);
    }
    
    // Select the database
    $conn->select_db(DB_NAME);
    echo '</div>';
    
    // Step 3: Execute schema
    echo '<div class="step">';
    echo '<div class="step-title">Step 3: Creating Tables</div>';
    
    $schema = file_get_contents(__DIR__ . '/database_schema.sql');
    
    if ($schema === false) {
        throw new Exception("Could not read database_schema.sql file");
    }
    
    // Execute multi-query
    if ($conn->multi_query($schema)) {
        do {
            // Store first result set
            if ($result = $conn->store_result()) {
                $result->free();
            }
        } while ($conn->next_result());
        
        echo '<div class="status success">✓ All tables created successfully</div>';
        echo '<div class="status info">Tables created: users, investment_plans, investments, roi_payouts, referral_commissions, binary_tree, binary_commissions, wallets, transactions, withdrawal_requests, settings, activity_logs, sessions</div>';
    } else {
        throw new Exception("Error executing schema: " . $conn->error);
    }
    
    echo '</div>';
    
    // Step 4: Create admin account
    echo '<div class="step">';
    echo '<div class="step-title">Step 4: Creating Admin Account</div>';
    
    // Generate admin credentials
    $admin_email = 'admin@evolentra.com';
    $admin_password = 'Admin@123';
    $admin_password_hash = password_hash($admin_password, PASSWORD_BCRYPT);
    $admin_referral_code = 'ADMIN' . strtoupper(substr(md5(time()), 0, 6));
    
    // Check if admin exists
    $check_admin = $conn->query("SELECT id FROM users WHERE email = '$admin_email'");
    
    if ($check_admin->num_rows == 0) {
        $sql = "INSERT INTO users (email, password_hash, first_name, last_name, role, referral_code, status, email_verified) 
                VALUES ('$admin_email', '$admin_password_hash', 'System', 'Administrator', 'admin', '$admin_referral_code', 'active', TRUE)";
        
        if ($conn->query($sql) === TRUE) {
            $admin_id = $conn->insert_id;
            
            // Create binary tree entry for admin
            $conn->query("INSERT INTO binary_tree (user_id) VALUES ($admin_id)");
            
            echo '<div class="status success">✓ Admin account created successfully</div>';
            
            // Display credentials
            echo '<div class="credentials">';
            echo '<h3>🔐 Admin Credentials</h3>';
            echo '<div class="credential-item">';
            echo '<span class="credential-label">Email:</span>';
            echo '<span class="credential-value">' . $admin_email . '</span>';
            echo '</div>';
            echo '<div class="credential-item">';
            echo '<span class="credential-label">Password:</span>';
            echo '<span class="credential-value">' . $admin_password . '</span>';
            echo '</div>';
            echo '<div class="credential-item">';
            echo '<span class="credential-label">Referral Code:</span>';
            echo '<span class="credential-value">' . $admin_referral_code . '</span>';
            echo '</div>';
            echo '<div class="status warning" style="margin-top: 15px;">⚠️ Please change the admin password after first login!</div>';
            echo '</div>';
        } else {
            throw new Exception("Error creating admin account: " . $conn->error);
        }
    } else {
        echo '<div class="status info">ℹ️ Admin account already exists</div>';
    }
    
    echo '</div>';
    
    // Step 5: Verify installation
    echo '<div class="step">';
    echo '<div class="step-title">Step 5: Verifying Installation</div>';
    
    // Count tables
    $result = $conn->query("SHOW TABLES");
    $table_count = $result->num_rows;
    
    echo '<div class="status success">✓ Found ' . $table_count . ' tables in database</div>';
    
    // Check investment plans
    $result = $conn->query("SELECT COUNT(*) as count FROM investment_plans");
    $row = $result->fetch_assoc();
    echo '<div class="status success">✓ ' . $row['count'] . ' investment plans configured (ROOT, RISE, TERRA)</div>';
    
    // Check settings
    $result = $conn->query("SELECT COUNT(*) as count FROM settings");
    $row = $result->fetch_assoc();
    echo '<div class="status success">✓ ' . $row['count'] . ' system settings configured</div>';
    
    echo '</div>';
    
    // Final success message
    echo '<div class="status success" style="margin-top: 30px; padding: 20px; font-size: 16px;">';
    echo '<strong>🎉 Installation Complete!</strong><br><br>';
    echo 'Your Evolentra platform database is ready to use.<br>';
    echo 'Next steps:<br>';
    echo '1. Update your API configuration files with database credentials<br>';
    echo '2. Set up the frontend application<br>';
    echo '3. Configure cron jobs for daily ROI processing<br>';
    echo '4. Review and customize system settings';
    echo '</div>';
    
    $conn->close();
    
} catch (Exception $e) {
    echo '<div class="status error">';
    echo '<strong>❌ Installation Failed</strong><br><br>';
    echo 'Error: ' . $e->getMessage();
    echo '</div>';
    
    if (isset($conn)) {
        $conn->close();
    }
}

?>

    </div>
</body>
</html>
