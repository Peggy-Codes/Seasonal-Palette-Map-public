import { expect, test } from "@playwright/test";

const existingPin = {
  comment: "石畳に落ちた葉が、雨で濃くなっていた。",
  coordinates: [135.768, 35.012],
  createdAt: "2026-08-28T00:00:00.000Z",
  id: "kyoto-autumn",
  season: "autumn",
};

test("四季彩MAP can read and post a seasonal observation", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 35.0116, longitude: 135.7677 });
  await page.route("**/api/pins", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        body: JSON.stringify({
          pin: {
            ...existingPin,
            comment: "風の温度が少し変わった。",
            id: "new-pin",
            season: "spring",
          },
        }),
        contentType: "application/json",
        status: 201,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ pins: [existingPin] }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "四季彩MAP" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: /日本各地の季節の投稿を眺める地図/,
    }),
  ).toBeVisible();

  const kyotoMarker = page.getByRole("button", {
    name: "秋の気配「石畳に落ちた葉が、雨で濃くなっていた。」を読む",
  });
  await expect(kyotoMarker).toBeVisible();
  await kyotoMarker.click();
  await expect(kyotoMarker).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("「石畳に落ちた葉が、雨で濃くなっていた。」"),
  ).toBeVisible();

  await page.getByRole("button", { name: "季節を残す" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("観測メモ").fill("風の温度が少し変わった。");
  await dialog.getByRole("button", { name: "現在地から地図に置く" }).click();
  await expect(dialog.getByText("春の気配を地図に置きました。")).toBeVisible();

  await dialog.getByRole("button", { name: "投稿フォームを閉じる" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "季節を残す" })).toBeFocused();
});
