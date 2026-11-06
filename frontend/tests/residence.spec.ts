import { test, expect, type Page } from "@playwright/test";

async function openResidence(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Foydalanuvchi nomi", { exact: true })
    .fill("demo.admin");
  await page.getByLabel("Parol", { exact: true }).fill("Qurilish-Demo-2026!");
  await page
    .getByRole("button", { name: "Tizimga kirish", exact: true })
    .click();
  await page.getByRole("button", { name: "Majmua 3D", exact: true }).click();
  await expect(page.locator(".res-building-card")).toHaveCount(5);
  await expect(
    page.getByTestId("residence-canvas").locator("canvas"),
  ).toBeVisible();
}

test("3D building, floor, apartment, rear facade and interior navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1050 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openResidence(page);
  await expect
    .poll(async () =>
      Number(
        await page.getByTestId("residence-canvas").getAttribute("data-frames"),
      ),
    )
    .toBeGreaterThan(2);
  await page.waitForTimeout(1100);
  await page.screenshot({
    path: "test-results/residence-overview.png",
    fullPage: true,
  });
  const canvas = page.getByTestId("residence-canvas").locator("canvas");
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 0.6, y: box.height * 0.6 } });
  await expect(page.locator(".res-breadcrumb")).toContainText("D bino");
  await page.getByRole("button", { name: /^A bino 7/ }).click();
  await page.getByRole("button", { name: "1-qavat", exact: true }).click();
  await expect(page.locator(".res-unit-row")).toHaveCount(6);
  await page.locator(".res-unit-row").filter({ hasText: "A-01" }).click();
  await expect(page.locator(".res-price")).toContainText("784");
  await expect(page.locator(".res-metrics")).toContainText("64.8");
  await page.getByRole("tab", { name: "Interyer" }).click();
  await expect(
    page.getByRole("img", { name: "A-01 xonadon interyer vizualizatsiyasi" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".res-media-link img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(100);
  await page.screenshot({
    path: "test-results/residence-apartment.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Narigi tomon", exact: true }).click();
  await expect(page.locator(".res-apartment-heading h2")).toHaveText("A-04");
  await expect(page.locator(".res-facing")).toContainText("Orqa tomon");
  await page
    .getByRole("button", { name: "Keyingi xonadon", exact: true })
    .click();
  await expect(page.locator(".res-apartment-heading h2")).toHaveText("A-05");
  await page
    .getByRole("button", { name: "Oldingi xonadon", exact: true })
    .click();
  await expect(page.locator(".res-apartment-heading h2")).toHaveText("A-04");
  // Demand rendering must settle after camera damping, then remain idle.
  await page.waitForTimeout(1800);
  const before = Number(
    await page.getByTestId("residence-canvas").getAttribute("data-frames"),
  );
  await page.waitForTimeout(500);
  const after = Number(
    await page.getByTestId("residence-canvas").getAttribute("data-frames"),
  );
  expect(after - before).toBeLessThan(4);
  expect(
    Number(
      await page
        .getByTestId("residence-canvas")
        .getAttribute("data-draw-calls"),
    ),
  ).toBeLessThan(100);
  console.log("3D metrics", {
    idleFrames: after - before,
    drawCalls: await page
      .getByTestId("residence-canvas")
      .getAttribute("data-draw-calls"),
    triangles: await page
      .getByTestId("residence-canvas")
      .getAttribute("data-triangles"),
  });
  expect(errors).toEqual([]);
});

test("admin creates a building and apartment; live sale refresh preserves camera", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openResidence(page);
  async function request(path: string, method: string, body?: unknown) {
    return page.evaluate(
      async ({ path, method, body }) => {
        const token = JSON.parse(
          sessionStorage.getItem("crm.session.v1")!,
        ).access_token;
        const response = await fetch(path, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) throw new Error(await response.text());
        return response.status === 204 ? null : response.json();
      },
      { path, method, body },
    );
  }
  const complex = await request("/api/v1/crm/catalog/complexes", "POST", {
    name: "3D E2E " + Date.now(),
  });
  await page.reload();
  await page.getByRole("button", { name: "Majmua 3D", exact: true }).click();
  await page
    .getByLabel("3D majmua", { exact: true })
    .selectOption(String(complex.id));
  await page.getByRole("button", { name: "Birinchi binoni qo‘shish" }).click();
  await page.getByLabel("Bino nomi", { exact: true }).fill("Sinov bino");
  await page.getByLabel("Qavatlar soni").fill("3");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /^Sinov bino 3/ }).click();
  await page.getByLabel("3D xonadon qo‘shish").click();
  await page.getByLabel("Xonadon raqami", { exact: true }).fill("E2E-01");
  await page.getByLabel("Xonalar soni").fill("3");
  await page.getByLabel("Maydoni (m²)").fill("87.5");
  await page.getByLabel("Narx (so‘m)").fill("900000000");
  await page.getByLabel("Qavat", { exact: true }).fill("2");
  await page.getByLabel("Fasad", { exact: true }).selectOption("back");
  await page
    .getByLabel("Interyer rasmi manzili")
    .fill("/assets/residence/interior-sample.webp");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".res-unit-row").filter({ hasText: "E2E-01" }).click();
  await expect(page.locator(".res-metrics")).toContainText("87.5");
  await expect(page.locator(".res-facing")).toContainText("Orqa tomon");
  await page.getByRole("button", { name: "Xonadonni tahrirlash" }).click();
  await page.getByLabel("Maydoni (m²)").fill("88.5");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(page.locator(".res-metrics")).toContainText("88.5");
  const scene = await request(
    `/api/v1/crm/residence/complexes/${complex.id}`,
    "GET",
  );
  const aid = scene.apartments[0].id;
  const lead = await request("/api/v1/companies/ozod-demo/arizalar", "POST", {
    full_name: "3D Test Client",
    phone: "+998901234567",
    apartment_id: aid,
    consent: true,
  });
  for (const [version, stage] of [
    [1, "contacted"],
    [2, "viewing"],
  ]) {
    await request(`/api/v1/crm/arizalar/${lead.id}/stage`, "PATCH", {
      expected_version: version,
      stage,
    });
  }
  await page.waitForTimeout(1200);
  const camera = await page
    .getByTestId("residence-canvas")
    .getAttribute("data-camera");
  const frames = Number(
    await page.getByTestId("residence-canvas").getAttribute("data-frames"),
  );
  await request(`/api/v1/crm/arizalar/${lead.id}/confirm-sale`, "POST", {
    expected_version: 3,
  });
  await page.getByRole("button", { name: "Yangilash", exact: true }).click();
  await expect(page.locator(".res-inspector .badge")).toHaveText("Sotilgan");
  await expect(
    page.getByRole("button", { name: "Xonadonni tahrirlash" }),
  ).toBeDisabled();
  await expect(page.getByTestId("residence-canvas")).toHaveAttribute(
    "data-camera",
    camera!,
  );
  expect(
    Number(
      await page.getByTestId("residence-canvas").getAttribute("data-frames"),
    ),
  ).toBeGreaterThanOrEqual(frames);
});

test("public mobile residence and filters remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Xonadonlar katalogini ko‘rish" })
    .click();
  await page.getByLabel("Kompaniya identifikatori").fill("ozod-demo");
  await page.getByRole("button", { name: "Katalogni ochish" }).click();
  await page.getByRole("button", { name: "Majmua 3D", exact: true }).click();
  await expect(page.locator(".res-building-card")).toHaveCount(5);
  await page.getByLabel("3D holat filtri").selectOption("available");
  await page.getByLabel("3D xonalar filtri").selectOption("2");
  await expect(page.locator(".res-unit-row").first()).toContainText("2 xona");
  await page.locator(".res-unit-row").first().click();
  await expect(
    page
      .locator(".res-inspector")
      .getByRole("button", { name: "Ariza qoldirish" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Xonadonni tahrirlash" }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/residence-mobile.png",
    fullPage: true,
  });
});

test("WebGL unavailable retains accessible inventory navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return original.apply(this, [type, ...args] as Parameters<
        typeof original
      >);
    } as typeof original;
  });
  await page.goto("/");
  await page
    .getByLabel("Foydalanuvchi nomi", { exact: true })
    .fill("demo.admin");
  await page.getByLabel("Parol", { exact: true }).fill("Qurilish-Demo-2026!");
  await page
    .getByRole("button", { name: "Tizimga kirish", exact: true })
    .click();
  await page.getByRole("button", { name: "Majmua 3D", exact: true }).click();
  await expect(
    page.getByText("3D ko‘rinish ochilmadi", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".res-building-card")
    .filter({ hasText: "B bino" })
    .click();
  await page.getByRole("button", { name: "3-qavat", exact: true }).click();
  await page.locator(".res-unit-row").first().click();
  await expect(page.locator(".res-price strong")).toBeVisible();
});
