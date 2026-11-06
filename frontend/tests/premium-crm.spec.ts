import { test, expect } from "@playwright/test";
test("dashboard, kanban, scoped notes and telephone actions", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Xodimlar uchun kirish" })
    .first()
    .click();
  await page
    .getByLabel("Foydalanuvchi nomi", { exact: true })
    .fill("demo.admin");
  await page.getByLabel("Parol", { exact: true }).fill("Qurilish-Demo-2026!");
  await page
    .getByRole("button", { name: "Tizimga kirish", exact: true })
    .click();
  await page.getByRole("button", { name: "Boshqaruv paneli" }).click();
  await expect(
    page.getByRole("heading", { name: "Murojaatlar dinamikasi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "30 kun" }).click();
  await expect(
    page.getByRole("img", { name: /Oxirgi 30 kunlik/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/premium-dashboard.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  const card = page
    .locator(".kanban-new article")
    .filter({ hasText: "Namuna" })
    .first();
  await expect(card).toBeVisible();
  const name = (await card.locator(".kanban-name").textContent())!.trim();
  await card.locator(".kanban-name").click();
  const dialog = page.getByRole("dialog", { name });
  await expect(dialog.getByText(/Namuna raqam/)).toBeVisible();
  const note = `Sinov eslatma ${Date.now()}`;
  await dialog.getByLabel("Yangi eslatma").fill(note);
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(dialog.getByText(note)).toBeVisible();
  await dialog.getByRole("button", { name: "Yopish" }).click();
  await card
    .getByLabel(`${name} bosqichini o‘zgartirish`)
    .selectOption("contacted");
  await expect(
    page
      .locator(".kanban-contacted")
      .getByRole("button", { name, exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/premium-kanban.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
