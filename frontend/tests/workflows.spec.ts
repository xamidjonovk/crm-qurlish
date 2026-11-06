import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, username = "demo.admin") {
  await page.goto("/");
  await page.getByLabel("Foydalanuvchi nomi", { exact: true }).fill(username);
  await page.getByLabel("Parol", { exact: true }).fill("Qurilish-Demo-2026!");
  await page
    .getByRole("button", { name: "Tizimga kirish", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Arizalar", exact: true }),
  ).toBeVisible();
}
test("admin catalog CRUD and audit", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Xonadonlar", exact: true }).click();
  await page.getByRole("button", { name: "Majmualar", exact: true }).click();
  await page.getByRole("button", { name: "Majmua qo‘shish" }).click();
  const name = "Sinov majmuasi " + Date.now();
  await page.getByLabel("Majmua nomi").fill(name);
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  let row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByLabel("Tahrirlash").click();
  await page.getByLabel("Majmua nomi").fill(name + " yangi");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  row = page.getByRole("row").filter({ hasText: name + " yangi" });
  await expect(row).toBeVisible();
  await row.getByLabel("O‘chirish").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "O‘chirish", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  await page
    .getByRole("button", { name: "Faoliyat tarixi", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Majmua o‘chirildi", exact: false }).first(),
  ).toBeVisible();
});
test("public application, pipeline and sale confirmation", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Xonadonlar katalogini ko‘rish" })
    .click();
  await page.getByLabel("Kompaniya identifikatori").fill("ozod-demo");
  await page.getByRole("button", { name: "Katalogni ochish" }).click();
  await page
    .getByRole("button", { name: "Ariza qoldirish", exact: false })
    .filter({ visible: true })
    .first()
    .waitFor();
  const available = page
    .locator("article")
    .filter({
      has: page.getByRole("button", {
        name: "Ariza qoldirish",
        disabled: false,
      }),
    })
    .first();
  await available.getByRole("button").click();
  const name = "Sinov Mijoz " + Date.now();
  await page.getByLabel("Ism va familiya").fill(name);
  await page.getByLabel("Telefon raqami").fill("+998901234567");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Arizani yuborish" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Arizangiz qabul qilindi",
  );
  await page.getByRole("button", { name: "Kirishga qaytish" }).click();
  await login(page);
  await page.getByLabel("Mijozni qidirish").fill(name);
  await page.getByRole("button", { name: "Qidirish", exact: true }).click();
  for (const stage of ["Bog‘lanildi", "Ko‘rik"]) {
    await page.getByRole("button", { name: "Bosqich", exact: true }).click();
    await page.getByLabel("Yangi bosqich").selectOption({ label: stage });
    await page.getByRole("button", { name: "Saqlash", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page
    .getByRole("button", { name: "Sotuvni yakunlash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sotuvni tasdiqlash", exact: true })
    .click();
  await expect(page.getByRole("row").filter({ hasText: name })).toContainText(
    "Sotilgan",
  );
  await page
    .getByRole("button", { name: "Faoliyat tarixi", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Sotuv yakunlandi", exact: false }).first(),
  ).toBeVisible();
});
test("viewer has read-only navigation", async ({ page }) => {
  await login(page, "demo.kuzatuvchi");
  await expect(
    page.getByRole("button", { name: "Jamoa", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xonadonlar", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Bosqich", exact: true }),
  ).toHaveCount(0);
});
test("mobile layout and validation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Arizalar", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
test("desktop screenshot and logout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await expect(page.getByRole("table")).toBeVisible();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Chiqish", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Xush kelibsiz" }),
  ).toBeVisible();
});

test("team creation and deactivation", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Jamoa", exact: true }).click();
  await page.getByRole("button", { name: "Xodim qo‘shish" }).click();
  const username = "sinov." + Date.now();
  await page
    .getByRole("dialog")
    .getByLabel("Foydalanuvchi nomi")
    .fill(username);
  await page
    .getByRole("dialog")
    .getByLabel("Parol", { exact: true })
    .fill("Sinov-Xodim-2026!");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: username });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Faolsizlantirish" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Faolsizlantirish", exact: true })
    .click();
  await expect(row).toContainText("Faol emas");
});
test("apartment create edit price delete", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Xonadonlar", exact: true }).click();
  await page.getByRole("button", { name: "Xonadon qo‘shish" }).click();
  const number = "S-" + Date.now();
  await page
    .getByLabel("Majmua", { exact: true })
    .selectOption({ label: "Yangi Hayot" });
  await page.getByLabel("Xonadon raqami").fill(number);
  await page.getByLabel("Xonalar soni").fill("2");
  await page.getByLabel("Narx (so‘m)").fill("123000000");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = page.getByRole("row").filter({ hasText: number });
  // The separate 3D demo adds inventory; locate the created record across pages.
  for (let i = 0; i < 100 && (await row.count()) === 0; i++) {
    const next = page.getByLabel("Keyingi sahifa");
    if (await next.isDisabled()) break;
    await next.click();
    await expect(page.getByRole("table")).toBeVisible();
  }
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Narx", exact: true }).click();
  await page.getByLabel("Narx (so‘m)").fill("234000000");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(row).toContainText("234");
  await row.getByLabel("Tahrirlash").click();
  await page.getByLabel("Xonalar soni").fill("3");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(row).toContainText("3 xona");
  await row.getByLabel("O‘chirish").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "O‘chirish", exact: true })
    .click();
  await expect(row).toHaveCount(0);
});
