// 三氏影視｜服務項目中的客製化商品與課程教學切換
// 入口放在「服務項目」區，不再混入「影視作品」分類篩選。
(() => {
  "use strict";

  const buttons = Array.from(
    document.querySelectorAll(".services-section .extra-category-button[data-view]")
  );
  const productPanel = document.getElementById("custom-products-view");
  const coursePanel = document.getElementById("courses-view");
  const panels = {
    products: productPanel,
    courses: coursePanel
  };

  if (!buttons.length || !productPanel || !coursePanel) return;

  function closePanels() {
    Object.values(panels).forEach((panel) => {
      panel.hidden = true;
    });
    buttons.forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-expanded", "false");
    });
  }

  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const selectedView = button.dataset.view;
      const selectedPanel = panels[selectedView];
      if (!selectedPanel) return;

      const alreadyOpen = !selectedPanel.hidden && button.classList.contains("is-active");
      closePanels();
      if (alreadyOpen) return;

      selectedPanel.hidden = false;
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");
      button.setAttribute("aria-expanded", "true");

      selectedPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // 使用者切換回影視作品分類時，收合服務項目的展開內容。
  document.querySelectorAll(".works-filters .filter-button").forEach((button) => {
    button.addEventListener("click", closePanels);
  });
})();
