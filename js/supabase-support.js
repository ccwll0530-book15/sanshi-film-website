/*
 * 三氏影視｜留言板與客服中心前端
 * 依賴：window.sanshiSupabase（由既有 supabase-client.js 建立）
 * 訪客採 Supabase Anonymous Sign-Ins；請先在 Supabase Auth 啟用。
 */
(() => {
  "use strict";

  const supabase = window.sanshiSupabase;
  const guestbookForm = document.getElementById("guestbook-form");
  const guestbookMessage = document.getElementById("guestbook-message");
  const guestbookList = document.getElementById("guestbook-list");
  const customerForm = document.getElementById("customer-service-form");
  const customerMessage = document.getElementById("customer-service-message");
  const customerHistory = document.getElementById("customer-ticket-history");

  if (!supabase) {
    const message = "資料庫尚未連線，請確認 js/supabase-config.js 與 js/supabase-client.js。";
    if (guestbookMessage) guestbookMessage.textContent = message;
    if (customerMessage) customerMessage.textContent = message;
    return;
  }

  function node(tag, className, text) {
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
        throw new Error("訪客工作階段尚未啟用。請在 Supabase Dashboard 的 Authentication 設定中開啟 Anonymous Sign-Ins；若專案啟用 CAPTCHA，也需完成 CAPTCHA 設定。");
      }
      throw error;
    }
    if (!data.user) throw new Error("無法建立訪客工作階段，請稍後再試。");
    return data.user;
  }

  async function loadApprovedMessages() {
    if (!guestbookList) return;
    guestbookList.replaceChildren();
    const { data, error } = await supabase
      .from("message_board")
      .select("display_name, content, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      guestbookList.appendChild(node("p", "content-note", "留言讀取失敗：" + error.message));
      return;
    }
    if (!data.length) {
      guestbookList.appendChild(node("p", "content-note", "目前還沒有公開留言，歡迎成為第一位分享心得的觀眾。"));
      return;
    }

    data.forEach((item) => {
      const card = node("article", "guestbook-entry");
      const heading = node("h3", "guestbook-entry__name", item.display_name || "觀眾");
      const date = node("p", "guestbook-entry__date", formatDate(item.created_at));
      const content = node("p", "guestbook-entry__content", item.content || "");
      card.append(heading, date, content);
      guestbookList.appendChild(card);
    });
  }

  if (guestbookForm) {
    guestbookForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = document.getElementById("guestbook-submit");
      const displayName = document.getElementById("guestbook-name").value.trim();
      const content = document.getElementById("guestbook-content").value.trim();

      if (!displayName || !content) {
        guestbookMessage.textContent = "請填寫暱稱及留言內容。";
        return;
      }
      button.disabled = true;
      guestbookMessage.textContent = "正在送出留言……";

      try {
        const user = await ensureVisitorSession();
        const { error } = await supabase.from("message_board").insert({
          user_id: user.id,
          display_name: displayName,
          content,
          status: "pending"
        });
        if (error) throw error;

        guestbookForm.reset();
        guestbookMessage.textContent = "留言已送出，待管理員審核後會公開顯示。";
      } catch (error) {
        console.error("Guestbook submit error:", error);
        guestbookMessage.textContent = "留言送出失敗：" + (error.message || "請稍後再試。");
      } finally {
        button.disabled = false;
      }
    });
  }

  const ticketStatuses = {
    open: "待處理",
    in_progress: "處理中",
    resolved: "已解決",
    closed: "已結案"
  };

  async function loadMyTickets(userId) {
    if (!customerHistory || !userId) return;
    customerHistory.replaceChildren(node("h3", "", "我的客服案件"));
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("id, ticket_no, subject, category, initial_message, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      customerHistory.appendChild(node("p", "content-note", "案件讀取失敗：" + error.message));
      return;
    }
    if (!tickets.length) {
      customerHistory.appendChild(node("p", "content-note", "目前沒有客服案件。"));
      return;
    }

    const ids = tickets.map((ticket) => ticket.id);
    const { data: replies, error: repliesError } = await supabase
      .from("support_replies")
      .select("id, ticket_id, sender_type, message, created_at")
      .in("ticket_id", ids)
      .order("created_at", { ascending: true });

    if (repliesError) {
      customerHistory.appendChild(node("p", "content-note", "對話讀取失敗：" + repliesError.message));
      return;
    }

    tickets.forEach((ticket) => {
      const card = node("article", "customer-ticket-card");
      const heading = node("h4", "", `${ticket.ticket_no}｜${ticket.subject}`);
      const status = node("p", "content-note", `狀態：${ticketStatuses[ticket.status] || ticket.status} · ${formatDate(ticket.created_at)}`);
      const firstMessage = node("p", "", ticket.initial_message || "");
      const conversation = node("div", "customer-ticket-conversation");

      (replies || []).filter((reply) => reply.ticket_id === ticket.id).forEach((reply) => {
        const replyItem = node("div", "customer-ticket-reply");
        const sender = node("strong", "", reply.sender_type === "admin" ? "三氏影視客服" : "您" );
        const date = node("small", "", formatDate(reply.created_at));
        const text = node("p", "", reply.message || "");
        replyItem.append(sender, date, text);
        conversation.appendChild(replyItem);
      });

      const replyForm = node("form", "customer-ticket-reply-form");
      const replyLabel = node("label", "", "追加訊息／回覆客服");
      const replyInput = document.createElement("textarea");
      replyInput.rows = 3;
      replyInput.maxLength = 5000;
      replyInput.required = true;
      replyInput.placeholder = "輸入補充內容或回覆客服……";
      const replyButton = node("button", "", "送出訊息");
      replyButton.type = "submit";
      const feedback = node("p", "content-note", "");
      replyForm.append(replyLabel, replyInput, replyButton, feedback);

      replyForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = replyInput.value.trim();
        if (!message) return;
        replyButton.disabled = true;
        feedback.textContent = "正在送出……";
        try {
          const { error: insertError } = await supabase.from("support_replies").insert({
            ticket_id: ticket.id,
            user_id: userId,
            sender_type: "customer",
            message
          });
          if (insertError) throw insertError;
          await loadMyTickets(userId);
        } catch (error) {
          feedback.textContent = "送出失敗：" + (error.message || "請稍後再試。");
          replyButton.disabled = false;
        }
      });

      card.append(heading, status, firstMessage, conversation, replyForm);
      customerHistory.appendChild(card);
    });
  }

  if (customerForm) {
    customerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = document.getElementById("customer-service-submit");
      const contactName = document.getElementById("customer-name").value.trim();
      const contactEmail = document.getElementById("customer-email").value.trim();
      const subject = document.getElementById("customer-subject").value.trim();
      const selectedCategory = document.getElementById("customer-category").value;
      const message = document.getElementById("customer-message").value.trim();

      if (!contactName || !contactEmail || !subject || !selectedCategory || !message) {
        customerMessage.textContent = "請完整填寫稱呼、Email、問題標題、類別及內容。";
        return;
      }

      // 將首頁選單值對應到 support_tickets 資料表允許的 category。
      const categoryMap = {
        website: "website",
        video: "technical",
        cooperation: "suggestion",
        other: "other"
      };
      const category = categoryMap[selectedCategory];
      if (!category) {
        customerMessage.textContent = "問題類別無效，請重新選擇。";
        return;
      }

      button.disabled = true;
      customerMessage.textContent = "正在建立客服案件……";
      try {
        const user = await ensureVisitorSession();
        const { data, error } = await supabase
          .from("support_tickets")
          .insert({
            user_id: user.id,
            contact_name: contactName,
            contact_email: contactEmail,
            subject,
            category,
            initial_message: message
          })
          .select("id, ticket_no")
          .single();
        if (error) throw error;

        customerForm.reset();
        customerMessage.textContent = `客服案件已建立，案件編號：${data.ticket_no}。請保留此編號。`;
        await loadMyTickets(user.id);
      } catch (error) {
        console.error("Customer service submit error:", error);
        customerMessage.textContent = "案件建立失敗：" + (error.message || "請稍後再試。");
      } finally {
        button.disabled = false;
      }
    });
  }

  // 公開訪客僅能讀取已核准留言，不會在頁面載入時自動建立 Auth 帳號。
  loadApprovedMessages();

  // 若此瀏覽器已有同一個 Supabase 登入／訪客工作階段，載入其客服案件。
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.warn("Get visitor session warning:", error);
      return;
    }
    if (data.session?.user) loadMyTickets(data.session.user.id);
  });
})();
