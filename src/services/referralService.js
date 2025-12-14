import { supabase } from '../lib/supabase';

export const getReferralData = async (userId) => {
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', userId)
        .single();

    if (userError) throw userError;

    const { data: referrals, error: referralsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at, status')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

    if (referralsError) throw referralsError;

    const { data: commissions, error: commissionsError } = await supabase
        .from('referral_commissions')
        .select(`
            *,
            referred:users!referral_commissions_referred_id_fkey(first_name, last_name)
        `)
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

    if (commissionsError) throw commissionsError;

    const totalEarnings = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);

    return {
        referral_code: user.referral_code,
        referrals,
        commissions,
        total_earnings: totalEarnings,
        total_referrals: referrals.length,
    };
};
