(function () {
  const STORAGE_KEY = "dailyEodEntries_v1";
  const THEME_KEY = "dailyEodTheme";

  const nameInput = document.getElementById("nameInput");
  const dateInput = document.getElementById("dateInput");
  const titleInput = document.getElementById("titleInput");
  const contentInput = document.getElementById("contentInput");
  const previewBox = document.getElementById("previewBox");
  const generateTemplateBtn = document.getElementById("generateTemplateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const saveBtn = document.getElementById("saveBtn");
  const entriesList = document.getElementById("entriesList");
  const entriesCount = document.getElementById("entriesCount");
  const editingBadge = document.getElementById("editingBadge");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const settingsThemeToggle = document.getElementById("settingsThemeToggle");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");
  const clearAllBtn = document.getElementById("clearAllBtn");

  const tabs = document.querySelectorAll(".tab");
  const tabPanels = document.querySelectorAll(".tab-panel");

  let entries = [];
  let editingId = null;

  function uuid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(theme);
  }

  function setTheme(theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    const icon = theme === "dark" ? "☾" : "☼";
    themeIcon.textContent = icon;
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
  }

  function formatDateForInput(date) {
    return date.toISOString().split("T")[0];
  }

  function formatDisplayDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr || "Unknown date";

    const day = d.getDate().toString().padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  function initDate() {
    dateInput.value = formatDateForInput(new Date());
  }

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse entries", e);
      return [];
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function updatePreview() {
    const name = nameInput.value.trim() || "Your Name";
    const date = dateInput.value || formatDateForInput(new Date());
    const title = titleInput.value.trim() || "Today's Tasks & Progress";
    const details = contentInput.value.trim() || "1. ...";

    const displayDate = formatDisplayDate(date);
    const header = `EOD | ${displayDate} | ${name}`;

    const finalText = `${header}

${title}

${details}`;
    previewBox.textContent = finalText;
  }

  function generateTemplate() {
    const currentDetails = contentInput.value.trim();
    if (currentDetails) {
      updatePreview();
      return;
    }

    const template = [
      "1. Task Category One",
      "	- Point one",
      "	- Point two",
      "",
      "2. Task Category Two",
      "	- Point one",
      "	- Point two",
    ].join("\n");

    contentInput.value = template;
    updatePreview();
  }

  function clearForm() {
    contentInput.value = "";
    titleInput.value = "Today's Tasks & Progress";
    initDate();
    editingId = null;
    editingBadge.classList.add("hidden");
    updatePreview();
  }

  function copyCurrent() {
    const text = previewBox.textContent.trim();
    if (!text) return;

    navigator.clipboard
      .writeText(text)
      .catch((err) => console.error("Copy failed", err));
  }

  function upsertEntry() {
    const name = nameInput.value.trim() || "Your Name";
    const date = dateInput.value || formatDateForInput(new Date());
    const title = titleInput.value.trim() || "Today's Tasks & Progress";
    const details = contentInput.value.trim();

    if (!details) {
      alert("Please add some task details before saving.");
      return;
    }

    const displayDate = formatDisplayDate(date);
    const header = `EOD | ${displayDate} | ${name}`;
    const fullText = `${header}\n\n${title}\n\n${details}`;

    if (editingId) {
      const idx = entries.findIndex((e) => e.id === editingId);
      if (idx !== -1) {
        entries[idx] = {
          ...entries[idx],
          name,
          date,
          title,
          details,
          content: fullText,
          updatedAt: new Date().toISOString(),
        };
      }
      editingId = null;
      editingBadge.classList.add("hidden");
    } else {
      entries.unshift({
        id: uuid(),
        name,
        date,
        title,
        details,
        content: fullText,
        createdAt: new Date().toISOString(),
      });
    }

    saveEntries();
    renderEntries();
    clearForm();
  }

  function startEditing(id) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    editingId = id;
    editingBadge.classList.remove("hidden");

    nameInput.value = entry.name;
    dateInput.value = entry.date || formatDateForInput(new Date());
    titleInput.value = entry.title;
    contentInput.value = entry.details;
    updatePreview();

    switchTab("create");
  }

  function deleteEntry(id) {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    entries = entries.filter((e) => e.id !== id);
    saveEntries();
    renderEntries();
  }

  function copyEntry(id) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    navigator.clipboard.writeText(entry.content).catch((err) => {
      console.error("Copy failed", err);
    });
  }

  function renderEntries() {
    entriesCount.textContent = entries.length
      ? `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`
      : "";

    entriesList.innerHTML = "";

    if (!entries.length) {
      entriesList.classList.add("empty-state");
      entriesList.innerHTML =
        "<p>No entries yet. Create your first EOD in the “New Entry” tab.</p>";
      return;
    }

    entriesList.classList.remove("empty-state");

    entries.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "entry-card";

      const header = document.createElement("div");
      header.className = "entry-header";

      const titleSpan = document.createElement("div");
      titleSpan.className = "entry-title";
      titleSpan.textContent = entry.title || "EOD Entry";

      const metaSpan = document.createElement("div");
      metaSpan.className = "entry-meta";
      metaSpan.textContent = formatDisplayDate(entry.date);

      header.appendChild(titleSpan);
      header.appendChild(metaSpan);

      const preview = document.createElement("div");
      preview.className = "entry-preview";
      preview.textContent = entry.content;

      const actions = document.createElement("div");
      actions.className = "entry-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn ghost";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => startEditing(entry.id));

      const copyBtn = document.createElement("button");
      copyBtn.className = "btn secondary";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => copyEntry(entry.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => deleteEntry(entry.id));

      actions.appendChild(editBtn);
      actions.appendChild(copyBtn);
      actions.appendChild(deleteBtn);

      card.appendChild(header);
      card.appendChild(preview);
      card.appendChild(actions);

      entriesList.appendChild(card);
    });
  }

  function switchTab(tabName) {
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });
    tabPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${tabName}`);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
    });
  });

  function exportEntries() {
    if (!entries.length) {
      alert("No entries to export.");
      return;
    }

    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `eod-entries-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importEntries(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) {
          alert("Invalid file format. Expected an array of entries.");
          return;
        }
        entries = imported;
        saveEntries();
        renderEntries();
        alert("Entries imported successfully.");
      } catch (err) {
        console.error("Import failed", err);
        alert("Failed to import file. Check console for details.");
      }
    };
    reader.readAsText(file);
  }

  function clearAllEntries() {
    if (!confirm("Clear all saved entries? This cannot be undone.")) return;
    entries = [];
    saveEntries();
    renderEntries();
  }

  generateTemplateBtn.addEventListener("click", generateTemplate);
  copyBtn.addEventListener("click", copyCurrent);
  clearBtn.addEventListener("click", clearForm);
  saveBtn.addEventListener("click", upsertEntry);

  [nameInput, dateInput, titleInput, contentInput].forEach((el) => {
    el.addEventListener("input", updatePreview);
  });

  themeToggle.addEventListener("click", toggleTheme);
  settingsThemeToggle.addEventListener("click", toggleTheme);

  exportBtn.addEventListener("click", exportEntries);
  importInput.addEventListener("change", (e) => {
    importEntries(e.target.files[0]);
    e.target.value = "";
  });

  clearAllBtn.addEventListener("click", clearAllEntries);

  function init() {
    loadTheme();
    initDate();
    entries = loadEntries();
    renderEntries();
    updatePreview();
  }

  init();
})();
