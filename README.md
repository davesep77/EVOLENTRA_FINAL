# Evolentra MLM Platform

A comprehensive investment platform with ROI, referral, and binary compensation systems.

## 🚀 Features

- **Investment Plans**: ROOT, RISE, and TERRA plans with varying ROI rates (1.2% - 1.5% daily)
- **ROI System**: Automated daily ROI calculation and distribution
- **Referral Program**: 9% commission on direct referrals
- **Binary Compensation**: 10% matching bonus on 1:1 volume
- **Multi-Currency Wallets**: Support for BTC, ETH, USDT, TRX, XRP
- **Admin Panel**: Complete control over system settings and withdrawals
- **Modern UI**: Glassmorphism design with smooth animations

## 📋 Prerequisites

- **XAMPP** (or similar) with:
  - PHP 7.4 or higher
  - MySQL 5.7 or higher
  - Apache Web Server
- **Node.js** 16+ and npm
- Modern web browser

## 🛠️ Installation

### 1. Database Setup

1. Start XAMPP and ensure MySQL is running on port 3310
2. Open your browser and navigate to:
   ```
   http://localhost/evolentra/database/install.php
   ```
3. The installation script will:
   - Create the `evolentra` database
   - Set up all required tables
   - Create an admin account
   - Insert default investment plans

**Default Admin Credentials:**
- Email: `admin@evolentra.com`
- Password: `Admin@123`
- ⚠️ **Change these credentials after first login!**

### 2. Backend Configuration

The backend is already configured for:
- Database: `localhost:3310`
- Username: `root`
- Password: `` (empty)

If your MySQL configuration is different, update:
```php
// File: api/config/database.php
private $host = "localhost:3310";
private $username = "root";
private $password = "";
```

### 3. Frontend Setup

```bash
# Navigate to project directory
cd d:/xampp/htdocs/evolentra

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: `http://localhost:3000`

### 4. Set Up Daily ROI Cron Job

For automated daily ROI processing, set up a cron job:

**Windows (Task Scheduler):**
```
Program: C:\xampp\php\php.exe
Arguments: d:\xampp\htdocs\evolentra\api\roi\process_daily.php
Schedule: Daily at 00:00
```

**Linux/Mac (Crontab):**
```bash
0 0 * * * /usr/bin/php /path/to/evolentra/api/roi/process_daily.php
```

## 📁 Project Structure

```
evolentra/
├── api/                      # Backend PHP APIs
│   ├── config/              # Database & constants
│   ├── auth/                # Authentication endpoints
│   ├── investments/         # Investment management
│   ├── roi/                 # ROI calculation
│   ├── wallet/              # Wallet operations
│   ├── binary/              # Binary tree logic
│   └── admin/               # Admin endpoints
├── database/                # Database setup
│   ├── database_schema.sql # Complete schema
│   └── install.php         # Installation script
├── src/                     # React frontend
│   ├── components/         # Reusable components
│   ├── contexts/           # React contexts
│   ├── pages/              # Page components
│   └── index.css           # Design system
├── index.html              # HTML entry point
├── package.json            # Node dependencies
└── vite.config.js          # Vite configuration
```

## 💼 Business Rules

### Investment Plans

| Plan | Amount Range | Daily ROI | Duration | Capital Return |
|------|-------------|-----------|----------|----------------|
| ROOT | $50 - $5,000 | 1.2% - 1.3% | 250 days | 100% |
| RISE | $5,001 - $25,000 | 1.3% | 250 days | 100% |
| TERRA | $25,001+ | 1.5% | 250 days | 100% |

### Commission Structure

- **Referral Commission**: 8% - 9% on direct referral investments
- **Binary Commission**: 10% on matched volume (1:1 ratio)
- **Withdrawal Fee**: 7%
- **Minimum Withdrawal**: $15

### Withdrawal Rules

- **ROI Withdrawals**: Only on Saturdays
- **Commission Withdrawals**: Daily
- **Supported Currencies**: USDT, TRX (withdrawals only)

## 🔒 Security Features

- Password hashing with bcrypt
- Session management
- SQL injection prevention
- XSS protection
- Activity logging
- Admin approval for withdrawals

## 🎨 Design System

The platform uses a modern design system featuring:
- **Glassmorphism** effects
- **HSL-based** color palette
- **Smooth animations** and transitions
- **Responsive** grid layouts
- **Dark theme** optimized

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register.php` - User registration
- `POST /api/auth/login.php` - User login
- `POST /api/auth/logout.php` - User logout

### Investments
- `GET /api/investments/plans.php` - Get investment plans
- `POST /api/investments/create.php` - Create investment
- `GET /api/investments/user_investments.php` - Get user investments

### Wallet
- `GET /api/wallet/balance.php` - Get wallet balances
- `POST /api/wallet/withdraw.php` - Request withdrawal

### Binary
- `GET /api/binary/tree.php` - Get binary tree data

### Admin
- `GET /api/admin/withdrawals.php` - List withdrawal requests
- `POST /api/admin/withdrawals.php` - Approve/reject withdrawal

## ⚠️ Important Legal Notices

> **WARNING**: This platform involves financial investments and multi-level marketing features. Before deployment:
> 
> - Obtain legal review for MLM/investment regulations in your jurisdiction
> - Implement mandatory risk disclaimers
> - Ensure compliance with securities laws
> - Consider KYC/AML requirements
> - Verify sustainability of ROI rates
> - Obtain necessary regulatory approvals

**The ROI rates (1.2%-1.5% daily) are platform-defined rules, not guaranteed returns.**

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MySQL is running on port 3310
- Check credentials in `api/config/database.php`
- Ensure `evolentra` database exists

### Frontend Not Loading
- Run `npm install` to ensure dependencies are installed
- Check that port 3000 is not in use
- Verify Vite dev server is running

### API Errors
- Check PHP error logs in XAMPP
- Verify all API files have proper permissions
- Ensure session support is enabled in PHP

## 📞 Support

For issues or questions:
- Check the implementation plan in `.gemini/antigravity/brain/`
- Review activity logs in the database
- Consult the API documentation above

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ using React, PHP, and MySQL**
