import { test, expect } from '@playwright/test';

test.describe('Antigravity E2E Flows', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Product Data
        await page.route('**/api/products/shop/1', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 1, name: 'Maggi', category: 'Instant Food', price: 14, stock: 10, imageUrl: 'https://via.placeholder.com/150' },
                ])
            });
        });

        // Mock Shop Data
        await page.route('**/api/shops', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 1, name: 'Sharma General Store', category: 'Groceries', distance: 1.2, isOpen: true }
                ])
            });
        });
    });

    test('Seller Dashboard: Quick Stock Update', async ({ page }) => {
        // Go to dashboard
        await page.goto('/seller-dashboard');

        // 1. Verify item exists
        const row = page.getByRole('row', { name: 'Maggi' });
        await expect(row).toBeVisible();

        // 2. Identify Controls
        const stockValue = row.getByTestId('stock-value');
        const incrementBtn = row.getByTestId('increment-btn');

        await expect(stockValue).toHaveText('10');

        // 3. Mock the Update Call
        let updatePayload = null;
        await page.route('**/api/products/1', async route => {
            updatePayload = JSON.parse(await route.request().postData() || '{}');
            await route.fulfill({ status: 200, body: JSON.stringify({ ...updatePayload, id: 1 }) });
        });

        // 4. Click Increment
        await incrementBtn.click();

        // 5. Verify Optimistic UI update
        await expect(stockValue).toHaveText('11');
    });

    test('Customer: Discovery Page Load', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByText('OrionCart')).toBeVisible();
        // Verify our mocked shop appears
        await expect(page.getByText('Sharma General Store')).toBeVisible();
    });
});
