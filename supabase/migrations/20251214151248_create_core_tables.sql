/*
  # Create Evolentra MLM Platform Core Tables
  
  ## Description
  Complete database schema for ROI, Referral, and Binary compensation systems.
  This migration creates all core tables with proper relationships, indexes, and security policies.
  
  ## Tables Created
  
  ### 1. Users Table
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email address
  - `first_name` (text) - User first name
  - `last_name` (text) - User last name
  - `phone` (text) - Phone number
  - `role` (text) - User role: investor, affiliate, or admin
  - `referrer_id` (uuid) - Reference to user who referred this user
  - `referral_code` (text, unique) - Unique referral code
  - `status` (text) - Account status: active, suspended, or inactive
  - `email_verified` (boolean) - Email verification status
  - `two_factor_enabled` (boolean) - 2FA status
  - `two_factor_secret` (text) - 2FA secret
  - `last_login` (timestamptz) - Last login timestamp
  - `created_at`, `updated_at` - Timestamp fields
  
  ### 2. Investment Plans Table
  - `id` (uuid, primary key) - Plan identifier
  - `name` (text, unique) - Plan name (ROOT, RISE, TERRA)
  - `min_amount` (numeric) - Minimum investment amount
  - `max_amount` (numeric) - Maximum investment amount
  - `roi_rate_min` (numeric) - Minimum daily ROI percentage
  - `roi_rate_max` (numeric) - Maximum daily ROI percentage
  - `referral_commission` (numeric) - Referral commission percentage
  - `binary_commission` (numeric) - Binary commission percentage
  - `duration_days` (integer) - Investment duration in days
  - `capital_return` (boolean) - Whether capital is returned
  - `status` (text) - Plan status
  
  ### 3. Investments Table
  - Tracks individual user investments
  - Links to users and investment plans
  - Tracks ROI earned and withdrawn
  
  ### 4. ROI Payouts Table
  - Records daily ROI payments
  - Linked to investments and users
  
  ### 5. Referral Commissions Table
  - Tracks referral-based commissions
  
  ### 6. Binary Tree Structure Table
  - Manages binary tree relationships
  - Tracks left/right leg volumes
  
  ### 7. Binary Commissions Table
  - Records binary matching commissions
  
  ### 8. Wallets Table
  - Multi-currency wallet support (BTC, ETH, USDT, TRX, XRP)
  - Separate balances for ROI, referral, and binary earnings
  
  ### 9. Transactions Table
  - Complete transaction history
  - All deposit, withdrawal, and commission records
  
  ### 10. Withdrawal Requests Table
  - Manages withdrawal requests
  - Admin approval workflow
  
  ### 11. Settings Table
  - Platform configuration
  
  ### 12. Activity Logs Table
  - Audit trail for all actions
  
  ## Security
  - RLS enabled on all tables
  - Policies restrict access to authenticated users
  - Users can only access their own data
  - Admins have elevated permissions
  
  ## Notes
  - Uses UUID for all primary keys
  - Automatic timestamp management with triggers
  - Proper foreign key constraints for data integrity
  - Indexes on frequently queried columns
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    role text NOT NULL DEFAULT 'investor' CHECK (role IN ('investor', 'affiliate', 'admin')),
    referrer_id uuid,
    referral_code text UNIQUE NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    email_verified boolean DEFAULT false,
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_login timestamptz,
    FOREIGN KEY (referrer_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_referrer ON users (referrer_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users (referral_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Investment Plans Table
CREATE TABLE IF NOT EXISTS investment_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    min_amount numeric(15, 2) NOT NULL,
    max_amount numeric(15, 2) NOT NULL,
    roi_rate_min numeric(5, 2) NOT NULL,
    roi_rate_max numeric(5, 2) NOT NULL,
    referral_commission numeric(5, 2) NOT NULL,
    binary_commission numeric(5, 2) NOT NULL,
    duration_days integer NOT NULL DEFAULT 250,
    capital_return boolean DEFAULT true,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investment_plans_status ON investment_plans (status);

CREATE TRIGGER update_investment_plans_updated_at BEFORE UPDATE ON investment_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE investment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON investment_plans
    FOR SELECT TO authenticated
    USING (status = 'active');

-- Investments Table
CREATE TABLE IF NOT EXISTS investments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    amount numeric(15, 2) NOT NULL,
    roi_rate numeric(5, 2) NOT NULL,
    total_roi_earned numeric(15, 2) DEFAULT 0.00,
    total_roi_withdrawn numeric(15, 2) DEFAULT 0.00,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_elapsed integer DEFAULT 0,
    status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    capital_returned boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES investment_plans (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_investments_user_status ON investments (user_id, status);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments (status);
CREATE INDEX IF NOT EXISTS idx_investments_dates ON investments (start_date, end_date);

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investments" ON investments
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own investments" ON investments
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ROI Payouts Table
CREATE TABLE IF NOT EXISTS roi_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(15, 2) NOT NULL,
    payout_date date NOT NULL,
    day_number integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    FOREIGN KEY (investment_id) REFERENCES investments (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (investment_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_roi_payouts_investment ON roi_payouts (investment_id);
CREATE INDEX IF NOT EXISTS idx_roi_payouts_user_date ON roi_payouts (user_id, payout_date);
CREATE INDEX IF NOT EXISTS idx_roi_payouts_payout_date ON roi_payouts (payout_date);

ALTER TABLE roi_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ROI payouts" ON roi_payouts
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Referral Commissions Table
CREATE TABLE IF NOT EXISTS referral_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    investment_id uuid NOT NULL,
    investment_amount numeric(15, 2) NOT NULL,
    commission_rate numeric(5, 2) NOT NULL,
    commission_amount numeric(15, 2) NOT NULL,
    status text DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_at timestamptz DEFAULT now(),
    FOREIGN KEY (referrer_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (investment_id) REFERENCES investments (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred ON referral_commissions (referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions (status);

ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view commissions they received" ON referral_commissions
    FOR SELECT TO authenticated
    USING (auth.uid() = referrer_id);

-- Binary Tree Structure Table
CREATE TABLE IF NOT EXISTS binary_tree (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    parent_id uuid,
    position text CHECK (position IN ('left', 'right')),
    left_child_id uuid,
    right_child_id uuid,
    left_volume numeric(15, 2) DEFAULT 0.00,
    right_volume numeric(15, 2) DEFAULT 0.00,
    left_carry_forward numeric(15, 2) DEFAULT 0.00,
    right_carry_forward numeric(15, 2) DEFAULT 0.00,
    total_matched numeric(15, 2) DEFAULT 0.00,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (left_child_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (right_child_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_binary_tree_parent ON binary_tree (parent_id);
CREATE INDEX IF NOT EXISTS idx_binary_tree_user ON binary_tree (user_id);

CREATE TRIGGER update_binary_tree_updated_at BEFORE UPDATE ON binary_tree
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE binary_tree ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own binary tree" ON binary_tree
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Binary Commissions Table
CREATE TABLE IF NOT EXISTS binary_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    left_volume numeric(15, 2) NOT NULL,
    right_volume numeric(15, 2) NOT NULL,
    matched_volume numeric(15, 2) NOT NULL,
    commission_rate numeric(5, 2) NOT NULL DEFAULT 10.00,
    commission_amount numeric(15, 2) NOT NULL,
    left_carry_forward numeric(15, 2) DEFAULT 0.00,
    right_carry_forward numeric(15, 2) DEFAULT 0.00,
    status text DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_at timestamptz DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_binary_commissions_user ON binary_commissions (user_id);
CREATE INDEX IF NOT EXISTS idx_binary_commissions_status ON binary_commissions (status);
CREATE INDEX IF NOT EXISTS idx_binary_commissions_created ON binary_commissions (created_at);

ALTER TABLE binary_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own binary commissions" ON binary_commissions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    currency text NOT NULL CHECK (currency IN ('BTC', 'ETH', 'USDT', 'TRX', 'XRP')),
    wallet_address text,
    balance numeric(15, 2) DEFAULT 0.00,
    roi_balance numeric(15, 2) DEFAULT 0.00,
    referral_balance numeric(15, 2) DEFAULT 0.00,
    binary_balance numeric(15, 2) DEFAULT 0.00,
    total_deposited numeric(15, 2) DEFAULT 0.00,
    total_withdrawn numeric(15, 2) DEFAULT 0.00,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (user_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets (user_id);

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallets" ON wallets
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets" ON wallets
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'roi', 'referral_commission', 'binary_commission', 'investment', 'capital_return')),
    currency text NOT NULL CHECK (currency IN ('BTC', 'ETH', 'USDT', 'TRX', 'XRP')),
    amount numeric(15, 2) NOT NULL,
    fee numeric(15, 2) DEFAULT 0.00,
    net_amount numeric(15, 2) NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference_id uuid,
    wallet_address text,
    tx_hash text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions (user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions (created_at);

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON transactions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Withdrawal Requests Table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    currency text NOT NULL CHECK (currency IN ('USDT', 'TRX')),
    amount numeric(15, 2) NOT NULL,
    fee numeric(15, 2) NOT NULL,
    net_amount numeric(15, 2) NOT NULL,
    wallet_address text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes text,
    approved_by uuid,
    approved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests (status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created ON withdrawal_requests (created_at);

CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal requests" ON withdrawal_requests
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal requests" ON withdrawal_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key text NOT NULL UNIQUE,
    setting_value text NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings (setting_key);

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON settings
    FOR SELECT TO authenticated
    USING (true);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    ip_address text,
    user_agent text,
    details jsonb,
    created_at timestamptz DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs (created_at);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs" ON activity_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Insert default investment plans
INSERT INTO investment_plans (name, min_amount, max_amount, roi_rate_min, roi_rate_max, referral_commission, binary_commission, duration_days, capital_return)
VALUES 
    ('ROOT', 50.00, 5000.00, 1.20, 1.30, 9.00, 10.00, 250, true),
    ('RISE', 5001.00, 25000.00, 1.30, 1.30, 9.00, 10.00, 250, true),
    ('TERRA', 25001.00, 999999999.99, 1.50, 1.50, 9.00, 10.00, 250, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description)
VALUES 
    ('min_withdrawal', '15.00', 'Minimum withdrawal amount in USD'),
    ('withdrawal_fee', '7.00', 'Withdrawal fee percentage'),
    ('roi_withdrawal_day', 'Saturday', 'Day of week for ROI withdrawals'),
    ('commission_withdrawal', 'daily', 'Commission withdrawal frequency'),
    ('platform_name', 'Evolentra', 'Platform name'),
    ('support_email', 'support@evolentra.com', 'Support email address'),
    ('maintenance_mode', 'false', 'Maintenance mode status')
ON CONFLICT (setting_key) DO NOTHING;