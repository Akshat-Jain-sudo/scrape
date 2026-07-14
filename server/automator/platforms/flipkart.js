/**
 * flipkart.js — Playwright automation for Flipkart
 * Handles: Login → Product page → Add to Cart → Checkout → Address fill → Pause at payment
 */

export async function automateFlipkart(page, credentials, productUrl, deliveryAddress) {
  const steps = [];
  const log = (msg) => {
    console.log(`[Flipkart] ${msg}`);
    steps.push({ step: msg, timestamp: new Date().toISOString() });
  };

  // ── Step 1: Navigate to product ──
  log('Navigating to product page...');
  await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // ── Step 2: Login if needed ──
  const loginBtn = await page.$('._2eZBbd, a[href*="login"]');
  const loginText = loginBtn ? await loginBtn.innerText().catch(() => '') : '';
  if (loginText.toLowerCase().includes('login')) {
    log('Not logged in. Opening login dialog...');
    await loginBtn.click();
    await page.waitForTimeout(1500);

    // Fill phone / email
    log('Entering credentials...');
    const emailField = await page.$('input[type="text"]');
    if (emailField) await emailField.fill(credentials.username);
    const passField = await page.$('input[type="password"]');
    if (passField) await passField.fill(credentials.password);

    const submitBtn = await page.$('button[type="submit"], ._2AkmmA');
    if (submitBtn) await submitBtn.click();
    await page.waitForTimeout(3000);

    // OTP check
    const otpField = await page.$('input[placeholder*="OTP"]');
    if (otpField) {
      log('OTP detected — pausing for user input');
      return { status: 'needs_otp', steps, message: 'OTP required to login to Flipkart. Please enter it in the browser window.' };
    }
    log('Login successful');
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } else {
    log('Already logged in');
  }

  // ── Step 3: Add to Cart ──
  log('Adding to cart...');
  const addToCartBtn = await page.$('._2KpZ6l._2U9uOA._3v1-wW, button:has-text("ADD TO CART"), button:has-text("Add to Cart")');
  if (!addToCartBtn) {
    return { status: 'error', steps, message: 'Could not find "Add to Cart" button on this page.' };
  }
  await addToCartBtn.click();
  await page.waitForTimeout(2000);

  // ── Step 4: Go to cart and checkout ──
  log('Navigating to cart...');
  await page.goto('https://www.flipkart.com/viewcart', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const placeOrderBtn = await page.$('._2d5LQa, button:has-text("PLACE ORDER"), button:has-text("Place Order")');
  if (placeOrderBtn) {
    await placeOrderBtn.click();
    await page.waitForTimeout(3000);
    log('Proceeding to checkout');
  }

  // ── Step 5: Fill address ──
  if (deliveryAddress) {
    const addNewAddr = await page.$('._3459J8, button:has-text("Add new address")');
    if (addNewAddr) {
      await addNewAddr.click();
      await page.waitForTimeout(1000);
      try {
        const nameField = await page.$('input[placeholder*="Name"]');
        if (nameField) await nameField.fill(deliveryAddress.name || '');
        const phoneField = await page.$('input[placeholder*="Phone"]');
        if (phoneField) await phoneField.fill(deliveryAddress.phone || '');
        const pincodeField = await page.$('input[placeholder*="Pincode"]');
        if (pincodeField) await pincodeField.fill(deliveryAddress.pincode || '');
        const addr1Field = await page.$('input[placeholder*="Address"]');
        if (addr1Field) await addr1Field.fill(deliveryAddress.line1 || '');
        const cityField = await page.$('input[placeholder*="City"]');
        if (cityField) await cityField.fill(deliveryAddress.city || '');
        const saveBtn = await page.$('button:has-text("Save"), ._3GHcYB');
        if (saveBtn) await saveBtn.click();
        await page.waitForTimeout(2000);
        log('Address saved');
      } catch (e) {
        log(`Address fill warning: ${e.message}`);
      }
    }
  }

  // ── Step 6: Pause before payment ──
  log('Reached payment step. Pausing for user confirmation.');
  return { status: 'awaiting_payment', steps, message: 'At Flipkart checkout. Review and click "Confirm & Pay" in Symbiote to complete.' };
}

export async function confirmFlipkartOrder(page) {
  try {
    const confirmBtn = await page.$('button:has-text("CONFIRM ORDER"), ._2d5LQa._3HqJxg');
    if (!confirmBtn) {
      return { status: 'error', message: 'Could not find the final confirm button. Please complete manually.' };
    }
    await confirmBtn.click();
    await page.waitForTimeout(5000);
    const successEl = await page.$('._1YokD2._3Mn1Gg, .CXW8mj');
    const orderId = successEl ? await successEl.innerText() : 'Order placed';
    return { status: 'placed', orderId: orderId.trim(), message: 'Order placed on Flipkart!' };
  } catch (e) {
    return { status: 'error', message: `Failed to place Flipkart order: ${e.message}` };
  }
}
