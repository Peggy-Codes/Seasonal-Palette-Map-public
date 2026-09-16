# 四季彩MAP (Seasonal Palette Map)

日本各地で感じた「いまの季節」を、匿名の短いことばと地図ピンで眺める地図サービス。競争や比較を持ち込まず、今日の気配だけを残す。

**[ライブデモを見る](#)**(準備中)

## 特徴

- **匿名投稿**: アカウント登録不要。位置情報は約100m単位に丸めて保存し、投稿から約21日で表示から消える
- **季節ごとのピン**: 春・夏・秋・冬をそれぞれ専用のアイコン・配色で地図上に表示
- **密集地点の重なり表示**: 同じ場所に複数の投稿があっても、ジッターと重なり順の制御で1件ずつ選べる
- **漫画風の吹き出しUI**: タップした投稿だけが1件、コミックのような一体感のある吹き出しで表示される
- **プライバシー配慮のデモモード**: 環境変数でランダム座標記録モードに切り替え可能(このリポジトリのデモ環境では有効)

## 使用技術

- [Next.js](https://nextjs.org/)(App Router) / TypeScript / [Tailwind CSS v4](https://tailwindcss.com/)
- [MapLibre GL JS](https://maplibre.org/) + [Protomaps](https://protomaps.com/)(PMTilesベクトルタイル)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- テスト: [Vitest](https://vitest.dev/)(unit) / [Playwright](https://playwright.dev/)(e2e)
- デプロイ: [Vercel](https://vercel.com/)

## ローカルで動かす

```bash
npm install
cp .env.example .env
# .env に DATABASE_URL / NEXT_PUBLIC_MAP_PMTILES_URL を設定
npm run dev
```

主なコマンド:

| コマンド           | 内容                  |
| ------------------ | --------------------- |
| `npm run dev`      | 開発サーバーを起動    |
| `npm run build`    | 本番用ビルド          |
| `npm run lint`     | ESLint実行            |
| `npm run test`     | Vitest(unit)を実行    |
| `npm run test:e2e` | Playwright(e2e)を実行 |

## ライセンス

[MIT](./LICENSE)
