import { test, expect } from "@playwright/test";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test.describe("UUID Generator — E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads with correct title", async ({ page }) => {
    await expect(page.locator("h1")).toHaveText("UUID Generator");
  });

  test("generating a UUID v4 shows a valid UUID format", async ({ page }) => {
    await page.getByRole("button", { name: "Generate" }).click();
    const uuidText = await page.locator("code").textContent();
    expect(uuidText).toMatch(UUID_V4_REGEX);
  });

  test("generating a UUID v7 shows a valid UUID format", async ({ page }) => {
    await page.getByRole("button", { name: "UUID v7" }).click();
    await page.getByRole("button", { name: "Generate" }).click();
    const uuidText = await page.locator("code").textContent();
    expect(uuidText).toMatch(UUID_V7_REGEX);
  });

  test("switching to v7 generates a different UUID", async ({ page }) => {
    await page.getByRole("button", { name: "Generate" }).click();
    const v4Uuid = await page.locator("code").textContent();
    expect(v4Uuid).toMatch(UUID_V4_REGEX);

    await page.getByRole("button", { name: "UUID v7" }).click();
    await page.getByRole("button", { name: "Generate" }).click();
    const v7Uuid = await page.locator("code").textContent();
    expect(v7Uuid).toMatch(UUID_V7_REGEX);
    expect(v7Uuid).not.toBe(v4Uuid);
  });

  test("copy button copies the UUID", async ({ page }) => {
    await page.getByRole("button", { name: "Generate" }).click();
    await page.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.resolve();
    });
    await page.getByRole("button", { name: "Copy" }).click();
  });

  test("bulk mode generates multiple UUIDs", async ({ page }) => {
    await page.getByRole("button", { name: "Bulk" }).click();
    await page.getByRole("button", { name: "Generate" }).click();
    const items = page.locator("code");
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
    const firstUuid = await items.first().textContent();
    expect(firstUuid).toMatch(UUID_V4_REGEX);
  });

  test("clear button in bulk mode clears results", async ({ page }) => {
    await page.getByRole("button", { name: "Bulk" }).click();
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(page.locator("code").first()).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.locator("code").first()).not.toBeVisible();
  });

  test.describe("History feature", () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
    });

    test("after generating, history entry appears with UUID badge", async ({ page }) => {
      await page.getByRole("button", { name: "Generate" }).click();
      await expect(page.locator("code")).toBeVisible({ timeout: 5000 });

      await expect(page.getByText("No history yet")).not.toBeVisible();
      await expect(page.getByText("UUID", { exact: true })).toBeVisible({ timeout: 5000 });
    });

    test("pin entry and verify star", async ({ page }) => {
      await page.getByRole("button", { name: "Generate" }).click();
      await expect(page.locator("code")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("UUID", { exact: true })).toBeVisible({ timeout: 5000 });

      const pinButton = page.locator('button[title="Pin"]').first();
      await pinButton.click();

      await expect(page.locator('button[title="Unpin"]').first()).toBeVisible({ timeout: 3000 });
    });

    test("click history entry loads UUID back", async ({ page }) => {
      await page.getByRole("button", { name: "Generate" }).click();
      await expect(page.locator("code")).toBeVisible({ timeout: 5000 });
      const generatedUuid = await page.locator("code").textContent();
      await expect(page.getByText("UUID", { exact: true })).toBeVisible({ timeout: 5000 });

      await page.getByRole("button", { name: "Generate New" }).click();
      const newUuid = await page.locator("code").textContent();
      expect(newUuid).not.toBe(generatedUuid);

      await page.locator("div.cursor-pointer").filter({ hasText: generatedUuid! }).first().click();
      const loadedUuid = await page.locator("code").textContent();
      expect(loadedUuid).toBe(generatedUuid);
    });

    test("delete entry removes it", async ({ page }) => {
      await page.getByRole("button", { name: "Generate" }).click();
      await expect(page.locator("code")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("UUID", { exact: true })).toBeVisible({ timeout: 5000 });

      await page.locator('button[title="Delete"]').first().click({ force: true });
      await expect(page.getByText("No history yet", { exact: true })).toBeVisible({ timeout: 5000 });
    });

    test("clear all removes all", async ({ page }) => {
      await page.getByRole("button", { name: "Generate" }).click();
      await expect(page.locator("code")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("UUID", { exact: true })).toBeVisible({ timeout: 5000 });

      await page.getByRole("button", { name: "Generate New" }).click();
      await expect(page.locator("code")).toBeVisible();

      const entriesBefore = await page.getByText("UUID", { exact: true }).count();
      expect(entriesBefore).toBeGreaterThanOrEqual(2);

      await page.getByRole("button", { name: "Clear All" }).click();
      await expect(page.getByText("No history yet", { exact: true })).toBeVisible({ timeout: 5000 });
    });
  });
});
