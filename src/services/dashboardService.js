import { supabase } from '../lib/supabase';
import { getWalletBalance } from './walletService';
import { getUserInvestments } from './investmentService';

export const getDashboardData = async (userId) => {
    const [walletData, investments] = await Promise.all([
        getWalletBalance(userId),
        getUserInvestments(userId),
    ]);

    const usdtWallet = walletData.wallets.find(w => w.currency === 'USDT') || {
        roi_balance: 0,
        referral_balance: 0,
        binary_balance: 0,
    };

    const totalInvested = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    return {
        totalInvested,
        totalROI: parseFloat(usdtWallet.roi_balance || 0),
        referralEarnings: parseFloat(usdtWallet.referral_balance || 0),
        binaryEarnings: parseFloat(usdtWallet.binary_balance || 0),
        walletBalance: walletData.total_balance,
        recentInvestments: investments.slice(0, 5),
    };
};
