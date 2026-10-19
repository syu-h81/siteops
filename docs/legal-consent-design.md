# 利用規約・プライバシーポリシー同意履歴の設計案

ステータス: Phase 1実装前の設計案。Phase 0ではDBに反映しない。

## 目的

将来の有料SaaS運用に備え、利用者がどの文書バージョンにいつ同意したかを改ざんせずに記録する。

## 推奨データモデル

### `legal_document_versions`

- `id uuid primary key`
- `document_type text not null`: `terms` / `privacy`
- `version text not null`
- `published_at timestamptz not null`
- `effective_at timestamptz not null`
- `content_path text not null`
- `content_hash text not null`
- `is_current boolean not null default false`
- `created_at timestamptz not null default now()`
- `unique (document_type, version)`

### `user_legal_consents`

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `document_version_id uuid not null references legal_document_versions(id)`
- `accepted_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `unique (user_id, document_version_id)`

## 運用・セキュリティ方針

- `accepted_at` はブラウザーの時刻を信頼せず、DBの `now()` で記録する。
- 文書バージョンはブラウザーから自由入力させず、サーバーが現行バージョンを解決する。
- 同意履歴はappend-onlyとし、通常のUPDATE/DELETEを許可しない。
- RLSで本人の履歴のみSELECT可能とし、INSERTは認証フローからの専用処理に限定する。
- 新バージョンの文書公開後は、必要に応じて再同意を求め、旧履歴を保持する。
- v0.1は1ユーザー=1組織のためユーザー単位で記録する。将来、組織代表者としての同意が必要になった場合は、組織IDと同意者ユーザーIDの両方を記録する。
- 保持期間、アカウント削除時の扱い、法的に必要な記録項目は、β公開前に法務要件と合わせて確定する。

## Phase 1で決めること

1. Supabase Authのメール確認前後のどの時点で同意履歴を確定するか。
2. サインアップ画面の同意操作とDB記録を二重送信に強い処理にする方法。
3. 文書本文の管理先と `content_hash` の生成方法。
