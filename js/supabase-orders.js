/*
 * 三氏影視｜客製化商品訂購表單
 * 依賴 window.sanshiSupabase 與 Supabase Auth Anonymous Sign-Ins。
 * 此表單僅建立待確認訂單，不收款、不處理信用卡資料。
 */
(() => {
  "use strict";

  const supabase = window.sanshiSupabase;
  const form = document.getElementById("custom-order-form");
  const message = document.getElementById("custom-order-message");
  const history = document.getElementById("custom-order-history");
  if (!form || !message || !history) return;

  if (!supabase) {
    message.textContent = "Supabase 尚未連線，請確認網站資料庫設定後重新整理。";
    return;
  }

  const statusNames = {
    pending: "待確認",
    reviewing: "需求確認中",
    quoted: "已報價",
    confirmed: "已確認",
    in_production: "製作中",
    shipped: "已寄出／交付",
    completed: "已完成",
    cancelled: "已取消"
  };

  const categoryNames = {
    photocard: "小卡／收藏卡",
    poster: "海報／掛報",
    keychain: "鑰匙圈",
    badge: "胸章",
    bookmark: "書卡／書籤",
    fan_goods: "其他應援／客製周邊",
    other: "其他客製商品"
  };

  function makeNode(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("zh-TW");
  }

  async function ensureVisitorSession() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (sessionData.session?.user) return sessionData.session.user;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      if (/anonymous|disabled|captcha/i.test(error.message || "")) {
        throw new Error("訪客訂購功能尚未啟用。請在 Supabase Authentication 設定中開啟 Anonymous Sign-Ins；若已啟用 CAPTCHA，請完成對應驗證。 ");
      }
      throw error;
    }
    if (!data.user) throw new Error("無法建立訂購工作階段，請稍後再試。");
    return data.user;
  }

  async function loadMyOrders(userId) {
    const heading = makeNode("h4", "", "我的訂購紀錄");
    history.replaceChildren(heading);

    const { data, error } = await supabase
      .from("custom_product_orders")
      .select("id, order_no, product_name, product_category, quantity, status, quote_amount, estimated_production_days, quote_note, quoted_at, customer_confirmed_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      history.appendChild(makeNode("p", "custom-order-help", "訂購紀錄讀取失敗：" + error.message));
      return;
    }
    if (!data.length) {
      history.appendChild(makeNode("p", "custom-order-help", "目前沒有訂購紀錄。"));
      return;
    }

    data.forEach((order) => {
      const card = makeNode("article", "custom-order-history-card");
      const title = makeNode("strong", "", `${order.order_no}｜${order.product_name}`);
      const detail = makeNode("p", "", `類別：${categoryNames[order.product_category] || order.product_category}　數量：${order.quantity}`);
      const status = makeNode("p", "", `目前狀態：${statusNames[order.status] || order.status}`);
      const date = makeNode("small", "", `送出時間：${formatDate(order.created_at)}`);
      card.append(title, detail, status);

      if (order.quote_amount !== null && order.quote_amount !== undefined) {
        const quoteAmount = new Intl.NumberFormat("zh-TW", {
          style: "currency", currency: "TWD", maximumFractionDigits: 0
        }).format(Number(order.quote_amount));
        const quote = makeNode("div", "custom-order-quote");
        quote.appendChild(makeNode("strong", "", `三氏影視報價：${quoteAmount}`));
        quote.appendChild(makeNode("p", "", `預估製作天數：${order.estimated_production_days || "未提供"} 天`));
        quote.appendChild(makeNode("p", "", `報價備註：${order.quote_note || "無"}`));
        if (order.quoted_at) quote.appendChild(makeNode("small", "", `報價時間：${formatDate(order.quoted_at)}`));
        card.appendChild(quote);

        if (order.status === "quoted") {
          const confirmButton = makeNode("button", "", "確認此報價並成立訂單");
          confirmButton.type = "button";
          confirmButton.addEventListener("click", async () => {
            const accepted = window.confirm(`確認接受訂單 ${order.order_no} 的報價 ${quoteAmount} 嗎？確認後訂單狀態將改為「已確認」。`);
            if (!accepted) return;
            confirmButton.disabled = true;
            status.textContent = "正在確認報價……";
            const { data: confirmed, error: confirmError } = await supabase.rpc(
              "confirm_custom_product_quote",
              { p_order_id: order.id }
            );
            if (confirmError) {
              confirmButton.disabled = false;
              status.textContent = "報價確認失敗：" + confirmError.message;
              return;
            }
            if (!confirmed) {
              confirmButton.disabled = false;
              status.textContent = "報價已失效或訂單狀態已變更，請重新整理後確認。";
              return;
            }
            await loadMyOrders(userId);
          });
          card.appendChild(confirmButton);
        }
      }

      card.appendChild(date);
      history.appendChild(card);
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("custom-order-submit");
    if (!form.reportValidity()) return;

    const quantity = Number(document.getElementById("order-quantity").value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      message.textContent = "訂購數量請填寫 1 至 999 的整數。";
      return;
    }

    const referenceUrl = document.getElementById("order-reference-url").value.trim();
    if (referenceUrl) {
      try {
        const parsed = new URL(referenceUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("網址必須使用 http 或 https。");
      } catch (error) {
        message.textContent = "參考網址格式不正確，請檢查後再送出。";
        return;
      }
    }

    const payload = {
      customer_name: document.getElementById("order-customer-name").value.trim(),
      customer_phone: document.getElementById("order-customer-phone").value.trim(),
      customer_email: document.getElementById("order-customer-email").value.trim(),
      line_id: document.getElementById("order-line-id").value.trim() || null,
      product_category: document.getElementById("order-product-category").value,
      product_name: document.getElementById("order-product-name").value.trim(),
      quantity,
      product_specification: document.getElementById("order-specification").value.trim() || null,
      customization_details: document.getElementById("order-customization-details").value.trim(),
      reference_url: referenceUrl || null,
      delivery_method: document.getElementById("order-delivery-method").value,
      delivery_address: document.getElementById("order-delivery-address").value.trim() || null,
      budget_note: document.getElementById("order-budget-note").value.trim() || null
    };

    button.disabled = true;
    message.textContent = "正在建立訂購需求……";

    try {
      const user = await ensureVisitorSession();
      const { data, error } = await supabase
        .from("custom_product_orders")
        .insert({ ...payload, user_id: user.id, status: "pending" })
        .select("id, order_no, status, created_at")
        .single();
      if (error) throw error;

      form.reset();
      message.replaceChildren();
      message.appendChild(document.createTextNode(
        `訂購需求已送出！訂單編號：${data.order_no}。目前狀態：待確認。請保留此編號。`
      ));
      const lineFollowUp = document.createElement("p");
      lineFollowUp.className = "custom-order-help";
      lineFollowUp.appendChild(document.createTextNode("為方便三氏影視與您確認報價及交期，請加入官方 LINE 好友，並傳送您的訂單編號："));
      const lineLink = document.createElement("a");
      lineLink.href = "https://line.me/R/ti/p/@016amvbv";
      lineLink.target = "_blank";
      lineLink.rel = "noopener noreferrer";
      lineLink.className = "line-official-link";
      lineLink.textContent = "加入三氏影視 LINE 官方帳號";
      lineFollowUp.appendChild(lineLink);
      message.appendChild(lineFollowUp);
      await loadMyOrders(user.id);
    } catch (error) {
      console.error("Custom product order submit error:", error);
      message.textContent = "訂購需求送出失敗：" + (error.message || "請稍後再試。請確認網路及資料表設定。");
    } finally {
      button.disabled = false;
    }
  });

  // 若目前瀏覽器已有登入／匿名訪客工作階段，顯示該工作階段的訂單。
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      history.appendChild(makeNode("p", "custom-order-help", "無法讀取工作階段：" + error.message));
      return;
    }
    if (data.session?.user) loadMyOrders(data.session.user.id);
  });

  // 若顧客在同一頁面稍後才登入／註冊，重新載入該會員自己的訂單紀錄。
  // 延後執行，避免在 Supabase Auth callback 內直接呼叫其他 Auth 操作。
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      window.setTimeout(() => loadMyOrders(session.user.id), 0);
    }
    if (event === "SIGNED_OUT") {
      history.replaceChildren(
        makeNode("h4", "", "我的訂購紀錄"),
        makeNode("p", "custom-order-help", "登入會員後，可在此查看該會員帳號的訂單；訪客訂單請保留原訂單編號。")
      );
    }
  });
})();
