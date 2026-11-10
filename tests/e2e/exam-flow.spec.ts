import { expect, test } from "@playwright/test";

/**
 * Full student exam journey against a running app seeded with `npm run db:seed`.
 * Uses the demo student and the live seeded physics exam (limit: 2 attempts).
 */
const PASSWORD = "Demo-Parol-2026";

test("student signs in, sits a timed exam with autosave + refresh recovery, submits and reviews mistakes", async ({ page }) => {
  await page.goto("/giris");
  await page.fill("#f-email", "student@demo.mhacademy.local");
  await page.fill("#f-password", PASSWORD);
  await page.click('button:has-text("Daxil ol")');
  await page.waitForURL(/\/panel/);

  await page.goto("/panel/sinaqlar");
  await expect(page.getByRole("heading", { name: /Sınaq/ }).first()).toBeVisible();
  // start (or resume) the physics exam
  await page.locator('h3:has-text("Fizika")').first().locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]").getByRole("button", { name: /Sınağa başla|Yenidən cəhd et/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Başla", exact: true }).click();
  await page.waitForURL(/\/imtahan\//);

  // timer visible and counting
  const timer = page.getByRole("timer");
  await expect(timer).toBeVisible();
  const t1 = await timer.innerText();

  // answer question 1 and flag it
  await page.locator('input[type="radio"]').first().check();
  await page.getByRole("button", { name: /Baxış üçün işarələ/ }).click();
  await expect(page.getByText("Saxlanıldı").first()).toBeVisible({ timeout: 10_000 });

  // answer question 2
  await page.getByRole("button", { name: /Növbəti/ }).click();
  await page.locator('input[type="radio"]').nth(1).check();
  await page.waitForTimeout(1200);

  // refresh: attempt must be recovered with answers and flag intact
  page.once("dialog", (d) => d.accept()); // beforeunload
  await page.reload();
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sual 1: cavablanıb, işarələnib/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sual 2: cavablanıb/ })).toBeVisible();
  expect(t1).toMatch(/\d+:\d\d/);

  // answers must never be present in the page source
  const html = await page.content();
  expect(html).not.toMatch(/is_correct|isCorrect|whyWrong/);

  // submit via confirmation dialog
  await page.getByRole("button", { name: "Təqdim et" }).first().click();
  await expect(page.getByRole("heading", { name: "Sınağı təqdim edirsiniz?" })).toBeVisible();
  await page.getByRole("button", { name: "Bəli, təqdim et" }).click();
  await page.waitForURL(/\/panel\/neticelerim\//);
  await expect(page.getByText("Səhvlərin təhlili")).toBeVisible();
  await expect(page.getByText(/Mövzular üzrə nəticə/)).toBeVisible();

  // a finished attempt cannot be re-opened for taking
  const resultUrl = page.url();
  const id = resultUrl.split("/").pop()!;
  await page.goto(`/imtahan/${id}`);
  await page.waitForURL(/\/panel\/neticelerim\//);
});
