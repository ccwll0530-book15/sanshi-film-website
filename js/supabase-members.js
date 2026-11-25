/*
 * 三氏影視｜會員註冊、登入、個人資料與訪客帳號轉正式會員
 * 依賴 window.sanshiSupabase 與 create_member_system.sql。
 * 注意：匿名帳號轉會員需在 Supabase Auth 開啟 Allow manual linking。
 */
(() => {
  "use strict";

  const supabase = window.sanshiSupabase;
  const authPanel = document.getElementById("member-auth-panel");
  const accountPanel = document.getElementById("member-account-panel");
  if (!authPanel || !accountPanel) return;

  const message = document.getElementById("member-auth-message");
  const loginForm = document.getElementById("member-login-form");
  const registerForm = document.getElementById("member-register-form");
  const profileForm = document.getElementById("member-profile-form");
  const passwordForm = document.getElementById("member-password-form");
  const loginButton = document.getElementById("member-login-submit");
  const registerButton = document.getElementById("member-register-submit");
  const loginHint = document.getElementById("member-login-hint");
  const registerHint = document.getElementById("member-register-hint");
  const passwordFields = document.getElementById("member-register-password-fields");
  const statusLine = document.getElementById("member-account-status");
  const emailLine = document.getElementById("member-account-email");
  const numberLine = document.getElementById("member-account-number");
  const profileMessage = document.getElementById("member-profile-message");
  const passwordMessage = document.getElementById("member-password-message");
  const logoutButton = document.getElementById("member-logout-button");

  if (!supabase) {
    message.textContent = "Supabase 尚未連線，請確認 js/supabase-config.js 與 js/supabase-client.js。";
    return;
  }

  const fields = {
    fullName: document.getElementById("member-full-name"),
    email: document.getElementById("member-register-email"),
    phone: document.getElementById("member-phone"),
    lineId: document.getElementById("member-line-id"),
    password: document.getElementById("member-register-password"),
    passwordConfirm: document.getElementById("member-register-password-confirm"),
    loginEmail: document.getElementById("member-login-email"),
    loginPassword: document.getElementById("member-login-password"),
    profileName: document.getElementById("member-profile-name"),
    profilePhone: document.getElementById("member-profile-phone"),
    profileLine: document.getElementById("member-profile-line")
  };

  let currentUser = null;
  let currentProfile = null;
  let rendering = false;

  function setMessage(text, isError = false) {
    message.textContent = text || "";
    message.style.color = isError ? "#ffb8b8" : "#b9d8c2";
  }

  function redirectUrl() {
    return `${window.location.origin}${window.location.pathname}#member-center`;
  }

  function setFormBusy(form, busy) {
    form.querySelectorAll("button, input").forEach((element) => {
      if (element.type !== "checkbox") element.disabled = busy;
    });
  }

  async function fetchMyProfile(userId) {
    const { data, error } = await supabase
      .from("member_profiles")
      .select("id, member_no, email, email_confirmed_at, full_name, phone, line_id, is_anonymous, account_role, member_status, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("找不到會員資料。請先確認已在 Supabase 執行會員系統 SQL。 ");
    return data;
  }

  async function renderSession(user) {
    if (rendering) return;
    rendering = true;
    currentUser = user || null;
    currentProfile = null;

    try {
      if (!currentUser) {
        authPanel.hidden = false;
        accountPanel.hidden = true;
        passwordFields.hidden = false;
        loginHint.textContent = "使用已註冊的 Email 與密碼登入。";
        registerHint.textContent = "註冊後請先完成 Email 驗證，再使用會員帳號登入。";
        return;
      }

      const profile = await fetchMyProfile(currentUser.id);
      currentProfile = profile;

      if (profile.account_role === "admin") {
        authPanel.hidden = true;
        accountPanel.hidden = true;
        setMessage("此帳號為管理員，請使用管理後台，不需要在會員中心管理。", true);
        return;
      }

      if (profile.member_status === "suspended") {
        await supabase.auth.signOut();
        authPanel.hidden = false;
        accountPanel.hidden = true;
        setMessage("此會員帳號目前已停用。如需恢復使用，請聯絡三氏影視客服。", true);
        return;
      }

      if (currentUser.is_anonymous) {
        authPanel.hidden = false;
        accountPanel.hidden = true;
        passwordFields.hidden = true;
        loginHint.textContent = "目前瀏覽器使用訪客工作階段。若登入其他會員帳號，原訪客訂單不會自動合併。";
        registerHint.textContent = "將目前訪客帳號連結到 Email，可保留這個帳號 ID 與此工作階段的訂單。請先啟用 Supabase 的 Allow manual linking。Email 驗證完成後，再於會員中心設定密碼。";
        if (profile.full_name && !fields.fullName.value) fields.fullName.value = profile.full_name;
        if (profile.email) fields.email.value = profile.email;
        if (profile.phone && !fields.phone.value) fields.phone.value = profile.phone;
        if (profile.line_id && !fields.lineId.value) fields.lineId.value = profile.line_id;
        return;
      }

      authPanel.hidden = true;
      accountPanel.hidden = false;
      emailLine.textContent = profile.email || currentUser.email || "Email 尚未驗證";
      numberLine.textContent = profile.member_no || "會員編號建立中";
      statusLine.textContent = profile.email_confirmed_at
        ? `會員狀態：${profile.member_status === "active" ? "正常" : "停用"}｜Email 已驗證`
        : `會員狀態：${profile.member_status === "active" ? "正常" : "停用"}｜Email 尚未完成驗證`;
      fields.profileName.value = profile.full_name || "";
      fields.profilePhone.value = profile.phone || "";
      fields.profileLine.value = profile.line_id || "";
      setMessage("已登入三氏影視會員中心。");
    } catch (error) {
      authPanel.hidden = false;
      accountPanel.hidden = true;
      setMessage("會員資料讀取失敗：" + (error.message || "請重新整理頁面。"), true);
      console.error("Member profile load error:", error);
    } finally {
      rendering = false;
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormBusy(loginForm, true);
    setMessage("正在登入會員……");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: fields.loginEmail.value.trim(),
        password: fields.loginPassword.value
      });
      if (error) throw error;
      await renderSession(data.user);
      loginForm.reset();
    } catch (error) {
      setMessage("登入失敗：" + (error.message || "請檢查 Email 與密碼。"), true);
    } finally {
      setFormBusy(loginForm, false);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fullName = fields.fullName.value.trim();
    const email = fields.email.value.trim();
    const phone = fields.phone.value.trim();
    const lineId = fields.lineId.value.trim();
    const profileData = { full_name: fullName, phone, line_id: lineId };
    const isAnonymous = Boolean(currentUser?.is_anonymous);

    if (!fullName || fullName.length > 80) {
      setMessage("請填寫姓名／稱呼，最多 80 個字。", true);
      fields.fullName.focus();
      return;
    }

    if (!isAnonymous) {
      const password = fields.password.value;
      if (password.length < 8) {
        setMessage("密碼至少需要 8 個字元。", true);
        fields.password.focus();
        return;
      }
      if (password !== fields.passwordConfirm.value) {
        setMessage("兩次輸入的密碼不一致。", true);
        fields.passwordConfirm.focus();
        return;
      }
    }

    setFormBusy(registerForm, true);
    setMessage(isAnonymous ? "正在將訪客帳號連結到 Email……" : "正在建立會員帳號……");
    try {
      if (isAnonymous) {
        const { error } = await supabase.auth.updateUser(
          { email, data: profileData },
          { emailRedirectTo: redirectUrl() }
        );
        if (error) throw error;
        setMessage("Email 驗證信已寄出。請開啟信件完成驗證，再返回本頁到會員中心設定密碼。這個流程會保留目前訪客帳號 ID 與既有訂單。 ");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: fields.password.value,
          options: {
            data: profileData,
            emailRedirectTo: redirectUrl()
          }
        });
        if (error) throw error;
        registerForm.reset();
        if (data.session && data.user) {
          await renderSession(data.user);
          setMessage("會員註冊成功，已登入會員中心。", false);
        } else {
          setMessage("會員帳號已建立。請前往 Email 收取驗證信，完成驗證後即可登入。若沒有收到，請檢查垃圾郵件匣。 ");
        }
      }
    } catch (error) {
      const detail = error.message || "請稍後再試。";
      if (/manual linking|identity|link/i.test(detail)) {
        setMessage("無法連結訪客帳號。請先到 Supabase → Authentication → Sign In / Providers，開啟 Allow manual linking，再重新操作。原訪客訂單不會被刪除。", true);
      } else {
        setMessage("會員註冊失敗：" + detail, true);
      }
    } finally {
      setFormBusy(registerForm, false);
      if (isAnonymous) passwordFields.hidden = true;
    }
  });

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser || currentUser.is_anonymous) return;
    const fullName = fields.profileName.value.trim();
    if (!fullName) {
      profileMessage.textContent = "請填寫姓名／稱呼。";
      return;
    }
    const saveButton = profileForm.querySelector("button[type='submit']");
    saveButton.disabled = true;
    profileMessage.textContent = "正在儲存會員資料……";
    try {
      const { data, error } = await supabase.rpc("update_my_member_profile", {
        p_full_name: fullName,
        p_phone: fields.profilePhone.value.trim() || null,
        p_line_id: fields.profileLine.value.trim() || null
      });
      if (error) throw error;
      if (!data) throw new Error("會員資料未更新，請確認帳號狀態。 ");
      profileMessage.textContent = "會員資料已更新。";
      await renderSession(currentUser);
    } catch (error) {
      profileMessage.textContent = "儲存失敗：" + (error.message || "請稍後再試。 ");
    } finally {
      saveButton.disabled = false;
    }
  });

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.getElementById("member-new-password").value;
    const confirm = document.getElementById("member-new-password-confirm").value;
    if (password.length < 8) {
      passwordMessage.textContent = "密碼至少需要 8 個字元。";
      return;
    }
    if (password !== confirm) {
      passwordMessage.textContent = "兩次輸入的密碼不一致。";
      return;
    }
    const button = passwordForm.querySelector("button[type='submit']");
    button.disabled = true;
    passwordMessage.textContent = "正在更新密碼……";
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      passwordForm.reset();
      passwordMessage.textContent = "密碼已設定／更新成功。下次可使用 Email 與新密碼登入。";
      const { data } = await supabase.auth.getUser();
      currentUser = data.user || currentUser;
    } catch (error) {
      passwordMessage.textContent = "密碼更新失敗：" + (error.message || "請先完成 Email 驗證，再設定密碼。 ");
    } finally {
      button.disabled = false;
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await renderSession(null);
      setMessage("已安全登出。", false);
    } catch (error) {
      setMessage("登出失敗：" + (error.message || "請稍後再試。"), true);
    } finally {
      logoutButton.disabled = false;
    }
  });

  // 避免在 Supabase Auth callback 內直接執行其他 Auth 呼叫。
  supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => renderSession(session?.user || null), 0);
  });

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      setMessage("無法讀取登入狀態：" + error.message, true);
      return;
    }
    renderSession(data.session?.user || null);
  });
})();
