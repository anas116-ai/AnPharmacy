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
    backgroundColor: '#FFFFFF',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function forceLightMode() {
    await win.webContents.executeJavaScript(`
      try {
        localStorage.setItem('anpharmacy-theme', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.classList.remove('dark');
      } catch (e) {
        console.error(e);
      }
    `);
  }

  async function capture(name) {
    await forceLightMode();
    await sleep(1500);
    const image = await win.capturePage();
    const filePath = path.join(outDir, `${name}.png`);
    fs.writeFileSync(filePath, image.toPNG());
    console.log(`[Captured] ${name}.png (${(fs.statSync(filePath).size / 1024).toFixed(1)} KB)`);
  }

  async function navHash(hash, name) {
    console.log(`Navigating to #${hash}...`);
    await win.webContents.executeJavaScript(`
      window.location.hash = '#${hash}';
      try {
        localStorage.setItem('anpharmacy-theme', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      } catch (e) {}
    `);
    await capture(name);
  }

  try {
    // 1. Landing Page
    console.log('1. Loading Landing Page...');
    await win.loadURL('http://localhost:5174/');
    await sleep(2500);
    await capture('01_landing_page');

    // 2. Login Screen
    console.log('2. Navigating to Login Screen...');
    await win.webContents.executeJavaScript(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In') || b.textContent.includes('Enter the Dashboard'));
      if (btn) btn.click();
    `);
    await sleep(1800);
    await capture('02_login_screen');

    // 3. Login as Admin & Capture Dashboard
    console.log('3. Signing in as Admin for Dashboard...');
    await win.webContents.executeJavaScript(`
      const adminBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Admin');
      if (adminBtn) adminBtn.click();
      setTimeout(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }, 300);
    `);
    await sleep(2500);
    await capture('03_dashboard');

    // 4. Stock (Inventory)
    console.log('4. Navigating to Stock...');
    await navHash('stock', '04_stock_inventory');

    // 5. Add Stock Form
    console.log('5. Navigating to Add Stock...');
    await navHash('add-stock', '05_add_stock_form');

    // 6. Purchases Management
    console.log('6. Navigating to Purchases...');
    await navHash('purchases', '06_purchases');

    // 7. Data Import Studio
    console.log('7. Navigating to Data Import...');
    await navHash('data-import', '07_data_import');

    // 8. Sales (Billing / POS)
    console.log('8. Navigating to Sales (Billing/POS)...');
    await navHash('sales', '08_sales_billing');

    // 9. Reports & Analytics
    console.log('9. Navigating to Reports...');
    await navHash('reports', '09_reports');

    // 10. Discounts & Schemes
    console.log('10. Navigating to Discounts...');
    await navHash('discounts', '10_discounts');

    // 11. Sales History
    console.log('11. Navigating to Sales History...');
    await navHash('sales-history', '11_sales_history');

    // Optional High-Value: Scan Invoice OCR & Suppliers
    console.log('12. Navigating to Scan Invoice OCR...');
    await navHash('scan-invoice', '12_scan_invoice_ocr');

    console.log('13. Navigating to Suppliers Directory...');
    await navHash('suppliers', '13_suppliers_directory');

    console.log('>>> ALL 13 LIGHT-MODE SCREENSHOTS CAPTURED PERFECTLY! <<<');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    app.quit();
  }
});
