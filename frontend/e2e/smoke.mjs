import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:4200';
const API_URL = process.env['E2E_API_URL'] || 'http://localhost:8000/api';
const CHROME =
  process.env['CHROME_PATH'] ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR =
  process.env['E2E_SCREENSHOT_DIR'] ||
  path.join(process.env['TEMP'] || '.', 'optica-e2e-screenshots');

const stamp = Date.now();
const CLIENT_NAME = `Cliente UI ${stamp}`;
const CLIENT_PHONE = `9${String(stamp).slice(-8)}`;
const IMAGE_PATH = path.join(process.env['TEMP'] || '.', 'optica-e2e-receta.png');
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const steps = [];
const consoleErrors = [];

function ok(message) {
  steps.push(`OK  ${message}`);
  console.log(`OK  ${message}`);
}

async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (expected) => document.body.innerText.includes(expected),
    { timeout },
    text
  );
}

async function clickButton(page, text) {
  const clicked = await page.evaluate((label) => {
    const elements = Array.from(
      document.querySelectorAll('button, a, .mat-mdc-menu-item')
    );
    const target = elements.find((element) =>
      (element.textContent || '').replace(/\s+/g, ' ').trim().includes(label)
    );

    if (!target) {
      return false;
    }

    target.click();
    return true;
  }, text);

  if (!clicked) {
    throw new Error(`No se encontró un botón con el texto: ${text}`);
  }
}

async function fill(page, selector, value) {
  const element = await page.$(selector);

  if (!element) {
    throw new Error(`No se encontró el campo: ${selector}`);
  }

  await element.click({ clickCount: 3 });
  await element.type(String(value), { delay: 5 });
}

async function clickButtonInCard(page, cardText, buttonText) {
  const clicked = await page.evaluate(
    ({ cardText: expectedCard, buttonText: expectedButton }) => {
      const cards = Array.from(
        document.querySelectorAll('article, .delivery-card, .order-card')
      );
      const card = cards.find(
        (item) =>
          item.innerText.includes(expectedCard) &&
          Array.from(item.querySelectorAll('button')).some((button) =>
            button.innerText.includes(expectedButton)
          )
      );

      if (!card) {
        return false;
      }

      const button = Array.from(card.querySelectorAll('button')).find((item) =>
        item.innerText.includes(expectedButton)
      );
      button.click();
      return true;
    },
    { cardText, buttonText }
  );

  if (!clicked) {
    throw new Error(`No se encontró el botón "${buttonText}" en la tarjeta de ${cardText}.`);
  }
}

async function waitPath(page, pathname, timeout = 15000) {
  await page.waitForFunction(
    (expected) => window.location.pathname === expected,
    { timeout },
    pathname
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Asserción fallida: ${message}`);
  }
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.writeFileSync(IMAGE_PATH, Buffer.from(PNG_BASE64, 'base64'));

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=es-BO'],
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();

      if (/status of 409|409 \(Conflict\)/.test(text)) {
        return;
      }

      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(`pageerror: ${error.message}`);
  });

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Bienvenido');
    ok('Pantalla de inicio de sesión cargada');

    await fill(page, 'input[formcontrolname="username"]', 'ana');
    await fill(page, 'input[formcontrolname="password"]', 'Optica2026*');
    await clickButton(page, 'Ingresar al sistema');
    await waitPath(page, '/inicio');
    await waitForText(page, 'Hola, Ana');
    await page.waitForFunction(
      () => !document.querySelector('mat-progress-bar.loading-bar')
    );
    ok('Inicio de sesión y dashboard');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-dashboard.png'),
      fullPage: true,
    });

    await page.goto(`${BASE_URL}/clientes/nuevo`, { waitUntil: 'networkidle2' });
    await fill(page, 'input[formcontrolname="full_name"]', CLIENT_NAME);
    await fill(page, 'input[formcontrolname="phone"]', CLIENT_PHONE);
    await fill(page, 'textarea[formcontrolname="observations"]', 'Registro creado por prueba E2E.');
    await clickButton(page, 'Registrar cliente');
    await page.waitForFunction(
      (name) => document.body.innerText.includes(name) && window.location.pathname !== '/clientes/nuevo',
      { timeout: 20000 },
      CLIENT_NAME
    );
    await waitForText(page, 'Todavía no hay recetas');
    ok('Registro de cliente desde el formulario');

    await page.goto(`${BASE_URL}/clientes/nuevo`, { waitUntil: 'networkidle2' });
    await fill(page, 'input[formcontrolname="full_name"]', CLIENT_NAME);
    await fill(page, 'input[formcontrolname="phone"]', CLIENT_PHONE);
    await clickButton(page, 'Registrar cliente');
    await waitForText(page, 'Posible cliente repetido');
    ok('Aviso de posible cliente duplicado');
    await clickButton(page, 'Revisar datos');
    await page.waitForFunction(() => !document.body.innerText.includes('Posible cliente repetido'));

    await page.goto(`${BASE_URL}/clientes`, { waitUntil: 'networkidle2' });
    await fill(page, '.client-search input[type="search"]', CLIENT_NAME);
    await waitForText(page, CLIENT_NAME);
    ok('Búsqueda de clientes por nombre');

    await fill(page, '.client-search input[type="search"]', CLIENT_PHONE);
    await waitForText(page, CLIENT_NAME);
    await clickButton(page, CLIENT_NAME);
    await waitForText(page, 'Todavía no hay recetas');
    ok('Búsqueda de clientes por celular y apertura de la ficha');

    await clickButton(page, 'Registrar primera receta');
    await page.waitForFunction(
      () => window.location.pathname.endsWith('/recetas/nueva'),
      { timeout: 15000 }
    );
    await page.waitForSelector('input[type="file"][multiple]');
    await page.waitForFunction(
      () => {
        const button = [...document.querySelectorAll('button')].find((item) =>
          item.textContent.includes('Guardar receta')
        );
        return !!button && !button.disabled;
      },
      { timeout: 15000 }
    );

    const galleryInput = await page.$('input[type="file"][multiple]');
    await galleryInput.uploadFile(IMAGE_PATH);
    await page.waitForSelector('.photo-preview img');
    await fill(page, 'textarea[formcontrolname="observations"]', 'Receta creada por prueba E2E.');
    await clickButton(page, 'Guardar receta');
    await page.waitForFunction(
      () => !window.location.pathname.endsWith('/recetas/nueva'),
      { timeout: 20000 }
    );
    await waitForText(page, 'Receta creada por prueba E2E.');
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('.prescription__photos img'));
      return images.length > 0 && images.every((image) => image.naturalWidth > 0);
    });
    ok('Carga de fotografía de receta y vista previa');

    await page.click('.photo-thumb');
    await page.waitForSelector('.viewer', { timeout: 10000 });
    await page.waitForFunction(() => {
      const image = document.querySelector('.viewer img');
      return image && image.naturalWidth > 0;
    });
    await page.click('button[aria-label="Cerrar"]');
    await page.waitForFunction(() => !document.querySelector('.viewer'));
    ok('Visor de la fotografía protegida');

    await clickButton(page, 'Nuevo pedido');
    await waitPath(page, '/pedidos/nuevo');
    await waitForText(page, 'Nuevo pedido');
    await page.waitForSelector('input[formcontrolname="lens_type"]', { timeout: 20000 });
    await page.waitForFunction(
      () => {
        const button = [...document.querySelectorAll('button')].find((item) =>
          item.textContent.includes('Registrar pedido')
        );
        return !!button && !button.disabled;
      },
      { timeout: 15000 }
    );
    await fill(page, 'input[formcontrolname="lens_type"]', 'Progresivo');
    await fill(page, 'input[formcontrolname="price"]', '300');
    await fill(page, 'input[formcontrolname="advance"]', '100');
    await clickButton(page, 'Registrar pedido');
    await page.waitForFunction(
      () => /^\/pedidos\/\d+$/.test(window.location.pathname),
      { timeout: 20000 }
    );
    await waitForText(page, 'Pendiente');
    await waitForText(page, 'Historial de cambios');
    assert(
      (await page.evaluate(() => document.body.innerText)).includes('200,00') &&
        (await page.evaluate(() => document.body.innerText)).includes('Bs'),
      'el saldo debe calcularse como 300 - 100 y mostrarse en bolivianos (Bs)'
    );
    ok('Creación de pedido con receta anterior y saldo automático');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-order.png'),
      fullPage: true,
    });

    await clickButton(page, 'Marcar listo para entregar');
    await waitForText(page, 'Sí, marcar listo');
    await clickButton(page, 'Sí, marcar listo');
    await page.waitForFunction(() => document.body.innerText.includes('Listo para entregar'));
    await waitForText(page, 'Marcar como entregado');
    ok('Cambio a listo para entregar');

    await page.goto(`${BASE_URL}/entregas`, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Avisos de entrega');
    await waitForText(page, CLIENT_NAME);
    await clickButtonInCard(page, CLIENT_NAME, 'Ver pedido');
    await page.waitForFunction(
      () => /^\/pedidos\/\d+$/.test(window.location.pathname),
      { timeout: 15000 }
    );
    await waitForText(page, 'Marcar como entregado');
    ok('Aviso de entrega visible para el pedido listo');

    await clickButton(page, 'Marcar como entregado');
    await waitForText(page, 'Sí, marcar entregado');
    await clickButton(page, 'Sí, marcar entregado');
    await waitForText(page, 'Pedido entregado el');
    await page.waitForFunction(() => {
      const banner = document.querySelector('.banner--info');
      return (
        banner &&
        banner.innerText.includes('Ana Torres') &&
        banner.innerText.toLowerCase().includes('entregado')
      );
    });
    ok('Entrega con fecha, hora y usuario responsable');

    await page.goto(`${BASE_URL}/historial?status=delivered`, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Historial');
    await waitForText(page, CLIENT_NAME);
    await clickButton(page, 'Recetas');
    await waitForText(page, 'Receta creada por prueba E2E.');
    await clickButton(page, 'Clientes');
    await waitForText(page, CLIENT_NAME);
    ok('Historial de pedidos, recetas y clientes con filtros');

    await page.goto(`${BASE_URL}/avisos`, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Aviso de pedidos pendientes');
    ok('Centro de avisos y configuración de días');

    await page.goto(`${BASE_URL}/pedidos?status=pending`, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Pedidos pendientes');
    ok('Filtro de pedidos pendientes');

    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/inicio`, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Hola, Ana');
    const mobileMenuVisible = await page.evaluate(() => {
      const button = document.querySelector('button[aria-label="Abrir menú"]');
      if (!button) {
        return false;
      }
      const style = window.getComputedStyle(button);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    assert(mobileMenuVisible, 'el menú móvil debe mostrarse en pantalla pequeña');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-mobile-dashboard.png'),
      fullPage: true,
    });
    ok('Diseño responsive en celular');

    const apiLogin = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: 'luis', password: 'Optica2026*' }),
    });
    assert(apiLogin.ok, 'el segundo usuario debe poder iniciar sesión');
    const apiAuth = await apiLogin.json();
    const clientsResponse = await fetch(
      `${API_URL}/clients?search=${encodeURIComponent(CLIENT_NAME)}`,
      {
        headers: {
          Authorization: `Bearer ${apiAuth.data.token}`,
          Accept: 'application/json',
        },
      }
    );
    assert(clientsResponse.ok, 'el segundo usuario debe poder consultar clientes');
    const clients = await clientsResponse.json();
    assert(
      Array.isArray(clients.data) && clients.data.some((client) => client.full_name === CLIENT_NAME),
      'el segundo usuario debe ver los mismos datos'
    );
    ok('Segundo usuario ve los mismos datos');

    if (consoleErrors.length) {
      throw new Error(
        `Se detectaron errores en la consola del navegador:\n${consoleErrors.join('\n')}`
      );
    }

    ok('Sin errores de consola en el navegador');
    console.log('\nResumen:');
    steps.forEach((step) => console.log(`- ${step}`));
    console.log(`\nCapturas: ${SCREENSHOT_DIR}`);
    console.log('Nota: esta prueba crea un cliente, receta y pedido de prueba en la base de datos activa.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('\nE2E FALLÓ');
  console.error(error);
  console.error('\nErrores de consola acumulados:');
  consoleErrors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
});
