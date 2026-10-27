import { test, expect } from '@playwright/test';

test('discovery map renders located shops, preserves unlocated results, and opens a shop popup', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 22.7196, longitude: 75.8577 });
    await page.route('https://**.tile.openstreetmap.org/**', (route) => route.abort());
    await page.route('**/api/discovery?*', (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
            {
                id: 42,
                name: 'Map Test Shop',
                category: 'Grocery',
                address: '1 Market Street',
                latitude: 22.72,
                longitude: 75.86,
            },
            { id: 43, name: 'Unmapped Shop', category: 'General' },
        ]),
    }));

    await page.goto('/discover');

    await expect(page.getByRole('heading', { name: 'Shop map' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('1 of 2 shops have map locations')).toBeVisible();
    await expect(page.getByText('Shops without saved coordinates are still available in the results below.'))
        .toBeVisible();
    await expect(page.getByText('Unmapped Shop')).toBeVisible();

    const mapPaths = page.locator('.leaflet-overlay-pane path.leaflet-interactive');
    await expect(mapPaths).toHaveCount(3);
    await mapPaths.nth(2).click({ force: true });
    await expect(page.locator('.leaflet-popup')).toContainText('Map Test Shop');
    await expect(page.locator('.leaflet-popup').getByRole('link', { name: 'View shop' }))
        .toHaveAttribute('href', '/shop/42');
});

test('authenticated browser checkout creates an order, clears the server cart, and refunds redeemed points on cancellation', async ({ page, request }) => {
    test.setTimeout(120000);
    const apiBase = 'http://127.0.0.1:7070/api';
    const loginResponse = await request.post(`${apiBase}/auth/login`, {
        data: { email: 'buyer', password: 'password' },
    });
    expect(loginResponse.ok()).toBeTruthy();

    const { token, user } = await loginResponse.json();
    const authHeaders = { 'X-Auth-Token': token, 'Content-Type': 'application/json' };
    const productsResponse = await request.get(`${apiBase}/products`);
    expect(productsResponse.ok()).toBeTruthy();
    const product = (await productsResponse.json()).find((item) => item.name === 'Milk 1L');
    expect(product).toBeTruthy();

    const clearResponse = await request.delete(`${apiBase}/cart`, { headers: authHeaders });
    expect(clearResponse.ok()).toBeTruthy();
    const addResponse = await request.post(`${apiBase}/cart/items`, {
        headers: authHeaders,
        data: { productId: product.id, shopId: product.shopId, quantity: 1, price: 1 },
    });
    expect(addResponse.ok()).toBeTruthy();
    const cart = await addResponse.json();
    expect(cart.items[0].price).toBe(product.price);

    await page.route('**/api/delivery/slots?*', (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
            id: 'test-scheduled-slot',
            fulfillmentType: 'SCHEDULED',
            label: 'Test delivery slot',
            windowStart: '18:00',
            windowEnd: '20:00',
            displayWindow: '6:00 PM - 8:00 PM',
            deliveryCharge: 0,
            available: true,
        }]),
    }));
    await page.route('**/api/delivery/serviceability?*', (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ serviceable: false, message: 'Test area' }),
    }));
    await page.route(`**/api/shops/${product.shopId}/available-slots?*`, (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
            id: 'test-pickup-slot',
            fulfillmentType: 'PICKUP',
            label: 'Test pickup slot',
            windowStart: '18:00',
            windowEnd: '20:00',
            displayWindow: '6:00 PM - 8:00 PM',
            deliveryCharge: 0,
            available: true,
        }]),
    }));

    await page.addInitScript(({ authToken, authUser }) => {
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(authUser));
        localStorage.removeItem('cart');
    }, { authToken: token, authUser: user });
    await page.goto('/checkout');

    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    await expect(page.getByText(/5000 points available/)).toBeVisible();
    await page.getByLabel('Enter points to redeem').fill('500');
    await expect(page.getByText('Saved Rs 6.00 with loyalty points.')).toBeVisible();

    await page.getByRole('button', { name: 'Self-Collect' }).click();
    await page.getByRole('button', { name: /6:00 PM - 8:00 PM/ }).click();
    await page.locator('input[name="fullName"]').fill('Phase Two Test Buyer');
    await page.locator('input[name="email"]').fill('buyer@orioncart.test');
    await page.locator('input[name="phone"]').fill('9999999999');
    await page.getByRole('button', { name: 'Continue to Payment' }).click();

    await expect(page.getByRole('heading', { name: 'Payment', exact: true })).toBeVisible();
    await page.getByRole('radio', { name: 'Cash on Delivery' }).check();
    await page.getByRole('button', { name: /Pay Rs/ }).click();

    await expect(page.getByRole('heading', { name: 'Order Placed Successfully!' })).toBeVisible();
    const orderText = await page.locator('main').innerText();
    const orderId = orderText.match(/Order #(\d+)/)?.[1];
    expect(orderId).toBeTruthy();

    const clearedCartResponse = await request.get(`${apiBase}/cart`, { headers: authHeaders });
    expect(clearedCartResponse.ok()).toBeTruthy();
    expect((await clearedCartResponse.json()).items).toHaveLength(0);

    const redeemedBalanceResponse = await request.get(`${apiBase}/loyalty/balance`, { headers: authHeaders });
    expect(redeemedBalanceResponse.ok()).toBeTruthy();
    expect((await redeemedBalanceResponse.json()).pointsBalance).toBe(4500);
    const redemptionTransactionsResponse = await request.get(`${apiBase}/loyalty/transactions`, { headers: authHeaders });
    expect(redemptionTransactionsResponse.ok()).toBeTruthy();
    const redemptionTransactions = await redemptionTransactionsResponse.json();
    expect(redemptionTransactions.some((transaction) => (
        transaction.transactionType === 'REDEMPTION'
            && transaction.pointsChange === -500
            && transaction.referenceId === Number(orderId)
    ))).toBeTruthy();

    const cancellationResponse = await request.put(
        `${apiBase}/orders/${orderId}/status?status=CANCELLED`,
        { headers: authHeaders },
    );
    expect(cancellationResponse.ok()).toBeTruthy();

    const balanceResponse = await request.get(`${apiBase}/loyalty/balance`, { headers: authHeaders });
    expect(balanceResponse.ok()).toBeTruthy();
    expect((await balanceResponse.json()).pointsBalance).toBe(5000);

    const transactionsResponse = await request.get(`${apiBase}/loyalty/transactions`, { headers: authHeaders });
    expect(transactionsResponse.ok()).toBeTruthy();
    const transactions = await transactionsResponse.json();
    expect(transactions.some((transaction) => (
        transaction.transactionType === 'REDEMPTION_REFUND'
            && transaction.referenceId === Number(orderId)
    ))).toBeTruthy();
});
