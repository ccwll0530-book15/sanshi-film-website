
// 三氏影視 Supabase 資料庫連線

(() => {
  const config = window.SUPABASE_CONFIG;

  // 檢查 Supabase 程式庫及連線設定
  if (!window.supabase) {
    console.error("Supabase 程式庫尚未載入。");
    return;
  }

  if (!config || !config.url || !config.publishableKey) {
    console.error("Supabase 連線設定不完整。");
    return;
  }

  // 建立 Supabase 連線
  window.sanshiSupabase = window.supabase.createClient(
    config.url,
    config.publishableKey
  );

  console.log("三氏影視 Supabase 連線初始化完成。");
})();
