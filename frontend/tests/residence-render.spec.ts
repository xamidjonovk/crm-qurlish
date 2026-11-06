import { test, expect } from "@playwright/test";

test("hi-tech render isolates selections and opens furnished interiors from every side", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1600, height: 1050 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
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
  const scene = page.getByTestId("residence-canvas");
  const settled = async () => {
    await expect(scene).toHaveAttribute("data-moving", "false");
  };
  await expect(scene).toHaveAttribute("data-mode", "overview");
  await settled();
  await page.screenshot({
    path: "test-results/hitech-overview.png",
    fullPage: true,
  });
  const designButton = page.getByRole("button", {
    name: "Dizayn konsepsiyasi",
    exact: true,
  });
  await designButton.click();
  const preview = page.getByRole("dialog", {
    name: "Business-class arxitektura",
  });
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview
        .locator("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(1536);
  await page.screenshot({
    path: "test-results/business-class-concept.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(designButton).toBeFocused();
  for (const name of ["A", "B", "C", "D"]) {
    await page
      .getByRole("button", { name: new RegExp(`^${name} bino 7`) })
      .click();
    await expect(scene).toHaveAttribute("data-mode", "building");
    await expect(scene).toHaveAttribute("data-occluding-buildings", "0");
    expect(
      (await scene.getAttribute("data-visible-buildings"))!.split(","),
    ).toHaveLength(1);
  }
  await page.getByRole("button", { name: /^A bino 7/ }).click();
  await settled();
  await page.screenshot({
    path: "test-results/hitech-building.png",
    fullPage: true,
  });
  await page.getByLabel("4-qavat", { exact: true }).click();
  await expect(scene).toHaveAttribute("data-mode", "floor");
  await expect(scene).toHaveAttribute("data-occluding-buildings", "0");
  await settled();
  await page.screenshot({
    path: "test-results/hitech-floor.png",
    fullPage: true,
  });
  const canvas = scene.locator("canvas");
  const box = (await canvas.boundingBox())!;
  await canvas.click({
    position: { x: box.width * 0.48, y: box.height * 0.62 },
  });
  await expect(scene).toHaveAttribute("data-mode", "interior");
  await page.getByLabel("4-qavat", { exact: true }).click();
  await settled();
  await page.locator(".res-unit-row").filter({ hasText: "A-20" }).click();
  await expect(scene).toHaveAttribute("data-mode", "interior");
  await expect(scene).toHaveAttribute("data-visible-buildings", "");
  await expect
    .poll(async () => Number(await scene.getAttribute("data-furnished-rooms")))
    .toBeGreaterThanOrEqual(4);
  await settled();
  await page.screenshot({
    path: "test-results/hitech-interior.png",
    fullPage: true,
  });
  for (let i = 0; i < 4; i++) {
    const previous = await scene.getAttribute("data-camera");
    await page
      .getByRole("button", { name: "Interyerni aylantirish", exact: true })
      .click();
    await settled();
    await expect(scene).not.toHaveAttribute("data-camera", previous!);
    await expect
      .poll(async () => Number(await scene.getAttribute("data-open-walls")))
      .toBeGreaterThanOrEqual(2);
    await expect(scene).toHaveAttribute("data-occluding-buildings", "0");
  }
  await page
    .getByRole("button", { name: "Yuqoridan ko‘rish", exact: true })
    .click();
  await settled();
  expect(Number(await scene.getAttribute("data-polar"))).toBeLessThan(0.1);
  await page.screenshot({
    path: "test-results/hitech-top.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Ko‘rinishni tiklash", exact: true })
    .click();
  await settled();
  const before = Number(await scene.getAttribute("data-frames"));
  await page.waitForTimeout(500);
  expect(Number(await scene.getAttribute("data-frames")) - before).toBeLessThan(
    4,
  );
  console.log("Interior render", {
    drawCalls: await scene.getAttribute("data-draw-calls"),
    triangles: await scene.getAttribute("data-triangles"),
    openWalls: await scene.getAttribute("data-open-walls"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  await expect(scene.locator("canvas")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/hitech-mobile.png",
    fullPage: true,
  });
  await designButton.click();
  await expect(preview).toBeVisible();
  expect((await preview.boundingBox())!.width).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Konsepsiyani yopish" }).click();
  await expect(preview).toHaveCount(0);
  expect(errors.filter((e) => !e.includes("401 (Unauthorized)"))).toEqual([]);
});
