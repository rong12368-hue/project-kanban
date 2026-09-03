// ===== Supabase 配置 =====
// 请将下面的占位符替换为你自己的 Supabase 项目实际密钥后使用。
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// 全局 Supabase 客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
