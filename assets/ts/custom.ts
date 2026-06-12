/**
 * TOC 目录折叠/展开功能
 *
 * - 为所有包含子级 ul/ol 的 li 添加折叠按钮
 * - 点击按钮可折叠/展开子级
 * - 当 scrollspy 激活嵌套在折叠区域内的链接时，自动展开祖先级
 */

function initTocCollapse() {
    const tocNav = document.getElementById("TableOfContents");
    if (!tocNav) return;

    // 1. 为所有包含子列表的 li 添加 class 和 toggle 按钮
    const allLis = tocNav.querySelectorAll("li");
    allLis.forEach((li) => {
        const childList = li.querySelector(":scope > ul, :scope > ol");
        if (!childList) return;

        li.classList.add("has-children");

        // 创建折叠按钮
        const toggle = document.createElement("span");
        toggle.className = "toc-toggle";
        toggle.textContent = "▾"; // 朝下三角
        toggle.setAttribute("aria-label", "Toggle section");
        toggle.setAttribute("role", "button");
        toggle.setAttribute("tabindex", "0");
        toggle.setAttribute("aria-expanded", "true"); // 初始为展开状态

        // 将按钮插入 li 的最前面
        li.insertBefore(toggle, li.firstChild);

        // 点击/键盘事件 -> 切换折叠
        const toggleCollapse = (e: Event) => {
            e.stopPropagation();
            li.classList.toggle("collapsed");
            const expanded = !li.classList.contains("collapsed");
            toggle.setAttribute("aria-expanded", String(expanded));
        };
        toggle.addEventListener("click", toggleCollapse);
        toggle.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleCollapse(e);
            }
        });
    });

    // 2. 监听 scrollspy 的 active-class 变化，自动展开被折叠的祖先
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type !== "attributes") continue;
            const target = m.target as HTMLElement;
            if (!target.classList.contains("active-class")) continue;

            // 展开所有被折叠的祖先 li（限定在 tocNav 范围内）
            let parent: HTMLElement | null = target.parentElement;
            while (parent && parent !== tocNav) {
                if (parent.tagName === "LI" && parent.classList.contains("collapsed")) {
                    parent.classList.remove("collapsed");
                    // 同步更新 aria-expanded
                    const btn = parent.querySelector(":scope > .toc-toggle");
                    if (btn) btn.setAttribute("aria-expanded", "true");
                }
                parent = parent.parentElement;
            }
        }
    });

    // 监听整个 TOC 内所有 li 的 class 属性变化
    observer.observe(tocNav, {
        attributes: true,
        attributeFilter: ["class"],
        subtree: true,
    });
}

// 在 DOM 加载后初始化
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTocCollapse);
} else {
    initTocCollapse();
}
