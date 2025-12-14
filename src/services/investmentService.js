import { supabase } from '../lib/supabase';

export const getInvestmentPlans = async () => {
    const { data, error } = await supabase
        .from('investment_plans')
        .select('*')
        .eq('status', 'active')
        .order('min_amount');

    if (error) throw error;
    return data;
};

export const getUserInvestments = async (userId) => {
    const { data, error } = await supabase
        .from('investments')
        .select(`
            *,
            investment_plans (name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(inv => {
        const startDate = new Date(inv.start_date);
        const endDate = new Date(inv.end_date);
        const today = new Date();
        const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.min(Math.floor((today - startDate) / (1000 * 60 * 60 * 24)), totalDays);
        const daysRemaining = Math.max(totalDays - daysElapsed, 0);

        return {
            ...inv,
            plan_name: inv.investment_plans.name,
            days_elapsed: daysElapsed,
            days_remaining: daysRemaining,
        };
    });
};

export const createInvestment = async (userId, planId, amount) => {
    const { data: plan, error: planError } = await supabase
        .from('investment_plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (planError) throw planError;

    if (amount < plan.min_amount || amount > plan.max_amount) {
        throw new Error(`Amount must be between $${plan.min_amount} and $${plan.max_amount}`);
    }

    const roiRate = (plan.roi_rate_min + plan.roi_rate_max) / 2;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const { data, error } = await supabase
        .from('investments')
        .insert({
            user_id: userId,
            plan_id: planId,
            amount,
            roi_rate: roiRate,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'active',
        })
        .select()
        .single();

    if (error) throw error;

    await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            type: 'investment',
            currency: 'USDT',
            amount,
            fee: 0,
            net_amount: amount,
            status: 'completed',
            reference_id: data.id,
        });

    await supabase
        .from('wallets')
        .update({
            balance: supabase.raw(`balance + ${amount}`),
            total_deposited: supabase.raw(`total_deposited + ${amount}`),
        })
        .eq('user_id', userId)
        .eq('currency', 'USDT');

    const { data: user } = await supabase
        .from('users')
        .select('referrer_id')
        .eq('id', userId)
        .single();

    if (user?.referrer_id) {
        const commissionAmount = (amount * plan.referral_commission) / 100;

        await supabase
            .from('referral_commissions')
            .insert({
                referrer_id: user.referrer_id,
                referred_id: userId,
                investment_id: data.id,
                investment_amount: amount,
                commission_rate: plan.referral_commission,
                commission_amount: commissionAmount,
                status: 'paid',
            });

        await supabase
            .from('wallets')
            .update({
                referral_balance: supabase.raw(`referral_balance + ${commissionAmount}`),
                balance: supabase.raw(`balance + ${commissionAmount}`),
            })
            .eq('user_id', user.referrer_id)
            .eq('currency', 'USDT');

        await supabase
            .from('transactions')
            .insert({
                user_id: user.referrer_id,
                type: 'referral_commission',
                currency: 'USDT',
                amount: commissionAmount,
                fee: 0,
                net_amount: commissionAmount,
                status: 'completed',
                reference_id: data.id,
            });
    }

    return data;
};
