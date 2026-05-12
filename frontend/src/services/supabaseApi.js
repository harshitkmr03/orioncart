const SUPABASE_BASE = '/api/supabase';

export const supabaseApi = {
    getShops: async () => {
        const res = await fetch(`${SUPABASE_BASE}/shops`);
        if (!res.ok) throw new Error('Failed to fetch shops from supabase');
        return res.json();
    },

    getProducts: async (shopId) => {
        const url = shopId ? `${SUPABASE_BASE}/products?shopId=${shopId}` : `${SUPABASE_BASE}/products`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch products from supabase');
        return res.json();
    },

    getCategories: async () => {
        const res = await fetch(`${SUPABASE_BASE}/categories`);
        if (!res.ok) throw new Error('Failed to fetch categories from supabase');
        return res.json();
    }
};
