import { shopAPI, productAPI, orderAPI } from './services/api';

const normalize = (value) => (value || '').toString().toLowerCase();

export const api = {
    getShops: () => shopAPI.getAllShops(),
    getShopById: (id) => shopAPI.getShopById(id),
    getShopsByCategory: (category) => shopAPI.getShopsByCategory(category),

    getProductsByShop: (shopId) => productAPI.getProductsByShop(shopId),
    addProduct: (productData) => productAPI.addProduct(productData),
    updateProduct: (id, productData) => productAPI.updateProduct(id, productData),
    deleteProduct: (id) => productAPI.deleteProduct(id),

    createOrder: (orderData) => orderAPI.createOrder(orderData),
    getOrdersByShop: (shopId) => orderAPI.getOrdersBySeller(shopId),

    // Search library products via local DB, OpenFoodFacts, and Wikipedia
    searchLibraryProducts: async (query) => {
        if (!query || query.length < 2) return [];
        const q = normalize(query.trim());
        const results = [];
        const uniqueByName = new Map();

        // 1. Search local catalog first
        try {
            const products = await productAPI.getAll();
            for (const p of products || []) {
                const name = (p?.name || '').trim();
                if (!name) continue;
                const key = normalize(name);
                if (!uniqueByName.has(key) && normalize(name).includes(q)) {
                    uniqueByName.set(key, {
                        name,
                        category: p?.category || p?.description || '',
                        price: Number(p?.price || 0),
                        imageUrl: p?.imageUrl || '',
                    });
                }
            }
        } catch (e) {
            // Ignore local fetch errors
        }

        // Add local results
        results.push(...Array.from(uniqueByName.values()).slice(0, 4));

        // 2. Fetch from OpenFoodFacts
        try {
            const offRes = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=3`);
            const offData = await offRes.json();
            if (offData.products && offData.products.length > 0) {
                for (const p of offData.products) {
                    const name = p.product_name || p.generic_name;
                    if (!name) continue;
                    const key = normalize(name);
                    if (!uniqueByName.has(key)) {
                        uniqueByName.set(key, true);
                        results.push({
                            name: name,
                            category: p.categories?.split(',')[0]?.trim() || 'Grocery',
                            price: 0,
                            imageUrl: p.image_front_url || p.image_url || '',
                        });
                    }
                }
            }
        } catch (e) {}

        // 3. Fallback to Wikipedia Image API if still need more results
        if (results.length < 5) {
            try {
                const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(query)}&origin=*`);
                const wikiData = await wikiRes.json();
                const pages = wikiData.query?.pages;
                if (pages) {
                    const firstPageId = Object.keys(pages)[0];
                    if (firstPageId !== '-1' && pages[firstPageId].original) {
                        const title = pages[firstPageId].title;
                        const key = normalize(title);
                        if (!uniqueByName.has(key)) {
                            uniqueByName.set(key, true);
                            results.push({
                                name: title,
                                category: 'General',
                                price: 0,
                                imageUrl: pages[firstPageId].original.source,
                            });
                        }
                    }
                }
            } catch (e) {}
        }

        return results.slice(0, 8);
    },
};
