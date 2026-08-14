(function () {
  const TIPOS = ["Troca de Equipamento", "Manutenção", "Novo Colaborador", "Outro"];
  const DEBOUNCE_MS = 500;

  const tableBody = document.getElementById("tableBody");
  const emptyState = document.getElementById("emptyState");
  const paginationEl = document.getElementById("pagination");
  const searchInput = document.getElementById("searchInput");
  const fieldFilter = document.getElementById("fieldFilter");
  const dateFromInput = document.getElementById("dateFrom");
  const dateToInput = document.getElementById("dateTo");
  const clearDateFilterBtn = document.getElementById("clearDateFilter");
  const addBtn = document.getElementById("addBtn");
  const exportBtn = document.getElementById("exportBtn");
  const statPendentes = document.getElementById("statPendentes");
  const totalCount = document.getElementById("totalCount");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const syncStatusEl = document.getElementById("syncStatus");
  const syncStatusText = document.getElementById("syncStatusText");

  const PAGE_SIZE = 10;
  let state = { filter: "todos", field: "todos", search: "", dateFrom: "", dateTo: "", page: 1 };
  let chamados = [];
  const pendingTimers = {}; // debounce por linha+campo

  // ---------- Checagem de configuração ----------
  if (
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_ANON_KEY === "undefined" ||
    SUPABASE_URL.includes("COLE_AQUI") ||
    SUPABASE_ANON_KEY.includes("COLE_AQUI")
  ) {
    setSyncStatus("error", "config.js não configurado");
    addBtn.disabled = true;
    emptyState.hidden = false;
    emptyState.querySelector("h3").textContent = "Banco de dados não configurado";
    emptyState.querySelector("p").textContent =
      "Edite o arquivo config.js com a URL e a chave anônima do seu projeto Supabase.";
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ---------- Status de sincronização ----------
  function setSyncStatus(stateName, label) {
    syncStatusEl.dataset.state = stateName;
    syncStatusText.textContent = label;
  }

  // ---------- Carregar dados ----------
  async function loadChamados() {
    setSyncStatus("connecting", "Carregando chamados...");
    const { data, error } = await supabase
      .from("chamados")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar chamados:", error);
      setSyncStatus("error", "Erro ao conectar ao banco");
      return;
    }

    chamados = data.map(fromDb);
    setSyncStatus("online", "Sincronizado");
    render();
  }

  function fromDb(row) {
    return {
      id: row.id,
      numero: row.numero || "",
      solicitante: row.solicitante || "",
      tipo: row.tipo || TIPOS[0],
      pa: row.pa || "",
      obs: row.observacoes || "",
      status: row.status || "pendente",
      createdAt: row.created_at,
    };
  }

  // ---------- Realtime: reflete edições de outras pessoas ----------
  supabase
    .channel("chamados-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "chamados" }, (payload) => {
      if (payload.eventType === "INSERT") {
        if (!chamados.find((c) => c.id === payload.new.id)) {
          chamados.unshift(fromDb(payload.new));
        }
      } else if (payload.eventType === "UPDATE") {
        const idx = chamados.findIndex((c) => c.id === payload.new.id);
        if (idx !== -1) {
          const incoming = fromDb(payload.new);
          // se estou editando algum campo desta linha agora, preserva o valor
          // que já está no meu estado local (evita "voltar" o que acabei de digitar)
          const activeEl = document.activeElement;
          const activeRow = activeEl && activeEl.closest("tr");
          if (activeRow && activeRow.dataset.id === payload.new.id && activeEl.dataset.field) {
            incoming[activeEl.dataset.field] = chamados[idx][activeEl.dataset.field];
          }
          chamados[idx] = incoming;
        }
      } else if (payload.eventType === "DELETE") {
        chamados = chamados.filter((c) => c.id !== payload.old.id);
      }
      render();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setSyncStatus("online", "Sincronizado");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setSyncStatus("error", "Conexão instável");
    });

  window.addEventListener("offline", () => setSyncStatus("error", "Sem conexão"));
  window.addEventListener("online", () => setSyncStatus("online", "Sincronizado"));

  // ---------- Render (incremental — nunca recria uma linha já existente) ----------
  const FIELDS = ["numero", "solicitante", "tipo", "pa", "obs", "status"];

  function render() {
    const term = state.search.trim().toLowerCase();

    const visiveis = chamados.filter((c) => {
      if (state.filter !== "todos" && c.status !== state.filter) return false;
      const chamadoDate = toLocalDateKey(c.createdAt);
      if (state.dateFrom && chamadoDate < state.dateFrom) return false;
      if (state.dateTo && chamadoDate > state.dateTo) return false;
      if (!term) return true;
      const valoresBusca = {
        numero: c.numero,
        solicitante: c.solicitante,
        tipo: c.tipo,
        pa: c.pa,
        obs: c.obs,
        status: c.status === "pendente" ? "Pendente" : "Resolvido",
      };
      const blob = state.field === "todos"
        ? Object.values(valoresBusca).join(" ").toLowerCase()
        : (valoresBusca[state.field] || "").toLowerCase();
      return blob.includes(term);
    });

    const totalPages = Math.max(1, Math.ceil(visiveis.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    const pageItems = visiveis.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    emptyState.hidden = pageItems.length !== 0;

    // mapa das linhas que já existem no DOM
    const existing = {};
    Array.from(tableBody.children).forEach((tr) => {
      existing[tr.dataset.id] = tr;
    });

    const wantedIds = new Set(pageItems.map((c) => c.id));

    // remove linhas que não devem mais aparecer (excluídas ou fora do filtro/busca)
    Object.keys(existing).forEach((id) => {
      if (!wantedIds.has(id)) {
        existing[id].remove();
        delete existing[id];
      }
    });

    // Enquanto qualquer campo estiver ativo, preserva toda a ordem do DOM.
    // Reordenar as outras linhas durante um clique pode mover o alvo e
    // deixar o foco preso no registro anterior.
    const tabelaEmEdicao = tableBody.contains(document.activeElement);

    // cria ou atualiza cada linha, na ordem correta
    pageItems.forEach((c) => {
      let tr = existing[c.id];

      if (!tr) {
        tr = renderRow(c);
        tableBody.appendChild(tr);
        return;
      }

      updateRowFields(tr, c);

      if (!tabelaEmEdicao) {
        tableBody.appendChild(tr);
      }
    });

    const pendentesCount = chamados.filter((c) => c.status === "pendente").length;
    statPendentes.textContent = pendentesCount;
    totalCount.textContent = `${chamados.length} chamado${chamados.length === 1 ? "" : "s"} no total`;
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }

    paginationEl.innerHTML = `
      <button class="page-btn" data-action="prev" ${state.page <= 1 ? "disabled" : ""}>Anterior</button>
      <span class="page-info">Página ${state.page} de ${totalPages}</span>
      <button class="page-btn" data-action="next" ${state.page >= totalPages ? "disabled" : ""}>Próxima</button>
    `;

    paginationEl.querySelector('[data-action="prev"]').addEventListener("click", () => {
      if (state.page <= 1) return;
      state.page -= 1;
      render();
    });

    paginationEl.querySelector('[data-action="next"]').addEventListener("click", () => {
      if (state.page >= totalPages) return;
      state.page += 1;
      render();
    });
  }

  // Atualiza os valores de uma linha existente sem recriar os elementos,
  // e nunca sobrescreve o campo que o usuário está editando neste instante.
  function updateRowFields(tr, c) {
    tr.classList.toggle("is-resolved", c.status === "resolvido");
    FIELDS.forEach((field) => {
      const el = tr.querySelector(`[data-field="${field}"]`);
      if (!el || document.activeElement === el) return;
      if (el.value !== c[field]) el.value = c[field];
    });
  }

  function renderRow(c) {
    const tr = document.createElement("tr");
    tr.dataset.id = c.id;
    if (c.status === "resolvido") tr.classList.add("is-resolved");

    tr.innerHTML = `
      <td class="col-id" data-label="Nº Chamado">
        <input class="cell-input" data-field="numero" value="${escapeAttr(c.numero)}" placeholder="0000" maxlength="40" />
      </td>
      <td data-label="Solicitado por">
        <input class="cell-input" data-field="solicitante" value="${escapeAttr(c.solicitante)}" placeholder="Nome" maxlength="120" />
      </td>
      <td data-label="Tipo de chamado">
        <select class="cell-input" data-field="tipo">
          ${TIPOS.map((t) => `<option value="${t}" ${t === c.tipo ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </td>
      <td class="col-pa" data-label="Nº da PA">
        <input class="cell-input" data-field="pa" value="${escapeAttr(c.pa)}" placeholder="PA-0000" maxlength="40" />
      </td>
      <td class="col-date" data-label="Data">${formatDate(c.createdAt)}</td>
      <td data-label="Observações">
        <textarea class="cell-input" data-field="obs" rows="1" placeholder="Observações...">${escapeHtml(c.obs)}</textarea>
      </td>
      <td data-label="Status">
        <select class="cell-input status-select" data-field="status">
          <option value="pendente" ${c.status === "pendente" ? "selected" : ""}>Pendente</option>
          <option value="resolvido" ${c.status === "resolvido" ? "selected" : ""}>Resolvido</option>
        </select>
      </td>
      <td class="col-actions">
        <button class="icon-btn" data-action="delete" title="Excluir chamado" aria-label="Excluir chamado">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    `;

    tr.querySelectorAll("[data-field]").forEach((input) => {
      const field = input.dataset.field;
      const isSelect = input.tagName === "SELECT";

      input.addEventListener("input", () => {
        const chamado = chamados.find((x) => x.id === c.id);
        chamado[field] = input.value;
        if (field === "status") tr.classList.toggle("is-resolved", input.value === "resolvido");
        // Numero e PA so sao gravados depois da verificacao de duplicidade.
        if (field !== "numero" && field !== "pa") queueUpdate(c.id, field, input.value);
      });

      // "Solicitado por": se colar no formato "Sobrenome, Nome" (comum em
      // sistemas de RH/AD), corrige sozinho para "Nome Sobrenome".
      if (field === "solicitante") {
        input.addEventListener("paste", (e) => {
          const texto = (e.clipboardData || window.clipboardData).getData("text");
          if (texto.includes(",")) {
            e.preventDefault();
            input.value = corrigirNomeInvertido(texto);
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
          // sem vírgula: deixa o comportamento padrão de colar acontecer
        });
      }

      // selects gravam na hora; texto grava com debounce (evita 1 request por tecla)
      if (isSelect) {
        input.addEventListener("change", () => flushUpdate(c.id, field));
      } else {
        input.addEventListener("blur", async () => {
          if (field === "numero" || field === "pa") {
            const duplicado = await verificarChamadoDuplicado(c.id, field, input.value);

            if (duplicado) {
              const identificador = field === "numero" ? "número de chamado" : "PA";
              alert(
                `⚠ Chamado duplicado!\n\nJá existe um chamado para este ${identificador}.\n\n` +
                `Chamado: ${duplicado.numero || "(sem número)"}\n` +
                `PA: ${duplicado.pa || "(sem PA)"}\n` +
                `Solicitante: ${duplicado.solicitante || "(não informado)"}\n` +
                `Status: ${duplicado.status === "pendente" ? "Pendente" : "Resolvido"}`
              );

              // Remove somente o valor duplicado. O banco preserva o valor
              // anterior ate que um novo identificador valido seja informado.
              const chamadoAtual = chamados.find((item) => item.id === c.id);
              input.value = "";
              if (chamadoAtual) chamadoAtual[field] = "";

              // Aguarda o blur terminar para evitar um ciclo de foco/alerta.
              setTimeout(() => input.focus(), 0);
              return;
            }
          }

          flushUpdate(c.id, field);
        });
      }
    });

    tr.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm(`Excluir o chamado ${c.numero || "sem número"}?`)) return;
      chamados = chamados.filter((x) => x.id !== c.id);
      render();
      const { error } = await supabase.from("chamados").delete().eq("id", c.id);
      if (error) {
        console.error("Erro ao excluir:", error);
        setSyncStatus("error", "Falha ao excluir - recarregue a página");
      }
    });

    return tr;
  }

  async function verificarChamadoDuplicado(idAtual, field, value) {
    const valor = value.trim();
    if (!valor) return null;

    const duplicadoLocal = chamados.find((item) =>
      item.id !== idAtual &&
      (item[field] || "").trim().toLowerCase() === valor.toLowerCase() &&
      (field !== "pa" || item.status === "pendente")
    );
    if (duplicadoLocal) return duplicadoLocal;

    let query = supabase
      .from("chamados")
      .select("id, numero, pa, solicitante, status")
      .eq(field, valor)
      .neq("id", idAtual);

    if (field === "pa") query = query.eq("status", "pendente");

    const { data, error } = await query.limit(1);
    if (error) {
      console.error("Erro ao verificar duplicidade:", error);
      setSyncStatus("error", "Falha ao verificar duplicidade");
      return null;
    }

    return data[0] || null;
  }

  // ---------- Gravação com debounce ----------
  const dbFieldMap = { obs: "observacoes" };

  function queueUpdate(id, field, value) {
    const key = `${id}:${field}`;
    clearTimeout(pendingTimers[key]);
    pendingTimers[key] = setTimeout(() => flushUpdate(id, field), DEBOUNCE_MS);
  }

  async function flushUpdate(id, field) {
    const key = `${id}:${field}`;
    clearTimeout(pendingTimers[key]);
    delete pendingTimers[key];

    const chamado = chamados.find((x) => x.id === id);
    if (!chamado) return;

    const dbField = dbFieldMap[field] || field;
    setSyncStatus("connecting", "Salvando...");
    const { error } = await supabase
      .from("chamados")
      .update({ [dbField]: chamado[field] })
      .eq("id", id);

    if (error) {
      console.error("Erro ao salvar:", error);
      setSyncStatus("error", "Falha ao salvar - verifique a conexão");
    } else {
      setSyncStatus("online", "Sincronizado");
    }
  }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  }

  // Corrige nomes colados no formato "Sobrenome(s), Nome" -> "Nome Sobrenome(s)".
  // Ex: "Richelle Silva Braga, Priscilla" -> "Priscilla Richelle Silva Braga"
  function corrigirNomeInvertido(texto) {
    const partes = texto.split(",");
    if (partes.length !== 2) return texto.trim().replace(/\s+/g, " ");
    const sobrenome = partes[0].trim();
    const nome = partes[1].trim();
    if (!sobrenome || !nome) return texto.trim().replace(/\s+/g, " ");
    return `${nome} ${sobrenome}`.replace(/\s+/g, " ").trim();
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  function toLocalDateKey(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  // ---------- Ações ----------
  addBtn.addEventListener("click", async () => {
    setSyncStatus("connecting", "Criando chamado...");
    const { data, error } = await supabase
      .from("chamados")
      .insert({ numero: "", solicitante: "", tipo: TIPOS[0], pa: "", observacoes: "", status: "pendente" })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar chamado:", error);
      setSyncStatus("error", "Falha ao criar chamado");
      return;
    }

    if (!chamados.find((c) => c.id === data.id)) chamados.unshift(fromDb(data));
    state.filter = "todos";
    filterBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.filter === "todos"));
    setSyncStatus("online", "Sincronizado");
    render();
    const firstInput = tableBody.querySelector('input[data-field="numero"]');
    if (firstInput) firstInput.focus();
  });

  searchInput.addEventListener("input", (e) => {
    state.search = e.target.value;
    state.page = 1;
    render();
  });

  fieldFilter.addEventListener("change", (e) => {
    state.field = e.target.value;
    state.page = 1;
    const label = e.target.options[e.target.selectedIndex].text;
    searchInput.placeholder = state.field === "todos" ? "Buscar por chamado, solicitante, PA..." : `Buscar em ${label}...`;
    render();
  });

  function applyDateFilter() {
    state.dateFrom = dateFromInput.value;
    state.dateTo = dateToInput.value;
    state.page = 1;
    clearDateFilterBtn.hidden = !state.dateFrom && !state.dateTo;
    render();
  }

  dateFromInput.addEventListener("change", applyDateFilter);
  dateToInput.addEventListener("change", applyDateFilter);
  clearDateFilterBtn.addEventListener("click", () => {
    dateFromInput.value = "";
    dateToInput.value = "";
    applyDateFilter();
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.filter = btn.dataset.filter;
      state.page = 1;
      render();
    });
  });

  exportBtn.addEventListener("click", () => {
    const header = ["Numero do Chamado", "Solicitado por", "Tipo de Chamado", "Numero da PA", "Data", "Observacoes", "Status"];
    const rows = chamados.map((c) => [c.numero, c.solicitante, c.tipo, c.pa, formatDate(c.createdAt), c.obs, c.status === "pendente" ? "Pendente" : "Resolvido"]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => {
        let safeCell = (cell || "").toString();
        // Impede que planilhas executem o conteudo exportado como formula.
        if (/^[=+\-@]/.test(safeCell)) safeCell = `'${safeCell}`;
        return `"${safeCell.replace(/"/g, '""')}"`;
      }).join(";"))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backlog_chamados_headset.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  loadChamados();
})();
