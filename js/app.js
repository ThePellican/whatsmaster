(function () {
  const data = window.WA_DATA;
  const listEl = document.getElementById("chat-list");
  const msgsEl = document.getElementById("msgs");
  const headEl = document.getElementById("chat-head");
  const emptyEl = document.getElementById("empty");
  const threadEl = document.getElementById("thread");
  const searchEl = document.getElementById("search");
  const modal = document.getElementById("modal");
  const noteBody = document.getElementById("note-body");
  const noteMeta = document.getElementById("note-meta");
  const railMe = document.getElementById("rail-me");

  let filter = "all";
  let q = "";
  let currentId = null;

  railMe.innerHTML = `<img src="${data.me.avatar}" alt="${data.me.name}" />`;

  function lastMsg(chat) {
    const m = [...chat.messages].reverse().find((x) => x.type !== "day" && x.type !== "system");
    if (!m) return { preview: "", time: "" };
    let preview = m.text || m.name || m.title || "";
    if (m.type === "note") preview = "📷 " + (m.title || "Foto");
    if (m.type === "audio") preview = "🎤 Áudio";
    if (m.type === "doc") preview = "📄 " + (m.name || "Documento");
    if (m.type === "deleted") preview = "🚫 Mensagem apagada";
    return { preview, time: m.time && m.time !== "—" ? m.time : fmtDay(m.date || lastDay(chat)) };
  }

  function lastDay(chat) {
    const d = [...chat.messages].reverse().find((x) => x.date);
    return d ? d.date : "";
  }

  function fmtDay(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  }

  function avatarHTML(chat, cls) {
    if (chat.avatar) return `<img class="${cls || ""}" src="${chat.avatar}" alt="" />`;
    const bg = chat.color || "#00a884";
    return `<div class="ini" style="background:${bg}">${chat.initials || "?"}</div>`;
  }

  function matches(chat) {
    if (filter !== "all" && !(chat.tags || []).includes(filter)) return false;
    if (!q) return true;
    const blob = (chat.name + " " + chat.phone + " " + JSON.stringify(chat.messages)).toLowerCase();
    return blob.includes(q);
  }

  function renderList() {
    listEl.innerHTML = "";
    data.chats.filter(matches).forEach((chat) => {
      const last = lastMsg(chat);
      const row = document.createElement("div");
      row.className = "row" + (chat.id === currentId ? " active" : "");
      row.innerHTML = `
        ${avatarHTML(chat)}
        <div>
          <div class="who">${chat.name}</div>
          <div class="prev">${escapeHtml(last.preview)}</div>
        </div>
        <div class="when">${last.time}</div>`;
      row.addEventListener("click", () => openChat(chat.id));
      listEl.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function openChat(id) {
    currentId = id;
    const chat = data.chats.find((c) => c.id === id);
    emptyEl.classList.add("hidden");
    threadEl.classList.remove("hidden");
    document.querySelector(".app").classList.add("chat-open");
    headEl.innerHTML = `
      ${avatarHTML(chat)}
      <div>
        <div class="nm">${chat.name}</div>
        <div class="ph">${chat.phone || "contato da agenda de Vorcaro"}</div>
      </div>`;
    msgsEl.innerHTML = chat.messages.map(renderMsg).join("");
    msgsEl.querySelectorAll("[data-note]").forEach((el) => {
      el.addEventListener("click", () => {
        noteMeta.textContent = decodeURIComponent(el.getAttribute("data-title") || "");
        noteBody.textContent = decodeURIComponent(el.getAttribute("data-text") || "");
        modal.classList.remove("hidden");
      });
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
    renderList();
  }

  function wave() {
    let h = "";
    for (let i = 0; i < 36; i++) {
      const n = 6 + ((i * 17) % 18);
      h += `<i style="height:${n}px"></i>`;
    }
    return h;
  }

  function renderMsg(m) {
    if (m.type === "day") {
      return `<div class="day"><span>${fmtDay(m.date)}</span></div>`;
    }
    if (m.type === "system") {
      return `<div class="sys"><span>🔒 ${escapeHtml(m.text)}</span></div>`;
    }
    const side = m.dir === "out" ? "out" : "in";
    const ticks = m.dir === "out" ? `<span class="ticks">✓✓</span>` : "";
    const time = `<div class="meta"><span>${m.time || ""}</span>${ticks}</div>`;
    if (m.type === "deleted") {
      return `<div class="bubble-row ${side}"><div class="bubble deleted">🚫 ${escapeHtml(m.text)}${time}</div></div>`;
    }
    if (m.type === "note") {
      return `<div class="bubble-row ${side}">
        <div class="bubble note-card" data-note="1" data-title="${encodeURIComponent(m.title || "")}" data-text="${encodeURIComponent(m.text || "")}">
          <div class="shot">
            <div class="cam">📷</div>
            <div><b>Visualização única</b><small>Toque para abrir a nota recuperada pela PF</small></div>
          </div>
          <div class="cap">${escapeHtml(m.title || "Foto")}</div>
          ${time}
        </div>
      </div>`;
    }
    if (m.type === "audio") {
      return `<div class="bubble-row ${side}"><div class="bubble">
        <div class="audio"><div class="play">▶</div><div class="wave">${wave()}</div><span>${m.duration || ""}</span></div>
        <div class="audio-tr">${escapeHtml(m.transcript)}</div>
        ${time}
      </div></div>`;
    }
    if (m.type === "doc") {
      return `<div class="bubble-row ${side}"><div class="bubble">
        <div class="doc"><div class="ico">📄</div><div><b>${escapeHtml(m.name)}</b><div class="prev">${escapeHtml(m.sub || "")}</div></div></div>
        ${time}
      </div></div>`;
    }
    return `<div class="bubble-row ${side}"><div class="bubble">${escapeHtml(m.text)}${time}</div></div>`;
  }

  searchEl.addEventListener("input", () => {
    q = searchEl.value.trim().toLowerCase();
    renderList();
  });
  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filter = btn.getAttribute("data-filter");
      renderList();
    });
  });
  function closeModal() { modal.classList.add("hidden"); }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-x").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  renderList();
  openChat("moraes");
})();
