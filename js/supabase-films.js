
/* =========================================
   三氏影視｜Supabase 動態作品載入
   從 films 資料表讀取已發布作品
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  const worksGrid = document.querySelector(".works-grid");

  if (!worksGrid) {
    console.error("找不到影視作品展示區。");
    return;
  }

  if (!window.sanshiSupabase) {
    console.error("Supabase 尚未初始化，無法讀取影片。");
    return;
  }

  try {
    // 從 Supabase 讀取已發布的作品
    const { data: films, error } = await window.sanshiSupabase
      .from("films")
      .select(
        "id, title, video_url, thumbnail_url, category, description, is_published, sort_order"
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (error) {
      throw error;
    }

    if (!Array.isArray(films)) {
      throw new Error("影片資料格式不正確。");
    }

    // 影片分類的中文名稱
    const categoryNames = {
      film: "電影預告片",
      short: "短片故事",
      music: "音樂 MV"
    };

    // 保留原本作品卡片的 CSS 類別名稱
    const cardNumberNames = [
      "",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine"
    ];

    const fragment = document.createDocumentFragment();

    films.forEach((film) => {
      const card = document.createElement("a");

      // 保留原本卡片的基本樣式及編號類別
      const order = Number(film.sort_order);
      const numberClass = cardNumberNames[order] || "";

      card.className = numberClass
        ? `work-card work-card-${numberClass}`
        : "work-card";

      card.href = film.video_url || "#";
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.dataset.category = film.category || "";

      card.setAttribute(
        "aria-label",
        `觀看${film.title || "三氏影視作品"}`
      );

      // 建立作品封面
      const visual = document.createElement("div");
      visual.className = "work-visual";

      if (film.thumbnail_url) {
        visual.style.backgroundImage =
          `url("${film.thumbnail_url}")`;
        visual.style.backgroundPosition = "center";
        visual.style.backgroundSize = "cover";
        visual.style.backgroundRepeat = "no-repeat";
      }

      // 建立作品文字區
      const meta = document.createElement("div");
      meta.className = "work-meta";

      const info = document.createElement("div");

      const categoryLabel = document.createElement("span");
      categoryLabel.textContent =
        `${categoryNames[film.category] || "影視作品"} ` +
        `${String(order).padStart(2, "0")}`;

      const title = document.createElement("h3");
      title.textContent = film.title || "未命名作品";

      info.append(categoryLabel, title);

      // 建立右側箭頭
      const arrow = document.createElement("span");
      arrow.className = "work-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";

      meta.append(info, arrow);

      // 完成作品卡片
      card.append(visual, meta);
      fragment.appendChild(card);
    });

    // 只有成功取得資料後，才替換原本的作品卡片
    worksGrid.replaceChildren(fragment);

    // 更新原本 script.js 的作品清單
    workCards = worksGrid.querySelectorAll(
      ".works-grid > .work-card"
    );

    // 更新原本的統計、搜尋及分類顯示
    updateWorkStats();
    updateWorkDisplay();

    console.log(`Supabase 已成功載入 ${films.length} 部作品。`);

  } catch (error) {
    // 載入失敗時保留原本的作品卡片
    console.error("Supabase 影片載入失敗：", error);
  }
});
