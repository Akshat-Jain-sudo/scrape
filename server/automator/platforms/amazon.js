/**
 * amazon.js — Playwright automation for Amazon India
 * Handles: Login → Product page → Add to Cart → Checkout → Address fill → Pause at payment
 */

export async function automateAmazon(page, credentials, productUrl, deliveryAddress) {
  const steps = [];

  const log = (msg) => {
    console.log(`[Amazon] ${msg}`);
    steps.push({ step: msg, timestamp: new Date().toISOString() });
  };

  // ── Step 1: Navigate to product ──
  log('Navigating to product page...');
  await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // ── Step 2: Check if login is needed ──
  const isLoggedIn = await page.$('#nav-link-accountList-nav-line-1');
  const accountText = isLoggedIn ? await isLoggedIn.innerText() : '';
  if (!accountText || accountText.toLowerCase().includes('sign in')) {
    log('Not logged in. Navigating to login...');
    await page.goto('https://www.amazon.in/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.in%2F&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=inflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Email step
    log('Entering email/phone...');
    await page.fill('#ap_email', credentials.username);
    await page.click('#continue');
    await page.waitForTimeout(1500);

    // Password step
    log('Entering password...');
    await page.fill('#ap_password', credentials.password);
    await page.click('#signInSubmit');
    await page.waitForTimeout(3000);

    // Check for OTP / CAPTCHA / 2FA
    const currentUrl = page.url();
    if (currentUrl.includes('ap/cvf') || currentUrl.includes('ap/mfa') || currentUrl.includes('ap/challenge')) {
      log('OTP or CAPTCHA detected — pausing for user input');
      return { status: 'needs_otp', steps, message: 'OTP or CAPTCHA required. Please complete in the browser window.' };
    }

    log('Login successful');
    // Navigate back to product
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } else {
    log('Already logged in');
  }

  // ── Step 3: Add to Cart ──
  log('Adding product to cart...');
  const addToCartBtn = await page.$('#add-to-cart-button, #submit.add-to-cart-button, input[name="submit.add-to-cart"]');
  if (!addToCartBtn) {
    return { status: 'error', steps, message: 'Could not find "Add to Cart" button on this product page.' };
  }
  await addToCartBtn.click();
  await page.waitForTimeout(2000);

  // ── Step 4: Proceed to Checkout ──
  log('Proceeding to checkout...');
  await page.goto('https://www.amazon.in/gp/cart/view.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const proceedBtn = await page.$('input[name="proceedToRetailCheckout"], .sc-proceed-to-checkout');
  if (proceedBtn) {
    await proceedBtn.click();
    await page.waitForTimeout(3000);
  }

  // ── Step 5: Fill Delivery Address ──
  const onAddressPage = await page.$('#add-new-address-popover-link, #address-book-entry-0, #shipToThisAddress');
  if (onAddressPage && deliveryAddress) {
    log('Filling delivery address...');
    try {
      // Click "Add a new address" if needed
      const addNewAddr = await page.$('#add-new-address-popover-link');
      if (addNewAddr) await addNewAddr.click();
      await page.waitForTimeout(1000);

      const fullName = await page.$('#enterAddressFullName');
      if (fullName) await fullName.fill(deliveryAddress.name || '');
      const phone = await page.$('#enterAddressPhoneNumber');
      if (phone) await phone.fill(deliveryAddress.phone || '');
      const addressLine1 = await page.$('#enterAddressAddressLine1');
      if (addressLine1) await addressLine1.fill(deliveryAddress.line1 || '');
      const addressLine2 = await page.$('#enterAddressAddressLine2');
      if (addressLine2) await addressLine2.fill(deliveryAddress.line2 || '');
      const city = await page.$('#enterAddressCity');
      if (city) await city.fill(deliveryAddress.city || '');
      const pincode = await page.$('#enterAddressPostalCode');
      if (pincode) await pincode.fill(deliveryAddress.pincode || '');

      const saveAddr = await page.$('#shipToThisAddress, .a-button-primary[name="shipToThisAddress"]');
      if (saveAddr) await saveAddr.click();
      await page.waitForTimeout(2000);
      log('Address filled');
    } catch (e) {
      log(`Address fill warning: ${e.message}`);
    }
  }

  // ── Step 6: Reach Payment Page and PAUSE ──
  log('Reached checkout. Pausing before payment page for user confirmation.');
  const paymentPage = await page.$('#checkout-payment-container, #ppxReturnUrl, .payment-selection');
  if (paymentPage) {
    return { status: 'awaiting_payment', steps, message: 'Ready to place order. Review the order summary and click "Confirm & Pay" in Symbiote.' };
  }

  return { status: 'awaiting_payment', steps, message: 'At checkout. Please review and confirm to proceed with payment.' };
}

/**
 * Confirm the order — click the final "Place your order" button on Amazon.
 * Called only when user explicitly confirms in the Symbiote UI.
 */
export async function confirmAmazonOrder(page) {
  try {
    const placeOrderBtn = await page.$('#submitOrderButtonId input, #placeYourOrder input, .place-your-order-button');
    if (!placeOrderBtn) {
      return { status: 'error', message: 'Could not find "Place Order" button. Please complete manually.' };
    }
    await placeOrderBtn.click();
    await page.waitForTimeout(5000);

    // Try to extract order confirmation number
    const orderIdEl = await page.$('.a-size-medium.a-color-success, #widget-purchaseConfirmationStatus');
    const orderId = orderIdEl ? await orderIdEl.innerText() : 'Order placed (ID not found)';

    return { status: 'placed', orderId: orderId.trim(), message: 'Order placed successfully!' };
  } catch (e) {
    return { status: 'error', message: `Failed to place order: ${e.message}` };
  }
}
