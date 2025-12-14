import { supabase } from '../lib/supabase';

export const getWalletBalance = async (userId) => {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .order('currency');

    if (error) throw error;

    const totalBalance = data.reduce((sum, wallet) => sum + parseFloat(wallet.balance || 0), 0);

    return {
        wallets: data,
        total_balance: totalBalance,
    };
};

export const createWithdrawalRequest = async (userId, currency, amount, walletAddress) => {
    if (!['USDT', 'TRX'].includes(currency)) {
        throw new Error('Only USDT and TRX withdrawals are supported');
    }

    if (amount < 15) {
        throw new Error('Minimum withdrawal amount is $15');
    }

    const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', currency)
        .single();

    if (!wallet || wallet.balance < amount) {
        throw new Error('Insufficient balance');
    }

    const feePercent = 7;
    const fee = (amount * feePercent) / 100;
    const netAmount = amount - fee;

    const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert({
            user_id: userId,
            currency,
            amount,
            fee,
            net_amount: netAmount,
            wallet_address: walletAddress,
            status: 'pending',
        })
        .select()
        .single();

    if (error) throw error;

    await supabase
        .from('wallets')
        .update({
            balance: supabase.raw(`balance - ${amount}`),
            total_withdrawn: supabase.raw(`total_withdrawn + ${amount}`),
        })
        .eq('user_id', userId)
        .eq('currency', currency);

    await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            type: 'withdrawal',
            currency,
            amount,
            fee,
            net_amount: netAmount,
            status: 'pending',
            reference_id: data.id,
            wallet_address: walletAddress,
        });

    return data;
};
