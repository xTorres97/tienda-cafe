// Prueba de punta a punta del flujo de compra y del panel.
// Uso: con la app levantada (pnpm build && pnpm start) → BASE_URL=http://localhost:3000 pnpm e2e
// Requiere: npx playwright install chromium
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN = { email: process.env.ADMIN_EMAIL ?? "admin@sombradebucare.test", password: process.env.ADMIN_PASSWORD ?? "cafe-demo-2026" };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "es-VE" });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  let failed = 0;
  const seen = loc => loc.waitFor({ state: "visible", timeout: 10000 }).then(() => true, () => false);
  const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log(cond ? "✅" : "❌", name, extra); };

  // Catálogo y filtros
  await page.goto(`${BASE}/tienda`, { waitUntil: "networkidle" });
  const total = await page.locator('a[href^="/producto/"]').count();
  await page.getByRole("link", { name: "Lara", exact: true }).click();
  await page.waitForURL(/region=Lara/);
  const filtered = await page.locator('a[href^="/producto/"]').count();
  ok("filtro por región reduce el catálogo", filtered > 0 && filtered < total, `(${total} → ${filtered})`);
  await page.getByRole("searchbox", { name: "Buscar cafés" }).or(page.getByLabel("Buscar cafés")).fill("chocolate");
  await page.keyboard.press("Enter");
  await page.waitForURL(/q=chocolate/);
  ok("la búsqueda conserva el filtro de región", page.url().includes("region=Lara"));

  // Producto agotado: no deja agregar
  await page.goto(`${BASE}/producto/caripe`, { waitUntil: "networkidle" });
  await page.getByText("250 g").first().click();
  ok("variante agotada desactiva el botón", await page.getByRole("button", { name: "Agotado" }).isDisabled());

  // Agregar al carrito
  await page.goto(`${BASE}/producto/sanare-lavado`, { waitUntil: "networkidle" });
  await page.getByText("500 g").first().click();
  await page.getByLabel("Molienda").selectOption("espresso");
  await page.getByRole("button", { name: "Agregar uno" }).click();
  await page.getByRole("button", { name: /^Agregar ·/ }).click();
  const sheet = page.getByRole("dialog", { name: "Tu carrito" });
  ok("el carrito se abre con el producto", await sheet.getByText("Molido para espresso").isVisible());
  ok("contador del carrito en 2", (await page.getByRole("button", { name: /Carrito, 2 productos/, includeHidden: true }).count()) === 1);
  await sheet.getByRole("link", { name: "Continuar con la compra" }).click();

  // Checkout con errores de validación
  await page.waitForURL(/checkout/);
  await page.getByRole("button", { name: "Ir a pagar" }).click();
  ok("valida campos vacíos", await seen(page.getByText("Revisa los campos marcados.")));
  await page.getByLabel("Nombre y apellido").fill("María Prueba");
  await page.getByLabel("Email").fill("maria@example.com");
  await page.getByLabel("Teléfono").fill("0414 555 0123");
  await page.getByLabel("Dirección").fill("Av. Lara, Torre Sur, piso 3");
  await page.getByLabel("Ciudad").fill("Barquisimeto");
  await page.getByLabel("Estado").selectOption("Lara");
  await page.getByRole("button", { name: "Ir a pagar" }).click();
  await page.waitForURL(/\/pago\//, { timeout: 15000 });
  ok("crea el pedido y abre la pasarela", true);

  // Pago rechazado y luego aprobado con verificación del banco
  const fill = async n => {
    await page.getByLabel("Número de tarjeta").fill(n);
    await page.getByLabel("Vencimiento").fill("1230");
    await page.getByLabel("CVC").fill("123");
    await page.getByLabel("Nombre en la tarjeta").fill("María Prueba");
    await page.getByRole("button", { name: /^Pagar/ }).click();
  };
  await fill("4242 4242 4242 4241");
  ok("rechaza número inválido (Luhn)", await seen(page.getByRole("alert").filter({ hasText: "no es válido" })));
  await fill("4000 0000 0000 9995");
  ok("muestra fondos insuficientes", await seen(page.getByRole("alert").filter({ hasText: "fondos suficientes" })));
  await fill("4000 0000 0000 3220");
  const auth = page.getByRole("dialog", { name: "Verificación de tu banco" });
  ok("pide verificación del banco", await seen(auth));
  await auth.getByRole("button", { name: "Autorizar" }).click();
  await page.waitForURL(/\/pedido\//, { timeout: 15000 });
  ok("pedido confirmado", await page.getByRole("heading", { name: /Gracias, María/ }).isVisible());
  ok("muestra la tarjeta usada", await page.getByText("terminada en 3220").isVisible());
  const orderUrl = page.url().split("?")[0];
  ok("vacía el carrito tras el pago", await page.getByRole("button", { name: /Carrito, 0 productos/ }).count() === 1);

  // Panel: login, cambio de estado y stock
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  ok("el panel exige sesión", page.url().includes("/admin/login"));
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill("incorrecta");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  ok("rechaza contraseña incorrecta", await seen(page.getByRole("alert")));
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(u => !u.toString().includes("login"), { timeout: 15000 });
  const row = page.locator("tr", { hasText: "María Prueba" }).first();
  ok("el pedido aparece como pagado", await row.getByText("Pagado").isVisible());
  await row.getByRole("button", { name: "Preparar" }).click();
  await page.waitForTimeout(1200);
  ok("cambia a preparando", await page.locator("tr", { hasText: "María Prueba" }).first().getByText("Preparando").isVisible());
  await page.goto(orderUrl, { waitUntil: "networkidle" });
  ok("el cliente ve el nuevo estado", (await page.locator('[aria-current="step"]').textContent())?.includes("Tostando"));

  // Server action protegida: sin cookie no se puede cambiar estado
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/admin/productos`);
  ok("otra sesión sin login no ve productos", p2.url().includes("/admin/login"));
  await ctx2.close();

  console.log("errores de página:", JSON.stringify(errors));
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
})();
