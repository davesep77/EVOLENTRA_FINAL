-- ============================================
-- Evolentra MLM Platform Database Schema
-- ============================================
-- Version: 1.0
-- Description: Complete database schema for ROI, Referral, and Binary compensation systems
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM(
        'investor',
        'affiliate',
        'admin'
    ) DEFAULT 'investor',
    referrer_id INT NULL,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    status ENUM(
        'active',
        'suspended',
        'inactive'
    ) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    FOREIGN KEY (referrer_id) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_referrer (referrer_id),
    INDEX idx_referral_code (referral_code),
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Investment Plans Table
CREATE TABLE IF NOT EXISTS investment_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    min_amount DECIMAL(15, 2) NOT NULL,
    max_amount DECIMAL(15, 2) NOT NULL,
    roi_rate_min DECIMAL(5, 2) NOT NULL COMMENT 'Daily ROI percentage (min)',
    roi_rate_max DECIMAL(5, 2) NOT NULL COMMENT 'Daily ROI percentage (max)',
    referral_commission DECIMAL(5, 2) NOT NULL COMMENT 'Referral commission percentage',
    binary_commission DECIMAL(5, 2) NOT NULL COMMENT 'Binary matching commission percentage',
    duration_days INT NOT NULL DEFAULT 250,
    capital_return BOOLEAN DEFAULT TRUE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Investments Table
CREATE TABLE IF NOT EXISTS investments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    roi_rate DECIMAL(5, 2) NOT NULL COMMENT 'Locked ROI rate for this investment',
    total_roi_earned DECIMAL(15, 2) DEFAULT 0.00,
    total_roi_withdrawn DECIMAL(15, 2) DEFAULT 0.00,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_elapsed INT DEFAULT 0,
    status ENUM(
        'active',
        'completed',
        'cancelled'
    ) DEFAULT 'active',
    capital_returned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES investment_plans (id) ON DELETE RESTRICT,
    INDEX idx_user_status (user_id, status),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ROI Payouts Table
CREATE TABLE IF NOT EXISTS roi_payouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    investment_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payout_date DATE NOT NULL,
    day_number INT NOT NULL COMMENT 'Day number in the investment cycle',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investment_id) REFERENCES investments (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_investment (investment_id),
    INDEX idx_user_date (user_id, payout_date),
    INDEX idx_payout_date (payout_date),
    UNIQUE KEY unique_investment_day (investment_id, day_number)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Referral Commissions Table
CREATE TABLE IF NOT EXISTS referral_commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referrer_id INT NOT NULL COMMENT 'User who referred',
    referred_id INT NOT NULL COMMENT 'User who was referred',
    investment_id INT NOT NULL COMMENT 'Investment that triggered commission',
    investment_amount DECIMAL(15, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(15, 2) NOT NULL,
    status ENUM(
        'pending',
        'paid',
        'cancelled'
    ) DEFAULT 'paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (investment_id) REFERENCES investments (id) ON DELETE CASCADE,
    INDEX idx_referrer (referrer_id),
    INDEX idx_referred (referred_id),
    INDEX idx_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Binary Tree Structure Table
CREATE TABLE IF NOT EXISTS binary_tree (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    parent_id INT NULL,
    position ENUM('left', 'right') NULL COMMENT 'Position under parent',
    left_child_id INT NULL,
    right_child_id INT NULL,
    left_volume DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Total investment volume in left leg',
    right_volume DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Total investment volume in right leg',
    left_carry_forward DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Unmatched left volume',
    right_carry_forward DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Unmatched right volume',
    total_matched DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Total matched volume',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (left_child_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (right_child_id) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_parent (parent_id),
    INDEX idx_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Binary Commissions Table
CREATE TABLE IF NOT EXISTS binary_commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    left_volume DECIMAL(15, 2) NOT NULL,
    right_volume DECIMAL(15, 2) NOT NULL,
    matched_volume DECIMAL(15, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    commission_amount DECIMAL(15, 2) NOT NULL,
    left_carry_forward DECIMAL(15, 2) DEFAULT 0.00,
    right_carry_forward DECIMAL(15, 2) DEFAULT 0.00,
    status ENUM(
        'pending',
        'paid',
        'cancelled'
    ) DEFAULT 'paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    currency ENUM(
        'BTC',
        'ETH',
        'USDT',
        'TRX',
        'XRP'
    ) NOT NULL,
    wallet_address VARCHAR(255) NULL COMMENT 'User crypto wallet address',
    balance DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Available balance',
    roi_balance DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'ROI earnings balance',
    referral_balance DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Referral commission balance',
    binary_balance DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Binary commission balance',
    total_deposited DECIMAL(15, 2) DEFAULT 0.00,
    total_withdrawn DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_currency (user_id, currency),
    INDEX idx_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM(
        'deposit',
        'withdrawal',
        'roi',
        'referral_commission',
        'binary_commission',
        'investment',
        'capital_return'
    ) NOT NULL,
    currency ENUM(
        'BTC',
        'ETH',
        'USDT',
        'TRX',
        'XRP'
    ) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) DEFAULT 0.00,
    net_amount DECIMAL(15, 2) NOT NULL COMMENT 'Amount after fees',
    status ENUM(
        'pending',
        'completed',
        'failed',
        'cancelled'
    ) DEFAULT 'pending',
    reference_id INT NULL COMMENT 'Reference to related record (investment_id, commission_id, etc)',
    wallet_address VARCHAR(255) NULL COMMENT 'Crypto wallet address',
    tx_hash VARCHAR(255) NULL COMMENT 'Blockchain transaction hash',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_user_type (user_id, type),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Withdrawal Requests Table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    currency ENUM('USDT', 'TRX') NOT NULL COMMENT 'Only USDT and TRX for withdrawals',
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) NOT NULL COMMENT '7% withdrawal fee',
    net_amount DECIMAL(15, 2) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    status ENUM(
        'pending',
        'approved',
        'rejected',
        'completed'
    ) DEFAULT 'pending',
    admin_notes TEXT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NULL COMMENT 'Type of entity (user, investment, withdrawal, etc)',
    entity_id INT NULL COMMENT 'ID of the entity',
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    details TEXT NULL COMMENT 'JSON encoded details',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_last_activity (last_activity)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Initial Data Insertion
-- ============================================

-- Insert default investment plans
INSERT INTO
    investment_plans (
        name,
        min_amount,
        max_amount,
        roi_rate_min,
        roi_rate_max,
        referral_commission,
        binary_commission,
        duration_days,
        capital_return
    )
VALUES (
        'ROOT',
        50.00,
        5000.00,
        1.20,
        1.30,
        9.00,
        10.00,
        250,
        TRUE
    ),
    (
        'RISE',
        5001.00,
        25000.00,
        1.30,
        1.30,
        9.00,
        10.00,
        250,
        TRUE
    ),
    (
        'TERRA',
        25001.00,
        999999999.99,
        1.50,
        1.50,
        9.00,
        10.00,
        250,
        TRUE
    );

-- Insert default settings
INSERT INTO
    settings (
        setting_key,
        setting_value,
        description
    )
VALUES (
        'min_withdrawal',
        '15.00',
        'Minimum withdrawal amount in USD'
    ),
    (
        'withdrawal_fee',
        '7.00',
        'Withdrawal fee percentage'
    ),
    (
        'roi_withdrawal_day',
        'Saturday',
        'Day of week for ROI withdrawals'
    ),
    (
        'commission_withdrawal',
        'daily',
        'Commission withdrawal frequency'
    ),
    (
        'platform_name',
        'Evolentra',
        'Platform name'
    ),
    (
        'support_email',
        'support@evolentra.com',
        'Support email address'
    ),
    (
        'maintenance_mode',
        'false',
        'Maintenance mode status'
    );

-- ============================================
-- End of Schema
-- ============================================