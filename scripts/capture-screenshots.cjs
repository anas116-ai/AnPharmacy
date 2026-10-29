const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'docs', 'screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function capture(name) {
    await sleep(1200);
    const image = await win.capturePage();
    const filePath = path.join(outDir, `${name}.png`);
    fs.writeFileSync(filePath, image.toPNG());
    console.log(`Captured: ${name}.png (${fs.statSync(filePath).size} bytes)`);
  }

  try {
    // 1. Landing Page
    console.log('Loading Landing Page...');
    await win.loadURL('http://localhost:5174/');
    await sleep(2000);
    await capture('01_landing_page');

    // 2. Login Screen
    console.log('Navigating to Login Screen...');
    await win.webContents.executeJavaScript(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In') || b.textContent.includes('Enter the Dashboard'));
      if (btn) btn.click();
    `);
    await sleep(1500);
    await capture('02_login_screen');

    // 3. Login as Admin
    console.log('Signing in as Admin...');
    await win.webContents.executeJavaScript(`
      const adminBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Admin');
      if (adminBtn) adminBtn.click();
      setTimeout(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }, 300);
    `);
    await sleep(2500);
    await capture('03_executive_dashboard');

    // Helper to click sidebar nav by label
    async function navigateTo(label, screenName) {
      console.log(`Navigating to ${label}...`);
      await win.webContents.executeJavaScript(`
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.trim().includes('${label}'));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })()
      `);
      await sleep(1500);
      await capture(screenName);
    }

    // 4. Stock / Inventory
    await navigateTo('Stock', '04_inventory_fefo');

    // 5. Purchases
    await navigateTo('Purchases', '05_purchases_management');

    // 6. Sales
    await navigateTo('Sales', '06_point_of_sale');

    // 7. Reports & Analytics
    await navigateTo('Reports', '07_reports_analytics');

    // 8. Data Import Studio
    await navigateTo('Data Import', '08_data_import_studio');

    // 9. Suppliers
    await navigateTo('Suppliers', '09_suppliers_directory');

    console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    app.quit();
  }
});
