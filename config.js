// ===== Supabase 配置 =====
// Supabase URL 与 anon key（anon key 属公开只读键，前端需浏览器可见；安全靠 RLS）
const SUPABASE_URL = "https://fcwxzjtruzmqocgtfjgq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9-_bNf4iIyarg8pGcsYRQQ_scqIc1_Z";

// 全局 Supabase 客户端。
// 注意：这里用独立名 sb，避免与 CDN 库自身的 "supabase" 全局名重复导致
// "Identifier 'supabase' has already been declared"。
// 页面中所有对客户端的使用都改用 sb.*；若库未加载则给出明确控制台报错。
const sb =
  window.supabase && window.supabase.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : (console.error("[supabase] 缺失 @supabase/supabase-js（window.supabase 未定义）"),
       null);
