// 手機版導覽選單：點擊右上角按鈕，展開或收合導覽列。
const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

if (menuButton && mainNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "關閉選單" : "開啟選單");
  });

  // 點選導覽項目後，自動收起手機選單。
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "開啟選單");
    });
  });
}

// 自動更新頁尾年份。
const yearElement = document.querySelector("#current-year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// ========================================
// 三氏影視｜作品分類篩選功能
// ========================================


// ========================================
// 三氏影視｜作品分類＋搜尋整合功能
// ========================================

// 取得分類按鈕
const workFilterButtons = document.querySelectorAll(
  ".works-filters .filter-button"
);

// 取得九部作品
let workCards = document.querySelectorAll(
  ".works-grid > .work-card"
);

// 取得搜尋框及結果數量
const workSearchInput = document.querySelector("#work-search");
const searchResultCount = document.querySelector("#search-result-count");

// 記錄目前選擇的分類
let selectedWorkFilter = "all";

// 每部作品的分類
const categoryByClass = {
  "work-card-one": "film",
  "work-card-two": "film",
  "work-card-three": "film",
  "work-card-four": "film",
  "work-card-five": "film",
  "work-card-six": "short",
  "work-card-seven": "music",
  "work-card-eight": "short",
  "work-card-nine": "music"
};

// 將分類設定到每張作品卡片
workCards.forEach((card) => {
  const categoryClass = Object.keys(categoryByClass).find(
    (className) => card.classList.contains(className)
  );

  if (categoryClass) {
    card.dataset.category = categoryByClass[categoryClass];
  }
});

// ========================================
// 三氏影視｜作品數量自動統計
// ========================================

function updateWorkStats() {

  // 計算所有作品及各分類數量
  const counts = {
    total: workCards.length,
    film: 0,
    short: 0,
    music: 0
  };

  workCards.forEach((card) => {

    const category = card.dataset.category;

    if (category === "film") {
      counts.film++;

    } else if (category === "short") {
      counts.short++;

    } else if (category === "music") {
      counts.music++;
    }

  });

  // 將數字格式化為兩位數
  const formatCount = (number) =>
    String(number).padStart(2, "0");

  // 更新網頁上的統計數字
  const statTotal = document.querySelector("#stat-total");
  const statFilm = document.querySelector("#stat-film");
  const statShort = document.querySelector("#stat-short");
  const statMusic = document.querySelector("#stat-music");

  if (statTotal) {
    statTotal.textContent = formatCount(counts.total);
  }

  if (statFilm) {
    statFilm.textContent = formatCount(counts.film);
  }

  if (statShort) {
    statShort.textContent = formatCount(counts.short);
  }

  if (statMusic) {
    statMusic.textContent = formatCount(counts.music);
  }
}

// 網頁載入時自動計算
updateWorkStats();

// 更新作品顯示狀態
function updateWorkDisplay() {

  const searchText = (workSearchInput?.value || "")
    .trim()
    .toLocaleLowerCase();

  let visibleCount = 0;

  workCards.forEach((card) => {

    // 檢查分類是否符合
    const categoryMatches =
      selectedWorkFilter === "all" ||
      card.dataset.category === selectedWorkFilter;

    // 取得作品文字
    const searchableText = card.textContent.toLocaleLowerCase();

    // 檢查搜尋文字是否符合
    const searchMatches =
      searchText === "" ||
      searchableText.includes(searchText);

    // 分類與搜尋必須同時符合
    const shouldShow =
      categoryMatches && searchMatches;

    card.hidden = !shouldShow;

    if (shouldShow) {
      visibleCount++;
    }
  });

  // 更新搜尋結果數量
  if (searchResultCount) {

    if (visibleCount === 0) {
      searchResultCount.textContent =
        "找不到符合條件的作品";

    } else if (searchText !== "") {
      searchResultCount.textContent =
        `搜尋結果：${visibleCount} 部作品`;

    } else if (selectedWorkFilter === "all") {
      searchResultCount.textContent =
        `目前共有 ${visibleCount} 部作品`;

    } else {
      searchResultCount.textContent =
        `目前顯示 ${visibleCount} / ${workCards.length} 部作品`;
    }
  }
}

// 點擊分類按鈕
workFilterButtons.forEach((button) => {

  button.addEventListener("click", () => {

    selectedWorkFilter = button.dataset.filter;

    // 更新按鈕外觀
    workFilterButtons.forEach((item) => {

      const isActive = item === button;

      item.classList.toggle("is-active", isActive);

      item.setAttribute(
        "aria-pressed",
        String(isActive)
      );
    });

    updateWorkDisplay();
  });
});
// 客製化商品與課程教學切換功能

const extraCategoryButtons = document.querySelectorAll(
    ".works-filters .extra-category-button"
);

const worksGridElement = document.querySelector(".works-grid");
const customProductsView = document.getElementById("custom-products-view");
const coursesView = document.getElementById("courses-view");
const worksSearchSection = document.querySelector(".works-search");
const worksSearchCount = document.getElementById("search-result-count");
const worksContentNote = document.querySelector(".works-section .content-note");

// 點擊原本四個影片分類時，恢復影片展示
function showFilmWorksView() {
    worksGridElement.hidden = false;
    customProductsView.hidden = true;
    coursesView.hidden = true;

    worksSearchSection.hidden = false;
    worksSearchCount.hidden = false;
    worksContentNote.hidden = false;

    extraCategoryButtons.forEach((item) => {
        item.classList.remove("is-active");
        item.setAttribute("aria-pressed", "false");
    });
}

// 原本四個影片分類繼續正常運作
workFilterButtons.forEach((button) => {
    button.addEventListener("click", showFilmWorksView);
});

// 點擊客製化商品或課程教學
extraCategoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const selectedView = button.dataset.view;

        worksGridElement.hidden = true;

        customProductsView.hidden = selectedView !== "products";
        coursesView.hidden = selectedView !== "courses";

        worksSearchSection.hidden = true;
        worksSearchCount.hidden = true;
        worksContentNote.hidden = true;

        workFilterButtons.forEach((item) => {
            item.classList.remove("is-active");
            item.setAttribute("aria-pressed", "false");
        });

        extraCategoryButtons.forEach((item) => {
            const isActive = item === button;

            item.classList.toggle("is-active", isActive);
            item.setAttribute("aria-pressed", String(isActive));
        });
    });
});
// 輸入文字時即時搜尋
if (workSearchInput) {

  workSearchInput.addEventListener(
    "input",
    updateWorkDisplay
  );
}

// 網頁載入時顯示全部作品
updateWorkDisplay();


// ========================================
// 三氏影視｜網站內 YouTube 播放視窗
// ========================================

const videoModal = document.getElementById("video-modal");
const videoPlayer = document.getElementById("video-player");
const videoModalTitle = document.getElementById("video-modal-title");
const worksGrid = document.querySelector(".works-grid");

let lastFocusedElement = null;

// 從 YouTube 網址取得影片 ID
function getYouTubeVideoId(link) {
  try {
    const url = new URL(link, document.baseURI);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }

    if (host.endsWith("youtube.com")) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      const match = url.pathname.match(/^\/(embed|shorts)\/([^/?]+)/);
      return match ? match[2] : null;
    }

    return null;
  } catch (error) {
    console.error("無法解析影片網址：", error);
    return null;
  }
}

// 開啟影片視窗
function openVideoModal(videoId, title) {
  if (!videoModal || !videoPlayer) return;

  lastFocusedElement = document.activeElement;

  videoModalTitle.textContent = title;

  videoPlayer.src =
    "https://www.youtube.com/embed/" +
    encodeURIComponent(videoId) +
    "?autoplay=1&rel=0";

  videoModal.classList.add("is-open");
  videoModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("video-modal-open");

  const closeButton = videoModal.querySelector(".video-modal__close");

  if (closeButton) {
    closeButton.focus();
  }
}

// 關閉影片視窗
function closeVideoModal() {
  if (!videoModal || !videoPlayer) return;

  videoModal.classList.remove("is-open");
  videoModal.setAttribute("aria-hidden", "true");

  // 清除影片網址，停止播放
  videoPlayer.src = "";

  document.body.classList.remove("video-modal-open");

  if (lastFocusedElement && lastFocusedElement.focus) {
    lastFocusedElement.focus();
  }
}


  // 監聽作品卡片點擊（支援 Supabase 動態新增的卡片）
  if (worksGrid && videoModal && videoPlayer) {
    worksGrid.addEventListener("click", (event) => {
      const card = event.target.closest("a.work-card[href]");

      if (!card || !worksGrid.contains(card)) return;

      const link = card.getAttribute("href");
      const videoId = getYouTubeVideoId(link);

      // 非單一 YouTube 影片網址，保留原本連結行為
      if (!videoId) return;

      event.preventDefault();

      const title =
        card.querySelector(".work-meta h3")?.textContent.trim() ||
        "三氏影視作品";

      openVideoModal(videoId, title);
    });
  }


// 點擊 X 或黑色背景，關閉視窗
if (videoModal) {
  videoModal.querySelectorAll("[data-close-video]").forEach((button) => {
    button.addEventListener("click", closeVideoModal);
  });
}

// 按鍵盤 Esc，關閉視窗
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    videoModal?.classList.contains("is-open")
  ) {
    closeVideoModal();
  }
});
