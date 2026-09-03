(function () {
  const data = window.WA_DATA;
  const app = document.getElementById("app");
  const listEl = document.getElementById("chat-list");
  const msgsEl = document.getElementById("msgs");
  const headEl = document.getElementById("chat-head");
  const emptyEl = document.getElementById("empty");
  const threadEl = document.getElementById("thread");
  const searchEl = document.getElementById("search");
  const searchBox = document.getElementById("search-box");
  const searchClear = document.getElementById("search-clear");
  const modal = document.getElementById("modal");
  const noteBody = document.getElementById("note-body");
  const noteMeta = document.getElementById("note-meta");
  const drawer = document.getElementById("drawer");
  const drawerBody = document.getElementById("drawer-body");
  const findbar = document.getElementById("findbar");
  const findInput = document.getElementById("find-input");
  const findCount = document.getElementById("find-count");
  const jump = document.getElementById("jump");
  const ctx = document.getElementById("ctx");
  const sidebar = document.getElementById("sidebar");

  const PINNED = ["moraes", "faria", "vivi"];
  const UNREAD = { ciro: 2, ana: 1, palhares: 1 };
  const ARCHIVED = new Set();

  let filter = "all";
  let q = "";
  let currentId = null;
  let findQ = "";

  document.getElementById("rail-me").innerHTML = `<img src="${data.me.avatar}" alt="${data.me.name}" />`;
  document.getElementById("status-me-av").innerHTML = `<img src="${data.me.avatar}" alt="" />`;
  document.getElementById("set-av").innerHTML = `<img src="${data.me.avatar}" alt="" />`;
  document.getElementById("profile-photo").src = data.me.avatar;
  document.getElementById("profile-name").textContent = data.me.name;
  document.getElementById("set-name").textContent = data.me.name;

  function chatById(id) {
    return data.chats.find((c) => c.id === id);
  }

  function lastUseful(chat) {
    return [...chat.messages].reverse().find((x) => x.type !== "day" && x.type !== "system");
  }

  function lastDay(chat) {
    const d = [...chat.messages].reverse().find((x) => x.date);
    return d ? d.date : "";
  }

  function fmtDay(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const today = new Date();
    const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const diff = (start(today) - start(dt)) / 86400000;
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Ontem";
    if (diff < 7) return dt.toLocaleDateString("pt-BR", { weekday: "long" });
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function listTime(chat) {
    const m = lastUseful(chat);
    if (m && m.time && m.time !== "—") return m.time;
    return fmtDay(lastDay(chat));
  }

  function previewOf(m) {
    if (!m) return "";
    if (m.type === "note") return "Foto";
    if (m.type === "audio") return "Áudio";
    if (m.type === "doc") return m.name || "Documento";
    if (m.type === "deleted") return "Mensagem apagada";
    return (m.text || "").replace(/\s+/g, " ");
  }

  function avatarHTML(chat, size) {
    if (chat.avatar) return `<img src="${chat.avatar}" alt="" />`;
    return `<div class="ini" style="background:${chat.color || "#00a884"}">${chat.initials || "?"}</div>`;
  }

  function matchesFilter(chat) {
    if (ARCHIVED.has(chat.id)) return false;
    if (filter === "unread") return (UNREAD[chat.id] || 0) > 0;
    if (filter === "fav") return PINNED.includes(chat.id);
    if (filter === "groups") return false;
    return true;
  }

  function matchesQuery(chat) {
    if (!q) return true;
    const blob = (chat.name + " " + (chat.phone || "") + " " + previewOf(lastUseful(chat))).toLowerCase();
    if (blob.includes(q)) return true;
    return chat.messages.some((m) => (m.text || m.name || m.title || "").toLowerCase().includes(q));
  }

  function messageHits(chat) {
    if (!q) return [];
    return chat.messages.filter((m) => (m.text || m.name || m.title || "").toLowerCase().includes(q));
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlight(text) {
    const raw = escapeHtml(text);
    if (!findQ) return raw;
    const re = new RegExp(findQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    return raw.replace(re, (m) => `<span class="mark">${m}</span>`);
  }

  function renderList() {
    const visible = data.chats.filter((c) => matchesFilter(c) && matchesQuery(c));
    const pinned = visible.filter((c) => PINNED.includes(c.id) && !q);
    const rest = visible.filter((c) => !PINNED.includes(c.id) || q);

    let html = "";
    if (q) {
      html += `<div class="sec-label">Conversas</div>`;
      html += visible.map(rowHTML).join("") || `<p class="panel-empty">Nenhuma conversa encontrada</p>`;
      const hits = [];
      data.chats.forEach((c) => {
        messageHits(c).slice(0, 3).forEach((m) => hits.push({ chat: c, m }));
      });
      if (hits.length) {
        html += `<div class="sec-label">Mensagens</div>`;
        hits.forEach(({ chat, m }) => {
          html += `<div class="row" data-id="${chat.id}">
            <div class="av">${avatarHTML(chat)}</div>
            <div class="body">
              <div class="top"><div class="who">${escapeHtml(chat.name)}</div><div class="when">${m.time || ""}</div></div>
              <div class="bot"><div class="prev">${escapeHtml(previewOf(m))}</div></div>
            </div>
          </div>`;
        });
      }
    } else {
      if (filter === "groups") {
        html = `<p class="panel-empty">Não há grupos neste aparelho.</p>`;
      } else {
        if (pinned.length) {
          html += `<div class="sec-label">Fixadas</div>` + pinned.map(rowHTML).join("");
        }
        if (rest.length) {
          html += (pinned.length ? `<div class="sec-label">Todas</div>` : "") + rest.map(rowHTML).join("");
        }
        if (!visible.length) html = `<p class="panel-empty">Nenhuma conversa nesta aba.</p>`;
      }
    }
    listEl.innerHTML = html;
    listEl.querySelectorAll(".row[data-id]").forEach((el) => {
      el.addEventListener("click", () => openChat(el.getAttribute("data-id")));
      el.addEventListener("contextmenu", (e) => openCtx(e, el.getAttribute("data-id")));
    });
  }

  function rowHTML(chat) {
    const last = lastUseful(chat);
    const unread = UNREAD[chat.id] || 0;
    const out = last && last.dir === "out";
    const tick = out ? `<span class="tick">✓✓</span>` : "";
    return `<div class="row${chat.id === currentId ? " active" : ""}" data-id="${chat.id}">
      <div class="av">${avatarHTML(chat)}</div>
      <div class="body">
        <div class="top">
          <div class="who">${escapeHtml(chat.name)}</div>
          <div class="when${unread ? " unread" : ""}">${listTime(chat)}</div>
        </div>
        <div class="bot">
          <div class="prev">${tick}${escapeHtml(previewOf(last))}</div>
          <div>${unread ? `<span class="badge">${unread}</span>` : (PINNED.includes(chat.id) ? `<span class="pin">📌</span>` : "")}</div>
        </div>
      </div>
    </div>`;
  }

  function closeChat() {
    currentId = null;
    threadEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
    app.classList.remove("chat-open");
    drawer.classList.add("hidden");
    findbar.classList.add("hidden");
    history.replaceState(null, "", location.pathname);
    renderList();
  }

  function openChat(id) {
    const chat = chatById(id);
    if (!chat) return;
    currentId = id;
    delete UNREAD[id];
    emptyEl.classList.add("hidden");
    threadEl.classList.remove("hidden");
    app.classList.add("chat-open");
    drawer.classList.add("hidden");
    findbar.classList.add("hidden");
    findQ = "";
    history.replaceState(null, "", "#/" + id);

    headEl.innerHTML = `
      <button class="icon-btn back-chat" type="button" title="Voltar" id="btn-back">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <button class="hit" id="btn-info" type="button">
        ${avatarHTML(chat)}
        <div>
          <div class="nm">${escapeHtml(chat.name)}</div>
          <div class="ph">${escapeHtml(chat.phone || "clique para dados do contato")}</div>
        </div>
      </button>
      <div class="tools">
        <button class="icon-btn" type="button" title="Pesquisar" id="btn-find">
          <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        </button>
        <button class="icon-btn" type="button" title="Mais opções" id="btn-chat-menu">
          <svg viewBox="0 0 24 24"><path d="M12 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>
        </button>
      </div>`;
    headEl.querySelector("#btn-back").addEventListener("click", closeChat);
    headEl.querySelector("#btn-info").addEventListener("click", () => openDrawer(chat));
    headEl.querySelector("#btn-find").addEventListener("click", openFind);
    headEl.querySelector("#btn-chat-menu").addEventListener("click", (e) => {
      openCtx(e, id, [
        ["Dados do contato", () => openDrawer(chat)],
        ["Pesquisar", openFind],
        ["Fechar conversa", closeChat]
      ]);
    });

    renderMsgs(chat);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    renderList();
    switchPanel("chats");
  }

  function renderMsgs(chat) {
    let prevDir = null;
    msgsEl.innerHTML = chat.messages.map((m) => {
      const html = renderMsg(m, prevDir);
      if (m.dir) prevDir = m.dir;
      if (m.type === "day" || m.type === "system") prevDir = null;
      return html;
    }).join("");
    msgsEl.querySelectorAll("[data-note]").forEach((el) => {
      el.addEventListener("click", () => {
        noteMeta.textContent = decodeURIComponent(el.getAttribute("data-title") || "");
        noteBody.textContent = decodeURIComponent(el.getAttribute("data-text") || "");
        modal.classList.remove("hidden");
      });
    });
  }

  function wave() {
    let h = "";
    for (let i = 0; i < 36; i++) h += `<i style="height:${6 + ((i * 17) % 18)}px"></i>`;
    return h;
  }

  function renderMsg(m, prevDir) {
    if (m.type === "day") return `<div class="day"><span>${fmtDay(m.date)}</span></div>`;
    if (m.type === "system") return `<div class="sys"><span>🔒 ${escapeHtml(m.text)}</span></div>`;
    const side = m.dir === "out" ? "out" : "in";
    const grouped = prevDir === m.dir ? " group" : "";
    const ticks = m.dir === "out" ? `<span class="ticks">✓✓</span>` : "";
    const time = `<span class="meta"><span>${m.time && m.time !== "—" ? m.time : ""}</span>${ticks}</span>`;
    if (m.type === "deleted") {
      return `<div class="bubble-row ${side}${grouped}"><div class="bubble deleted">🚫 ${escapeHtml(m.text)}${time}</div></div>`;
    }
    if (m.type === "note") {
      return `<div class="bubble-row ${side}${grouped}">
        <div class="bubble note-card" data-note="1" data-title="${encodeURIComponent(m.title || "")}" data-text="${encodeURIComponent(m.text || "")}">
          <div class="shot"><div class="cam">📷</div><div><b>Visualização única</b><small>Toque para abrir</small></div></div>
          <div class="cap">${escapeHtml(m.title || "Foto")}</div>${time}
        </div></div>`;
    }
    if (m.type === "audio") {
      return `<div class="bubble-row ${side}${grouped}"><div class="bubble">
        <div class="audio"><div class="play">▶</div><div class="wave">${wave()}</div><span>${m.duration || ""}</span></div>
        <div class="audio-tr">${highlight(m.transcript)}</div>${time}
      </div></div>`;
    }
    if (m.type === "doc") {
      return `<div class="bubble-row ${side}${grouped}"><div class="bubble">
        <div class="doc"><div class="ico">📄</div><div><b>${escapeHtml(m.name)}</b><div class="prev">${escapeHtml(m.sub || "")}</div></div></div>${time}
      </div></div>`;
    }
    return `<div class="bubble-row ${side}${grouped}"><div class="bubble">${highlight(m.text)}${time}</div></div>`;
  }

  function openDrawer(chat) {
    drawer.classList.remove("hidden");
    drawerBody.innerHTML = `
      <div class="d-hero">
        ${avatarHTML(chat)}
        <div class="nm">${escapeHtml(chat.name)}</div>
        <div class="prev">${escapeHtml(chat.phone || "sem número na extração")}</div>
      </div>
      <div class="d-block"><small>Recado</small>contato da agenda do iPhone apreendido</div>
      <div class="d-block"><small>Criptografia</small>As mensagens e as ligações são protegidas com a criptografia de ponta a ponta. Apenas as pessoas que fazem parte da conversa podem ler, ouvir ou compartilhar.</div>
      <div class="d-block"><small>Origem na IPJ-A</small>Nome como salvo no aparelho de Daniel Vorcaro. Reconstrução do relatório 3298613/2026.</div>
      <div class="d-danger">Bloquear ${escapeHtml(chat.name.split(" ")[0])}</div>`;
  }

  function closeDrawer() { drawer.classList.add("hidden"); }

  function openFind() {
    findbar.classList.remove("hidden");
    findInput.value = "";
    findInput.focus();
  }

  function applyFind() {
    findQ = findInput.value.trim();
    const chat = chatById(currentId);
    if (!chat) return;
    renderMsgs(chat);
    const n = findQ ? msgsEl.querySelectorAll(".mark").length : 0;
    findCount.textContent = findQ ? n + " resultado(s)" : "";
  }

  function switchPanel(name) {
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.getAttribute("data-panel") === name));
    document.querySelectorAll(".rail-btn, .rail-me").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-panel") === name);
    });
    if (name === "starred") renderStarred();
  }

  function renderStarred() {
    const items = [];
    data.chats.forEach((c) => {
      c.messages.filter((m) => m.type === "note" && m.dir === "out").slice(0, 1).forEach((m) => items.push({ c, m }));
    });
    document.getElementById("starred-list").innerHTML = items.map(({ c, m }) =>
      `<div class="row" data-id="${c.id}">
        <div class="av">${avatarHTML(c)}</div>
        <div class="body">
          <div class="top"><div class="who">${escapeHtml(c.name)}</div><div class="when">${m.time || ""}</div></div>
          <div class="bot"><div class="prev">${escapeHtml(previewOf(m))}</div></div>
        </div>
      </div>`
    ).join("") || `<p class="panel-empty">Nenhuma mensagem favorita.</p>`;
    document.getElementById("starred-list").querySelectorAll(".row").forEach((el) => {
      el.addEventListener("click", () => openChat(el.getAttribute("data-id")));
    });
  }

  function openCtx(e, id, items) {
    e.preventDefault();
    e.stopPropagation();
    const list = items || [
      ["Fixar conversa", () => {}],
      ["Marcar como não lida", () => { UNREAD[id] = (UNREAD[id] || 0) + 1; renderList(); }],
      ["Arquivar conversa", () => { ARCHIVED.add(id); if (currentId === id) closeChat(); renderList(); }],
      ["Fechar conversa", () => { if (currentId === id) closeChat(); }]
    ];
    ctx.innerHTML = list.map((it, i) => `<button data-i="${i}">${it[0]}</button>`).join("");
    ctx.classList.remove("hidden");
    const x = Math.min(e.clientX, window.innerWidth - 230);
    const y = Math.min(e.clientY, window.innerHeight - 160);
    ctx.style.left = x + "px";
    ctx.style.top = y + "px";
    ctx.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        list[Number(b.getAttribute("data-i"))][1]();
        ctx.classList.add("hidden");
      });
    });
  }

  function popLayer() {
    if (!modal.classList.contains("hidden")) { modal.classList.add("hidden"); return; }
    if (!ctx.classList.contains("hidden")) { ctx.classList.add("hidden"); return; }
    if (!findbar.classList.contains("hidden")) { findbar.classList.add("hidden"); findQ = ""; if (currentId) renderMsgs(chatById(currentId)); return; }
    if (!drawer.classList.contains("hidden")) { closeDrawer(); return; }
    if (searchBox.classList.contains("focus")) { searchEl.value = ""; q = ""; searchBox.classList.remove("focus"); searchClear.classList.add("hidden"); renderList(); return; }
    if (currentId) closeChat();
  }

  searchEl.addEventListener("focus", () => searchBox.classList.add("focus"));
  searchEl.addEventListener("input", () => {
    q = searchEl.value.trim().toLowerCase();
    searchClear.classList.toggle("hidden", !q);
    renderList();
  });
  searchClear.addEventListener("click", () => {
    searchEl.value = ""; q = ""; searchClear.classList.add("hidden"); renderList(); searchEl.focus();
  });
  searchBox.querySelector(".ico-back").addEventListener("click", () => {
    searchEl.value = ""; q = ""; searchBox.classList.remove("focus"); searchClear.classList.add("hidden"); renderList();
  });

  document.getElementById("filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.getAttribute("data-filter");
    renderList();
  });

  document.querySelectorAll("[data-panel]").forEach((el) => {
    if (el.classList.contains("chip")) return;
    el.addEventListener("click", () => switchPanel(el.getAttribute("data-panel")));
  });

  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  document.getElementById("find-close").addEventListener("click", () => {
    findbar.classList.add("hidden"); findQ = ""; if (currentId) renderMsgs(chatById(currentId));
  });
  findInput.addEventListener("input", applyFind);
  document.getElementById("modal-close").addEventListener("click", () => modal.classList.add("hidden"));
  document.getElementById("modal-x").addEventListener("click", () => modal.classList.add("hidden"));
  document.addEventListener("click", () => ctx.classList.add("hidden"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); popLayer(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchEl.focus(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && currentId) { e.preventDefault(); openFind(); return; }
    if (e.ctrlKey && e.shiftKey && (e.key === "]" || e.key === "[")) {
      e.preventDefault();
      const vis = data.chats.filter((c) => matchesFilter(c) && !ARCHIVED.has(c.id));
      if (!vis.length) return;
      let i = vis.findIndex((c) => c.id === currentId);
      i = e.key === "]" ? (i + 1) % vis.length : (i - 1 + vis.length) % vis.length;
      openChat(vis[i].id);
    }
  });

  msgsEl.addEventListener("scroll", () => {
    const near = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 80;
    jump.classList.toggle("hidden", near);
  });
  jump.addEventListener("click", () => { msgsEl.scrollTop = msgsEl.scrollHeight; });

  let dragging = false;
  document.getElementById("split").addEventListener("mousedown", () => { dragging = true; document.getElementById("split").classList.add("drag"); });
  window.addEventListener("mouseup", () => { dragging = false; document.getElementById("split").classList.remove("drag"); });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const w = e.clientX - 59;
    sidebar.style.width = Math.max(280, Math.min(520, w)) + "px";
  });

  window.addEventListener("hashchange", () => {
    const id = location.hash.replace(/^#\/?/, "");
    if (id && chatById(id)) openChat(id);
    else closeChat();
  });

  renderList();
  const initial = location.hash.replace(/^#\/?/, "");
  if (initial && chatById(initial)) openChat(initial);
})();
