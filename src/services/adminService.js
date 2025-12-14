import { supabase } from '../lib/supabase';

export const getWithdrawalRequests = async () => {
    const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
            *,
            user:users!withdrawal_requests_user_id_fkey(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(w => ({
        ...w,
        user_name: `${w.user.first_name} ${w.user.last_name}`,
        user_email: w.user.email,
    }));
};

export const processWithdrawalRequest = async (withdrawalId, action, adminUserId, adminNotes = '') => {
    if (!['approve', 'reject'].includes(action)) {
        throw new Error('Invalid action');
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { error } = await supabase
        .from('withdrawal_requests')
        .update({
            status: newStatus,
            approved_by: adminUserId,
            approved_at: new Date().toISOString(),
            admin_notes: adminNotes,
        })
        .eq('id', withdrawalId);

    if (error) throw error;

    return { success: true };
};
