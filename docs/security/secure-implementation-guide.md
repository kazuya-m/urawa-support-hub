# Supabase セキュア実装

## クライアント設定

```typescript
import {
  createSupabaseAdminClient,
  createSupabaseClient,
} from '@/infrastructure/config/supabase.ts';

// 通常使用: RLS適用
const client = createSupabaseClient();

// 管理者用: 緊急時のみ
const adminClient = createSupabaseAdminClient();
```

## 環境変数

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...  # 緊急時のみ
```

## RLSポリシー

```sql
-- サービス別アクセス制御
CREATE POLICY "Scraper service write access"
ON tickets FOR INSERT, UPDATE
TO urawa_scraper_service
USING (true);

CREATE POLICY "Notification service read access"
ON tickets FOR SELECT
TO urawa_notification_service
USING (true);
```

## JWT Claims認証

```typescript
// サービス専用JWT
const serviceJWT = await generateServiceJWT({
  role: 'service_role',
  service: 'notification',
  operations: ['read'],
});
```

## サービス権限

- **スクレイピング**: tickets INSERT/UPDATE
- **通知**: tickets SELECT + notification_history 全権限
- **モニタリング**: 全テーブル SELECT

## テスト

```typescript
// RLS適用テスト
const client = createSupabaseClient();
const { data, error } = await client.from('tickets').select('*');
```

```bash
deno test tests/security/rls-policy.test.ts --allow-env --allow-net
```

## 監査

```sql
-- アクセスログ確認
SELECT * FROM access_audit_log 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

## 関連ファイル

- `src/infrastructure/config/supabase.ts` - クライアント設定
- `supabase/migrations/003_secure_system_access.sql` - RLSマイグレーション
- `docs/security/supabase-rls-settings.md` - RLS設定詳細
