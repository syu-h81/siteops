# SiteOps v0.1 要件定義書

- バージョン: 0.1.0
- 作成日: 2026-10-18
- ステータス: 実装用ドラフト
- 目的: Web制作会社・フリーランスの保守対象サイト、契約、更新期限、タスク、作業履歴を組織単位で管理する
- 商用目標: 月額課金MRR 50,000円（v0.1の実装完了条件とは分ける）

## 1. 事業仮説とMVP境界

対象: 5〜100サイト程度を保守する個人制作者・小規模制作会社。課題: 顧客・サイト・契約・更新期限・作業履歴が表計算・チャットに分散。提供価値: 一画面で対応漏れを減らす。

v0.1に含む: メール認証、組織の作成、クライアント/サイト/管理サービス/保守契約のCRUD、期限一覧、保守タスク、作業履歴、ダッシュボード、手動通知確認。v0.1の通知はアプリ内の期限アラート表示のみ。メール通知はv0.2候補。

含まない: WordPressへの接続・自動更新、実際のSSL/ドメイン期限自動検知、バックアップ、監視、請求書、決済、AI、顧客ポータル、外部連携、添付ファイル、複数組織への所属・招待、カスタム権限。

成功判定: 5人以上のβ利用者が実サイトを登録し、3人以上が2週間内に複数回利用、かつ有料化意向を検証。料金は仮説であり、ヒアリングで再評価する。

## 2. 技術方針

- Next.js App Router + TypeScript (strict) + Tailwind CSS
- Supabase Auth (email/password) + PostgreSQL + Row Level Security
- Supabase JS SSR、サーバー側でユーザー認証・権限検証
- Zodで入出力検証、React Hook Formでフォーム管理
- UI: shadcn/ui系コンポーネント（必要なものだけ導入）
- ホスティング: Vercelを想定
- DBマイグレーション: Supabase CLI の `supabase/migrations/*.sql` を正とする
- 日付: date型の期限は利用者のローカル日付（初期はAsia/Tokyo）として扱い、UTC時刻との不用意な比較をしない
- 金額: JPY整数、税区分はv0.1で扱わず「税抜/税込混在を禁止」するため画面に『入力金額は税込で統一』と明記
- URL: URL形式検証、スキームはhttp/httpsのみ。サーバー側でURLへアクセスしない

## 3. 権限とテナント境界

v0.1は「1ユーザー=1組織」「組織オーナーのみ」を正式対応。組織メンバー・招待は後続版。全業務テーブルは `organization_id` を持つ。ブラウザから送られたorganization_idを信頼しない。認証ユーザーに紐づく組織IDをサーバーで解決する。

権限: 未ログインはログイン/登録のみ、ログイン済みオーナーは自組織の全CRUD、他組織のレコードは一覧/詳細/変更すべて拒否。未認証APIは401、他組織リソースは404を返す。DBのRLSは直接クライアントアクセスも保護する。

## 4. 画面・ルーティング

| パス | 画面 | 主なUI | 操作 |
|---|---|---|---|
| `/login` | ログイン | メール・パスワード・エラー | ログイン |
| `/signup` | 新規登録 | メール・パスワード・利用規約同意 | 登録 |
| `/onboarding` | 初期設定 | 組織名入力 | 組織作成 |
| `/dashboard` | ダッシュボード | サイト数・契約中数・保守MRR・期限30日以内・未完了タスク | 各詳細へ |
| `/clients` | 顧客一覧 | 検索・件数・追加ボタン・表 | 作成/編集/削除 |
| `/clients/new` | 顧客追加 | 顧客名、担当者、連絡先、メモ | 登録 |
| `/clients/[id]` | 顧客詳細 | 基本情報・配下サイト・契約・メモ | 編集/削除 |
| `/sites` | サイト一覧 | 顧客フィルタ・CMS・状態・検索 | 追加/詳細 |
| `/sites/new` | サイト追加 | 顧客、サイト名、URL、CMS、状態 | 登録 |
| `/sites/[id]` | サイト詳細 | 概要、管理サービス、タスク、作業履歴 | 編集/削除/追加 |
| `/contracts` | 保守契約一覧 | 契約先・月額・更新日・状態 | CRUD |
| `/tasks` | 保守タスク一覧 | 未完了/完了、期限、顧客、サイト | CRUD/完了切替 |
| `/renewals` | 期限一覧 | 期限切れ/7日/30日/それ以降 | 管理サービス・契約詳細へ |
| `/work-logs` | 作業履歴 | 日付・サイト・作業時間・説明 | CRUD |
| `/settings` | 設定 | 組織名、タイムゾーン表示、アカウント | 組織名変更/ログアウト |

共通UI: 左サイドバー（モバイルはドロワー）、上部ページタイトルと主要CTA、空状態の登録導線、ローディング/失敗/成功トースト、削除確認ダイアログ。ページネーションは20件単位。検索は名前の部分一致。日付はYYYY/MM/DD。

## 5. データモデル

### 5.1 共通カラム

すべての業務テーブルは `id uuid primary key default gen_random_uuid()`, `organization_id uuid not null`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` を基本とする。削除はv0.1では物理削除、依存データがある親レコードは削除禁止（409）とする。

### 5.2 テーブル定義

**organizations**: `id uuid PK`, `owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id)`, `name text NOT NULL`, `created_at`, `updated_at`。組織の作成は本人をownerにする。

**clients**: 共通カラム、`name text NOT NULL`, `contact_name text`, `email text`, `phone text`, `memo text`。組織内の名前重複は許可。

**sites**: 共通カラム、`client_id uuid NOT NULL`, `name text NOT NULL`, `url text NOT NULL`, `cms text NOT NULL DEFAULT 'other'` (wordpress/studio/other), `status text NOT NULL DEFAULT 'active'` (active/inactive), `memo text`。`(organization_id, client_id)` を同一組織内FKとして検証。

**site_services**: 共通カラム、`site_id uuid NOT NULL`, `type text NOT NULL` (domain/server/dns/ssl/cms/other), `provider text`, `account_label text`, `renewal_date date`, `memo text`。同じtypeの複数行を許可（複数ドメイン等）。**パスワード、APIキー、認証トークンを保存しない**。

**maintenance_contracts**: 共通カラム、`client_id uuid NOT NULL`, `name text NOT NULL`, `monthly_price_jpy integer NOT NULL CHECK >= 0`, `start_date date NOT NULL`, `renewal_date date`, `status text NOT NULL` (active/paused/ended), `memo text`。同一顧客に複数契約可。v0.1は月額契約のみ。MRRはactiveのmonthly_price_jpyの合計。

**maintenance_tasks**: 共通カラム、`site_id uuid NOT NULL`, `title text NOT NULL`, `description text`, `due_date date`, `status text NOT NULL DEFAULT 'todo'` (todo/done), `completed_at timestamptz`。statusとcompleted_atの整合性をサーバーで維持。

**work_logs**: 共通カラム、`site_id uuid NOT NULL`, `title text NOT NULL`, `description text`, `worked_minutes integer NOT NULL CHECK (worked_minutes >= 0 AND worked_minutes <= 1440)`, `worked_on date NOT NULL`。記録者は `created_by uuid REFERENCES auth.users(id)`。

### 5.3 DB整合性

- 各子テーブルは `UNIQUE(organization_id, id)` を追加し、親参照は複合FK `(organization_id, parent_id) REFERENCES parent(organization_id, id)` を使用する。これにより組織をまたぐ紐付けをDBレベルで禁止。
- `sites` → `clients`、`site_services` → `sites`、`maintenance_contracts` → `clients`、`maintenance_tasks` → `sites`、`work_logs` → `sites`。
- 親削除は `ON DELETE RESTRICT`。クライアントの削除は関連サイト・契約が0件の時のみ、サイトの削除は管理サービス・タスク・作業履歴が0件の時のみ許可。
- 各テーブル `organization_id` index、検索/期限用に `(organization_id, renewal_date)`、`(organization_id, due_date)`、`(organization_id, client_id)` 等を追加。
- `updated_at` 自動更新トリガーを作成。
- CHECK制約でステータス/typeを制限。名前やURLはAPIでも最大長を制限。

## 6. Supabase Auth / RLS設計

- すべての業務テーブルで `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`。
- `organizations` のSELECT/UPDATEは `owner_user_id = (select auth.uid())`。INSERTは `owner_user_id = (select auth.uid())`。DELETEはv0.1では無効。
- その他の業務テーブルのSELECT/INSERT/UPDATE/DELETEは `EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_user_id = (select auth.uid()))`。
- INSERT/UPDATEには必ず `WITH CHECK` も付与。UPDATE時にorganization_idの変更はアプリ側で禁止し、RLSも新旧組織の所有確認を要求。
- `organizations.owner_user_id` の変更は禁止（専用トリガーまたは列単位権限）。組織オーナーは本人のみに固定。
- `auth.users` を参照するFKを利用し、認証ユーザーのメールを業務テーブルに複製しない。
- Service role keyはブラウザに絶対露出しない。通常の業務処理はユーザーのセッションに紐づくSupabaseクライアントを利用する。
- 重要: RLSだけでは「他人の組織IDを指定して紐付ける」不整合を防げないため、前述の複合FKを必須とする。
- DBテスト: 組織A/Bで作成し、AのセッションでBのSELECT=0件、INSERT/UPDATE/DELETE=拒否、AサイトをB顧客へ紐付け=FK拒否を検証。

## 7. API設計

Next.js Route Handlers `/api/v1/...` を採用。JSONを返し、各リクエストで認証、組織解決、Zod検証、権限検証を行う。ブラウザ画面の初期読込はServer Componentsで直接DBを読んでもよいが、権限関数を共通化する。

| Method | Endpoint | 処理 |
|---|---|---|
| POST | `/api/v1/onboarding` | 本人の組織を作成（既存時409） |
| GET/PATCH | `/api/v1/organization` | 組織取得/名称更新 |
| GET/POST | `/api/v1/clients` | 一覧（q,page）/登録 |
| GET/PATCH/DELETE | `/api/v1/clients/:id` | 詳細/更新/削除 |
| GET/POST | `/api/v1/sites` | 一覧（q,clientId,page）/登録 |
| GET/PATCH/DELETE | `/api/v1/sites/:id` | 詳細/更新/削除 |
| GET/POST | `/api/v1/sites/:id/services` | 管理サービス一覧/登録 |
| PATCH/DELETE | `/api/v1/services/:id` | 管理サービス更新/削除 |
| GET/POST | `/api/v1/contracts` | 一覧/登録 |
| GET/PATCH/DELETE | `/api/v1/contracts/:id` | 詳細/更新/削除 |
| GET/POST | `/api/v1/tasks` | 一覧（status/siteId/page）/登録 |
| GET/PATCH/DELETE | `/api/v1/tasks/:id` | 詳細/更新/削除・完了切替 |
| GET/POST | `/api/v1/work-logs` | 一覧/登録 |
| GET/PATCH/DELETE | `/api/v1/work-logs/:id` | 詳細/更新/削除 |
| GET | `/api/v1/dashboard` | 件数、MRR、期限30日、未完了件数 |
| GET | `/api/v1/renewals?withinDays=30` | サービス期限＋契約更新期限 |

レスポンス: 成功 `{data: ...}`、一覧 `{data: [...], pagination:{page,pageSize,total}}`、失敗 `{error:{code,message,fields?}}`。エラーコード: 400(validation), 401(unauthorized), 404(not_found), 409(conflict), 500(internal_error)。日付は`YYYY-MM-DD`、時刻はISO8601。ソートはホワイトリスト制御、pageSize最大100。更新はPATCHの部分更新。DELETEは成功204。

## 8. 業務ルール

- 期限アラート: renewal_date / due_dateが本日より前=期限超過、0〜7日=7日以内、8〜30日=30日以内。NULLは対象外。
- 契約更新日とサイト管理サービス更新日を期限一覧に集約し、同一日に複数レコードがあれば別々に表示。
- MRR: `status='active'` の月額保守契約の合計。契約開始前でもactiveなら集計対象（初期運用では開始日を考慮したい場合、仕様変更として扱う）。
- サイト数: `sites` 全件、稼働サイト数: status=active。
- 契約は顧客単位。特定サイトに対する契約紐付けはv0.2以降。
- 日付/時刻の保存: 契約更新日などはdate、作成・更新・完了時刻はtimestamptz。
- URLをクリックするときは新規タブで `rel="noopener noreferrer"`。

## 9. ディレクトリ構成

```text
siteops/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/signup/page.tsx
│   │   ├── (app)/layout.tsx
│   │   ├── (app)/onboarding/page.tsx
│   │   ├── (app)/dashboard/page.tsx
│   │   ├── (app)/clients/page.tsx
│   │   ├── (app)/clients/new/page.tsx
│   │   ├── (app)/clients/[id]/page.tsx
│   │   ├── (app)/sites/page.tsx
│   │   ├── (app)/sites/new/page.tsx
│   │   ├── (app)/sites/[id]/page.tsx
│   │   ├── (app)/contracts/page.tsx
│   │   ├── (app)/tasks/page.tsx
│   │   ├── (app)/renewals/page.tsx
│   │   ├── (app)/work-logs/page.tsx
│   │   ├── (app)/settings/page.tsx
│   │   └── api/v1/.../route.ts
│   ├── components/{ui,layout,clients,sites,contracts,tasks}/
│   ├── lib/
│   │   ├── supabase/{client,server,proxy}.ts
│   │   ├── auth/{get-current-user,get-organization}.ts
│   │   ├── validations/{client,site,contract,task,work-log}.ts
│   │   ├── repositories/
│   │   ├── api/{errors,response}.ts
│   │   └── utils/{dates,currency}.ts
│   └── types/database.types.ts
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── tests/
├── tests/{unit,integration,e2e}/
├── .env.example
├── README.md
└── package.json
```

App Routerでルートグループを使用。認証セッション更新は利用するSupabase SSRバージョンの公式推奨に従い、proxy/middlewareを適切に設定する。

## 10. UI/UX詳細

- 色: 背景#F8FAFC、本文#0F172A、アクセント#2563EB、境界#E2E8F0。デスクトップはサイドバー240px、コンテンツ最大1280px。
- 一覧: デスクトップはテーブル、スマホはカード。追加CTAは常時表示。検索・絞込・ページネーション。
- フォーム: 必須項目に*、フィールド単位エラー、保存中ボタン無効、保存成功後に詳細へ遷移。
- ダッシュボードカード: 管理サイト、稼働サイト、契約中、月額保守売上、30日以内期限、未完了タスク。
- サイト詳細: 上段にサイト名/URL/顧客、タブ「管理サービス」「タスク」「作業履歴」。
- 削除: 依存レコードがある場合は削除できない旨と対象件数を表示。
- アクセシビリティ: ラベル、キーボード操作、フォーカス可視化、エラーをテキスト表示、コントラスト確保。

## 11. セキュリティ/運用

- Supabase RLSを全業務テーブルに適用し、組織を跨ぐ操作をE2E/DB両方で検証。
- パスワードやサーバー認証情報を入力させない（メモにも機密情報を入力しないよう注意文を表示）。
- `.env.local` はGitに含めない。公開環境変数には公開可能なSupabase URL/anon keyのみ。service_roleは原則不使用。
- 画面/APIでの認証とRLSの二重防御、入力値検証、XSS対策、過度な情報を含むエラーメッセージ禁止。
- Authのメール確認、パスワードリセット、レート制限/ボット対策は公開前に有効化・確認。
- DBバックアップ・復旧方法、監視、エラー収集、プライバシーポリシー、利用規約をβ公開前に確認。
- 組織削除・データエクスポートはv0.1 UIに含めないが、β利用者からのデータ削除依頼に対応する運用手順を準備。

## 12. テスト・受け入れ基準

1. 登録→メール認証→ログイン→組織作成→ダッシュボード表示ができる。
2. 顧客→サイト→管理サービス→契約→タスク→作業履歴を登録/編集/一覧できる。
3. 更新日を昨日・7日後・30日後・31日後に設定し、期限一覧の分類が正しい。
4. 月額契約2件(10,000/5,000円)がactiveならMRR=15,000円、pausedにすると10,000円。
5. 他組織のIDをURLやAPIで指定しても情報が返らず更新できない。
6. 他組織の親IDを指定した作成がDBレベルで拒否される。
7. 入力不備に適切なフィールドエラーが出る。未ログインAPIは401。
8. 親に依存データがある削除は409で止まる。
9. モバイル幅375pxで横スクロールせず主要操作ができる。
10. lint、typecheck、unit、integration、e2e、production buildが通る。

## 13. 開発順序（各工程でPR/コミット）

**Phase 0: 土台** — Next.js初期化、ESLint/Prettier、UIライブラリ、Supabase CLI、環境変数、README、CI。完了: ローカル起動とbuild成功。

**Phase 1: DB/認証** — migrations、RLS、複合FK、RLSテスト、Auth、オンボーディング、共通レイアウト。完了: 2組織間のアクセス遮断を確認。

**Phase 2: 顧客/サイト** — クライアントCRUD、サイトCRUD、検索、詳細、削除制約。完了: 10顧客/30サイトの登録操作が可能。

**Phase 3: 管理サービス/契約** — 更新日、サービス情報、月額保守契約、MRR集計。完了: 期限・売上計算の単体テスト成功。

**Phase 4: タスク/履歴/ダッシュボード** — タスクCRUD、完了処理、作業履歴、期限一覧、ダッシュボード。完了: 主要業務フローE2E成功。

**Phase 5: β公開** — レスポンシブ、空状態、エラー、メール認証、セキュリティ検証、プライバシー/利用規約、運用手順、Vercelデプロイ。完了: 受け入れ基準すべて通過。

目安は実装2〜4週間＋検証/修正1〜2週間（AI支援・作業時間により変動）。

## 14. 環境変数

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

実際のSupabase SDK/プロジェクトで推奨される公開キー名（publishable key等）に合わせて統一する。キーは実値をリポジトリへコミットしない。

## 15. Codex / Claude Codeへの実装指示（そのまま利用可）

> このリポジトリで SiteOps v0.1 を実装してください。仕様の唯一の基準は `SiteOps_v0.1_requirements.md` です。まず既存ファイルを調査し、Phase 0→5の実装計画を提示してください。最初はPhase 0とPhase 1のみ実装し、完了後に差分、マイグレーション、RLSテスト結果、起動手順、残課題を報告してください。以後は私の確認を受けて次のPhaseへ進んでください。TypeScript strict、Zod検証、全業務テーブルのRLS、組織境界を保証する複合FK、認証・組織権限チェックを必須にしてください。実装していない機能を実装済みと報告しないでください。秘密鍵をハードコードしないでください。仕様の矛盾・未決事項を見つけたら勝手に拡張せず、選択肢と推奨を示してください。各Phaseで lint/typecheck/test/build を実行し、失敗があれば原因と修正を記録してください。

## 16. v0.2以降の候補

メール通知、チーム招待と役割、監視（HTTP/SSL/ドメイン）、CSVインポート/エクスポート、定期タスク自動生成、PDF月次レポート、Stripe課金、サイト単位契約、監査ログ、顧客ポータル。優先順位はβ利用者の継続率と支払い意思で決定する。

## 17. 実装前の明示的な前提

1. v0.1は単一オーナー組織で提供。マルチテナントDB設計は最初から実装。
2. 月額料金は販売仮説。v0.1では課金しない。
3. 期限は手入力、アプリ内表示のみ。自動監視・メール通知は行わない。
4. 契約は顧客単位、複数契約を許可。MRRはactiveのみ集計。
5. 画面言語は日本語、通貨JPY、日付の初期運用は日本時間。
