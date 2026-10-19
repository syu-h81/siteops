# SiteOps

SiteOpsは、Web制作会社・フリーランス向けのWebサイト保守業務管理SaaSです。

v0.1の仕様は [`docs/SiteOps_v0.1_requirements.md`](docs/SiteOps_v0.1_requirements.md) を参照してください。

## 技術スタック

- Next.js 16 (App Router)
- React 19 / TypeScript (strict)
- Tailwind CSS 4 / shadcn/ui
- Supabase Auth / PostgreSQL / Row Level Security
- Zod / React Hook Form
- Vitest / Playwright

## 必要環境

- Node.js 22
- npm 10以上
- Docker Desktopまたは互換するDocker環境（ローカルSupabaseを使う場合）

## セットアップ

```bash
npm ci
cp .env.example .env.local
npm run supabase:start
npm run dev
```

SupabaseのローカルURLとPublishable Keyは、`npm run supabase:status`で確認して `.env.local` に設定します。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`.env.local` や実際のキーはGitにコミットしないでください。service role keyはブラウザーで使用しません。

## 主なコマンド

| コマンド                  | 用途                           |
| ------------------------- | ------------------------------ |
| `npm run dev`             | 開発サーバー起動               |
| `npm run build`           | 本番ビルド                     |
| `npm run lint`            | ESLint                         |
| `npm run typecheck`       | TypeScript型検査               |
| `npm run test`            | Vitestの単体テスト             |
| `npm run test:watch`      | Vitestのwatch実行              |
| `npm run test:e2e`        | Playwright E2Eテスト           |
| `npm run format`          | Prettierによる整形             |
| `npm run format:check`    | 整形済みか確認                 |
| `npm run supabase:start`  | ローカルSupabase起動           |
| `npm run supabase:stop`   | ローカルSupabase停止           |
| `npm run supabase:status` | ローカルSupabaseの接続情報表示 |

Playwrightのブラウザーが未導入の場合は、次を実行します。

```bash
npx playwright install chromium
```

## Supabase

Supabase CLIの設定は `supabase/config.toml`で管理します。DBスキーマの正は `supabase/migrations/*.sql` です。

Phase 1-Aでは、業務・法務テーブル、RLS、同意履歴RPC、pgTAPテストをmigrationで管理しています。認証画面とオンボーディングは後続のPhase 1で実装します。

## ブランチ運用

- `main`: 本番
- `develop`: 統合
- `feature/*`: 機能開発

コミット、Push、マージは承認後に実施します。

## CI

GitHub Actionsで以下を実行します。

1. Prettier確認
2. ESLint
3. TypeScript型検査
4. Vitest
5. production build
