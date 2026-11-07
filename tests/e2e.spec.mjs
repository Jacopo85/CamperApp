import {test, expect} from '@playwright/test';

test('CamperApp: due account Android simulati, invito, spesa, mete e Maps', async ({browser}) => {
  const options = {viewport: {width: 412, height: 915}, isMobile: true, hasTouch: true, serviceWorkers: 'block'};
  const ownerContext = await browser.newContext(options);
  const memberContext = await browser.newContext(options);
  const owner = await ownerContext.newPage();
  const member = await memberContext.newPage();
  const errors = [];
  for (const page of [owner, member]) page.on('pageerror', e => errors.push(e.message));
  const stamp = Date.now();
  const password = 'DemoPassword123!';
  let inviteCode = '';
  owner.on('dialog', async dialog => {
    const match = dialog.message().match(/secondo account:\s*([A-Z0-9]{16})/);
    if (match) inviteCode = match[1];
    await dialog.accept();
  });
  try {
    await owner.goto('/?emulator=1');
    await expect(owner.locator('#authView')).toBeVisible();
    await owner.locator('#email').fill('owner-' + stamp + '@example.com');
    await owner.locator('#password').fill(password);
    await owner.locator('#registerBtn').click();
    await expect(owner.locator('#groupView')).toBeVisible();
    await owner.locator('#groupName').fill('Test CamperApp');
    await owner.locator('#createGroupBtn').click();
    await expect(owner.locator('#appView')).toBeVisible();
    await expect(owner.locator('#ownerInvitePanel')).toBeVisible();
    expect(inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{16}$/);

    await member.goto('/?emulator=1');
    await expect(member.locator('#authView')).toBeVisible();
    await member.locator('#email').fill('member-' + stamp + '@example.com');
    await member.locator('#password').fill(password);
    await member.locator('#registerBtn').click();
    await expect(member.locator('#groupView')).toBeVisible();
    await member.locator('#inviteCode').fill(inviteCode);
    await member.locator('#joinGroupBtn').click();
    await expect(member.locator('#appView')).toBeVisible();
    await expect(member.locator('#ownerInvitePanel')).toBeHidden();
    await expect(member.locator('#groupTitle')).toHaveText('Test CamperApp');

    await owner.locator('.tab[data-tab="shopping"]').click();
    await member.locator('.tab[data-tab="shopping"]').click();
    await owner.locator('#itemName').fill('Acqua');
    await owner.locator('#itemQty').fill('2 confezioni');
    await owner.locator('#shoppingForm button[type="submit"]').click();
    await expect(member.locator('#shoppingList')).toContainText('Acqua');
    await member.locator('#shoppingList input[type="checkbox"]').check();
    await expect(owner.locator('#shoppingList li.checked')).toContainText('Acqua');

    await member.locator('.tab[data-tab="wishlist"]').click();
    await owner.locator('.tab[data-tab="wishlist"]').click();
    await member.locator('#placeName').fill('Lago di Garda');
    await member.locator('#placeAddress').fill('Sirmione, Italia');
    await member.locator('#wishlistForm button[type="submit"]').click();
    await expect(owner.locator('#wishlistList')).toContainText('Lago di Garda');

    await owner.locator('.tab[data-tab="itinerary"]').click();
    await owner.locator('#routeOrigin').fill('Milano');
    await owner.locator('#routeDestination').fill('Firenze');
    const popupPromise = owner.waitForEvent('popup');
    await owner.locator('#itineraryForm button[type="submit"]').click();
    const mapsPage = await popupPromise;
    await expect(mapsPage).toHaveURL(/google\.com\/maps\/dir\/\?/);
    const url = new URL(mapsPage.url());
    expect(url.searchParams.get('origin')).toBe('Milano');
    expect(url.searchParams.get('destination')).toBe('Firenze');
    await mapsPage.close();
    expect(errors).toEqual([]);
  } finally {
    await ownerContext.close();
    await memberContext.close();
  }
});
