import { supabase } from '../lib/supabase';

export const getBinaryTree = async (userId) => {
    const { data: treeData, error } = await supabase
        .from('binary_tree')
        .select(`
            *,
            user:users!binary_tree_user_id_fkey(id, first_name, last_name, email),
            parent:users!binary_tree_parent_id_fkey(id, first_name, last_name),
            left_child:users!binary_tree_left_child_id_fkey(id, first_name, last_name),
            right_child:users!binary_tree_right_child_id_fkey(id, first_name, last_name)
        `)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return treeData;
};

export const getBinaryCommissions = async (userId) => {
    const { data, error } = await supabase
        .from('binary_commissions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};
