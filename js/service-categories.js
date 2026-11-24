// 三氏影視｜服務項目展開切換
// 「查看商品與訂購」會直接開啟訂購表單；介紹影片與商品展示保留在表單下方。
(() => {
  "use strict";

  const section = document.querySelector(".services-section");
  if (!section) return;

  const buttons = Array.from(section.querySelectorAll(".service-card-action .extra-category-button[data-view]"));
  const panels = {
    products: document.getElementById("custom-products-view"),
    courses: document.getElementById("courses-view")
  };

  if (!buttons.length || !panels.products || !panels.courses) return;

  function closePanels() {
    Object.values(panels).forEach((panel) => { panel.hidden = true; });
    buttons.forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-expanded", "false");
    });
  }

  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      const panel = panels[view];
      if (!panel) return;

      const isAlreadyOpen = !panel.hidden && button.classList.contains("is-active");
      closePanels();
      if (isAlreadyOpen) return;

      panel.hidden = false;
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");
      button.setAttribute("aria-expanded", "true");

      // 商品按鈕直接定位到表單，不必先滑過介紹影片與商品卡片。
      const target = view === "products"
        ? document.getElementById("custom-order")
        : panel;

      requestAnimationFrame(() => {
        (target || panel).scrollIntoView({ behavior: "smooth", block: "start" });
        if (view === "products") {
          document.getElementById("custom-order-heading")?.focus({ preventScroll: true });
        }
      });
    });
  });

  // 切回影視作品分類時，收合服務展開內容。
  document.querySelectorAll(".works-filters .filter-button").forEach((button) => {
    button.addEventListener("click", closePanels);
  });
})();
