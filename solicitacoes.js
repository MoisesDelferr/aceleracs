let supabaseClient = null;
let todasSolicitacoes = [];
let solicitacaoAtual = null;
let usuarioLogado = '';

// ---- Estado da nova experiência (somente interface) ----
let visaoAtual = 'kanban';
let filaAlertas = [];
let alertaAberto = false;
let timerAlertas = null;
let ultimoDiaAlertaCancelamento = '';
let itemArrastadoId = null;

// ============================================================
// CONFIGURAÇÃO DAS COLUNAS / STATUS
// "valor" é o que fica gravado no banco (não muda).
// "label" é só o texto exibido na tela.
// Concluída movida para a última posição.
// ============================================================
const STATUS_CONFIG = [
  {
    valor: 'Pendente',
    label: 'Aguardando retorno e-mail',
    classe: 'status-pendente',
    tom: '',
    cor: '#6b7280',
  },
  {
    valor: 'Em Andamento',
    label: 'Em Andamento',
    classe: 'status-andamento',
    tom: '',
    cor: '#059669',
  },
  {
    valor: 'Análise Interna',
    label: 'Análise Interna',
    classe: 'status-analise',
    tom: '',
    cor: '#2563eb',
  },
  {
    valor: 'Sem Retorno 1° Dia',
    label: 'Sem Retorno 1° Dia',
    classe: 'status-semretorno1',
    tom: 'semretorno1',
    cor: '#f59e0b',
  },
  {
    valor: 'Sem Retorno 2° Dia',
    label: 'Sem Retorno 2° Dia',
    classe: 'status-semretorno2',
    tom: 'semretorno2',
    cor: '#ea580c',
  },
  {
    valor: 'Atenção',
    label: 'Sem Retorno 3° Dia',
    classe: 'status-atencao',
    tom: 'atencao',
    cor: '#dc2626',
  },
  {
    valor: 'Concluída',
    label: 'Concluídas',
    classe: 'status-concluido',
    tom: '',
    cor: '#9ca3af',
  },
];

const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

function getStatusConfig(status) {
  return (
    STATUS_CONFIG.find((c) => c.valor === status) ||
    STATUS_CONFIG[0] /* desconhecido/vazio = Aguardando retorno e-mail */
  );
}

function getStatusLabel(status) {
  return getStatusConfig(status).label.replace(/^Concluídas$/, 'Concluída');
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
  try {
    if (typeof _supabase !== 'undefined') {
      supabaseClient = _supabase;
    } else if (
      typeof supabase !== 'undefined' &&
      typeof supabase.createClient === 'function'
    ) {
      const SUPABASE_URL = 'https://pgsjhesbgqcqilkxfzed.supabase.co';
      const SUPABASE_ANON_KEY =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnc2poZXNiZ3FjcWlsa3hmemVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjkwMjQsImV4cCI6MjEwMDc0NTAyNH0.YmZ41BDMU_cafyTOInh-R4aSotvXnnWXCuPqorsfxqg';
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      throw new Error('Supabase não encontrado');
    }

    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    usuarioLogado =
      session.user.user_metadata?.name ||
      session.user.email?.split('@')[0] ||
      'Usuário';

    configurarEventListeners();
    gerarProtocolo();
    await carregarSolicitacoes();

    // Alertas ao abrir a página + repetição a cada hora
    verificarTodosAlertas(true);
    iniciarAlertaPorHora();
  } catch (err) {
    console.error('Erro na inicialização:', err);
    mostrarToast('Erro ao inicializar: ' + err.message, 'error');
  }
});

// ============================================================
// CONFIGURAÇÃO DE EVENTOS
// ============================================================
function getDataHoraBrasilia() {
  const now = new Date();
  // Ajusta para UTC-3 (Brasília)
  const offsetBrasilia = -3 * 60; // -3 horas em minutos
  const localOffset = now.getTimezoneOffset();
  const diff = offsetBrasilia + localOffset;
  return new Date(now.getTime() + diff * 60000);
}
function configurarEventListeners() {
  document
    .getElementById('btnNovaSolicitacao')
    .addEventListener('click', () => {
      gerarProtocolo();
      abrirModalFormulario();
    });

  document
    .getElementById('solicitacaoForm')
    .addEventListener('submit', salvarSolicitacao);

  document
    .getElementById('tipoSolicitacao')
    .addEventListener('change', atualizarCampoEfetivacao);

  document
    .getElementById('filterStatus')
    .addEventListener('change', aplicarFiltros);
  document
    .getElementById('filterTipo')
    .addEventListener('change', aplicarFiltros);
  document
    .getElementById('filterSearch')
    .addEventListener('input', aplicarFiltros);
  document
    .getElementById('btnLimparFiltros')
    .addEventListener('click', limparFiltros);
}

// ============================================================
// GERAR PROTOCOLO AUTOMÁTICO
// ============================================================
function gerarProtocolo() {
  const data = getDataHoraBrasilia();
  const ano = data.getFullYear().toString().slice(-2);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const protocolo = `${ano}${mes}${dia}-${random}`;
  document.getElementById('protocolo').value = protocolo;

  // Preenche a data com horário de Brasília
  const dataBrasilia = getDataHoraBrasilia();
  document.getElementById('dataPedido').value = formatarParaInput(dataBrasilia);
}

// ============================================================
// CRUD COM SUPABASE
// ============================================================
async function carregarSolicitacoes() {
  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
      .from('solicitacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    todasSolicitacoes = data || [];

    todasSolicitacoes.forEach((sol) => {
      if (!sol.andamentos) {
        sol.andamentos = [];
      }
    });

    classificarStatus(todasSolicitacoes);
    aplicarFiltros(); // mantém os filtros ativos após recarregar
    atualizarStats(todasSolicitacoes);
  } catch (err) {
    console.error('Erro ao carregar:', err);
    mostrarToast('Erro ao carregar solicitações: ' + err.message, 'error');
  }
}

function classificarStatus(solicitacoes) {
  const agora = new Date();

  solicitacoes.forEach((sol) => {
    if (sol.status === 'Concluída') return;

    const temAndamento = sol.andamentos && sol.andamentos.length > 0;
    const dataPedido = new Date(sol.data_pedido);
    const diffHoras = (agora - dataPedido) / (1000 * 60 * 60);

    if (!temAndamento || sol.status === 'Pendente') {
      if (diffHoras > 48) {
        sol.status = 'Atenção';
      } else if (diffHoras > 24) {
        sol.status = 'Sem Retorno 2° Dia';
      } else if (diffHoras > 12) {
        sol.status = 'Sem Retorno 1° Dia';
      }
    } else if (sol.status === 'Pendente' && temAndamento) {
      sol.status = 'Em Andamento';
    }
  });
}

async function salvarSolicitacao(e) {
  e.preventDefault();

  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const id = document.getElementById('solicitacaoId').value;
    const dataBrasilia = getDataHoraBrasilia();

    const dados = {
      nome_cliente: document.getElementById('nomeCliente').value.trim(),
      documento: document.getElementById('documento').value.trim(),
      protocolo: document.getElementById('protocolo').value.trim(),
      tipo_solicitacao: document.getElementById('tipoSolicitacao').value,
      observacoes: document.getElementById('observacoes').value.trim(),
      data_pedido:
        document.getElementById('dataPedido').value ||
        formatarParaInput(dataBrasilia),
      analista: usuarioLogado,
      status: document.getElementById('statusInicial').value,
      user_id: user.id,
      andamentos: [],
    };

    // NOVO: data de efetivação (somente quando for Cancelamento)
    if (dados.tipo_solicitacao === 'Cancelamento') {
      const dataEfetivacao = document.getElementById('dataEfetivacao').value;
      if (!dataEfetivacao) {
        mostrarToast('Informe a data de efetivação do cancelamento!', 'error');
        return;
      }
      dados.data_efetivacao = dataEfetivacao;
    }

    if (!dados.nome_cliente || !dados.protocolo || !dados.tipo_solicitacao) {
      mostrarToast('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    let result;
    if (id) {
      result = await supabaseClient
        .from('solicitacoes')
        .update(dados)
        .eq('id', id)
        .eq('user_id', user.id);
    } else {
      result = await supabaseClient.from('solicitacoes').insert([dados]);
    }

    if (result.error) throw result.error;

    mostrarToast(
      id ? 'Solicitação atualizada!' : 'Solicitação criada!',
      'success'
    );
    fecharModalFormulario();
    await carregarSolicitacoes();
  } catch (err) {
    console.error('Erro ao salvar:', err);
    mostrarToast('Erro ao salvar: ' + err.message, 'error');
  }
}

async function registrarAndamento(e) {
  e.preventDefault();

  try {
    if (!solicitacaoAtual) return;

    const titulo = document.getElementById('andamentoTitulo').value.trim();
    const resumo = document.getElementById('andamentoResumo').value.trim();

    if (!titulo) {
      mostrarToast('Informe o título da atualização!', 'error');
      return;
    }

    const now = new Date();
    const offsetBrasilia = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const diff = offsetBrasilia + localOffset;
    const dataBrasilia = new Date(now.getTime() + diff * 60000);

    const andamento = {
      id: Date.now().toString(),
      titulo: titulo,
      resumo: resumo,
      data: dataBrasilia.toISOString(),
    };

    const andamentosAtuais = solicitacaoAtual.andamentos || [];
    andamentosAtuais.push(andamento);

    let novoStatus = solicitacaoAtual.status;
    if (
      novoStatus === 'Pendente' ||
      novoStatus === 'Sem Retorno 1° Dia' ||
      novoStatus === 'Sem Retorno 2° Dia' ||
      novoStatus === 'Atenção'
    ) {
      novoStatus = 'Em Andamento';
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from('solicitacoes')
      .update({
        andamentos: andamentosAtuais,
        status: novoStatus,
      })
      .eq('id', solicitacaoAtual.id)
      .eq('user_id', user.id);

    if (error) throw error;

    mostrarToast('Andamento registrado com sucesso!', 'success');
    document.getElementById('andamentoForm').reset();
    await carregarSolicitacoes();
    abrirModalDetalhes(solicitacaoAtual.id);
  } catch (err) {
    console.error('Erro ao registrar andamento:', err);
    mostrarToast('Erro ao registrar andamento: ' + err.message, 'error');
  }
}

async function toggleConcluido(id) {
  try {
    const item = todasSolicitacoes.find((s) => s.id === id);
    if (!item) return;

    const novoStatus = item.status === 'Concluída' ? 'Pendente' : 'Concluída';
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from('solicitacoes')
      .update({ status: novoStatus })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    await carregarSolicitacoes();
  } catch (err) {
    console.error('Erro ao alterar status:', err);
    mostrarToast('Erro ao alterar status', 'error');
  }
}

async function excluirSolicitacao(id) {
  if (!confirm('Confirma a remoção definitiva desta solicitação?')) return;

  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from('solicitacoes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    mostrarToast('Solicitação excluída!', 'success');
    await carregarSolicitacoes();
  } catch (err) {
    console.error('Erro ao excluir:', err);
    mostrarToast('Erro ao excluir solicitação', 'error');
  }
}

// ============================================================
// TROCA DE STATUS (card, seletor rápido e arrastar no kanban)
// ============================================================
async function atualizarStatus(id, novoStatus) {
  try {
    const item = todasSolicitacoes.find((s) => s.id === id);
    if (!item) return;

    if (item.status === novoStatus) {
      aplicarFiltros();
      return;
    }

    const statusAnterior = item.status;
    const andamento = {
      id: Date.now().toString(),
      titulo: 'Status alterado',
      resumo: `De "${getStatusLabel(statusAnterior)}" para "${getStatusLabel(
        novoStatus
      )}"`,
      data: getDataHoraBrasilia().toISOString(),
    };
    const andamentos = [...(item.andamentos || []), andamento];

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from('solicitacoes')
      .update({ status: novoStatus, andamentos: andamentos })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    await carregarSolicitacoes();

    // Se a regra automática reposicionou o card, avisa o motivo
    const atualizado = todasSolicitacoes.find((s) => s.id === id);
    if (atualizado && atualizado.status !== novoStatus) {
      mostrarToast(
        `Regra automática manteve o card em "${getStatusLabel(
          atualizado.status
        )}" pelo tempo sem retorno.`,
        'info'
      );
    } else {
      mostrarToast(`Status: ${getStatusLabel(novoStatus)}`, 'success');
    }
  } catch (err) {
    console.error('Erro ao alterar status:', err);
    mostrarToast('Erro ao alterar status', 'error');
    aplicarFiltros();
  }
}

function trocarStatusRapido(event, id) {
  event.stopPropagation();
  atualizarStatus(id, event.target.value);
}

// ---- Arrastar e soltar (kanban) ----
function iniciarArraste(event, id) {
  itemArrastadoId = id;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', id);
  event.currentTarget.classList.add('dragging');
}

function finalizarArraste(event) {
  event.currentTarget.classList.remove('dragging');
  document
    .querySelectorAll('.kanban-col.drag-over')
    .forEach((c) => c.classList.remove('drag-over'));
}

function permitirSoltar(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over');
}

function saiuDaColuna(event) {
  const col = event.currentTarget;
  if (!col.contains(event.relatedTarget)) col.classList.remove('drag-over');
}

function soltarNaColuna(event) {
  event.preventDefault();
  const col = event.currentTarget;
  col.classList.remove('drag-over');
  const id = event.dataTransfer.getData('text/plain') || itemArrastadoId;
  itemArrastadoId = null;
  if (id) atualizarStatus(id, col.dataset.status);
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================
function renderizarSolicitacoes(solicitacoes) {
  renderizarKanban(solicitacoes);
  renderizarLista(solicitacoes);
}

function opcoesStatus(statusAtual) {
  return STATUS_CONFIG.map(
    (c) =>
      `<option value="${c.valor}" ${
        c.valor === statusAtual ? 'selected' : ''
      }>${c.label === 'Concluídas' ? 'Concluída' : c.label}</option>`
  ).join('');
}

function htmlSeletorStatus(item) {
  const cfg = getStatusConfig(item.status);
  return `<select class="status-select ${cfg.classe}" title="Alterar status"
            onclick="event.stopPropagation();"
            onchange="trocarStatusRapido(event, '${item.id}')">
            ${opcoesStatus(cfg.valor)}
          </select>`;
}

function htmlAcoes(item) {
  const isConcluido = item.status === 'Concluída';
  return `<div class="card-actions" onclick="event.stopPropagation();">
      <button class="btn-icon ${isConcluido ? 'active-check' : ''}" title="${
    isConcluido ? 'Reabrir' : 'Concluir'
  }" onclick="toggleConcluido('${item.id}')">${ICON_CHECK}</button>
      <button class="btn-icon" title="Editar" onclick="editarSolicitacao('${
        item.id
      }')">${ICON_EDIT}</button>
      <button class="btn-icon" title="Excluir" onclick="excluirSolicitacao('${
        item.id
      }')">${ICON_TRASH}</button>
    </div>`;
}

function renderizarKanban(solicitacoes) {
  const board = document.getElementById('kanbanBoard');
  const lista = solicitacoes || [];

  board.innerHTML = STATUS_CONFIG.map((cfg) => {
    const cards = lista.filter(
      (s) => getStatusConfig(s.status).valor === cfg.valor
    );

    return `
      <div class="kanban-col" data-status="${cfg.valor}"
           ondragover="permitirSoltar(event)"
           ondragleave="saiuDaColuna(event)"
           ondrop="soltarNaColuna(event)">
        <div class="kanban-col-header" style="--col-color:${cfg.cor}">
          <span class="kanban-col-title">${cfg.label}</span>
          <span class="kanban-count">${cards.length}</span>
        </div>
        <div class="kanban-col-body">
          ${
            cards.length
              ? cards.map(htmlCardKanban).join('')
              : '<div class="kanban-empty">Nenhum card</div>'
          }
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// CARD KANBAN SIMPLIFICADO
// Exibe: Nome do cliente, Tipo, Data da solicitação e Status
// ============================================================
function htmlCardKanban(item) {
  const cfg = getStatusConfig(item.status);
  const isConcluido = item.status === 'Concluída';
  const dataFormatada = item.data_pedido
    ? formatarDataHora(item.data_pedido)
    : '-';

  return `
    <div class="kcard ${cfg.tom ? 'tone-' + cfg.tom : ''} ${
    isConcluido ? 'is-completed' : ''
  }" draggable="true"
         ondragstart="iniciarArraste(event, '${item.id}')"
         ondragend="finalizarArraste(event)"
         onclick="abrirModalDetalhes('${item.id}')">
      <div class="kcard-title">${escapeHtml(item.nome_cliente)}</div>
      <div class="kcard-sub">${escapeHtml(item.tipo_solicitacao || 'Sem tipo')}</div>
      <div class="kcard-date">${dataFormatada}</div>
      <div class="kcard-footer">
        ${htmlSeletorStatus(item)}
      </div>
    </div>`;
}

function renderizarLista(solicitacoes) {
  const tbody = document.getElementById('listaBody');

  if (!solicitacoes || solicitacoes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">Nenhuma solicitação encontrada.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = solicitacoes
    .map((item) => {
      const isConcluido = item.status === 'Concluída';
      const efetivacao =
        item.tipo_solicitacao === 'Cancelamento' && item.data_efetivacao
          ? formatarDataISO(item.data_efetivacao)
          : '-';
      return `
      <tr class="${
        isConcluido ? 'is-completed' : ''
      }" onclick="abrirModalDetalhes('${item.id}')">
        <td><span class="protocolo">${escapeHtml(item.protocolo)}</span></td>
        <td>${escapeHtml(item.nome_cliente)}</td>
        <td class="cell-muted">${escapeHtml(item.tipo_solicitacao || '-')}</td>
        <td class="cell-muted">${
          item.data_pedido ? formatarDataHora(item.data_pedido) : '-'
        }</td>
        <td class="cell-muted">${efetivacao}</td>
        <td class="cell-muted">${escapeHtml(item.analista || '-')}</td>
        <td>${htmlSeletorStatus(item)}</td>
        <td class="col-acoes">${htmlAcoes(item)}</td>
      </tr>`;
    })
    .join('');
}

function getStatusClass(status) {
  return getStatusConfig(status).classe;
}

function atualizarStats(solicitacoes) {
  const total = solicitacoes.length;
  const pendente = solicitacoes.filter((s) => s.status === 'Pendente').length;
  const andamento = solicitacoes.filter(
    (s) => s.status === 'Em Andamento'
  ).length;
  const analise = solicitacoes.filter(
    (s) => s.status === 'Análise Interna'
  ).length;
  const concluido = solicitacoes.filter((s) => s.status === 'Concluída').length;
  const semRetorno1 = solicitacoes.filter(
    (s) => s.status === 'Sem Retorno 1° Dia'
  ).length;
  const semRetorno2 = solicitacoes.filter(
    (s) => s.status === 'Sem Retorno 2° Dia'
  ).length;
  const atencao = solicitacoes.filter((s) => s.status === 'Atenção').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPendente').textContent = pendente;
  document.getElementById('statAndamento').textContent = andamento;
  document.getElementById('statAnalise').textContent = analise;
  document.getElementById('statConcluido').textContent = concluido;
  document.getElementById('statSemRetorno1').textContent = semRetorno1;
  document.getElementById('statSemRetorno2').textContent = semRetorno2;
  document.getElementById('statAtencao').textContent = atencao;
}

// ============================================================
// VISÕES (Kanban / Lista)
// ============================================================
function trocarVisao(visao) {
  visaoAtual = visao;
  document.getElementById('mainContainer').dataset.view = visao;
  document
    .getElementById('tabKanban')
    .classList.toggle('active', visao === 'kanban');
  document
    .getElementById('tabLista')
    .classList.toggle('active', visao === 'lista');
  document
    .getElementById('viewKanban')
    .classList.toggle('active', visao === 'kanban');
  document
    .getElementById('viewLista')
    .classList.toggle('active', visao === 'lista');
  aplicarFiltros();
}

// ============================================================
// FILTROS
// ============================================================
function filtrarPorStatus(status) {
  // No kanban, clicar no resumo leva até a coluna correspondente
  if (visaoAtual === 'kanban') {
    if (status === 'todos') return;
    const col = document.querySelector(`.kanban-col[data-status="${status}"]`);
    if (col) {
      col.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      col.classList.add('col-pulse');
      setTimeout(() => col.classList.remove('col-pulse'), 1400);
    }
    return;
  }

  if (status === 'todos') {
    document.getElementById('filterStatus').value = '';
  } else {
    document.getElementById('filterStatus').value = status;
  }

  document.querySelectorAll('.stat-card').forEach((card) => {
    card.style.border = '1px solid #eef0f4';
    card.style.boxShadow = 'none';
  });

  if (status !== 'todos') {
    const card = document.querySelector(`.stat-card[data-status="${status}"]`);
    if (card) {
      card.style.border = '1px solid #6226ef';
      card.style.boxShadow = '0 2px 8px rgba(98, 38, 239, 0.06)';
    }
  }

  aplicarFiltros();
}

function aplicarFiltros() {
  // O filtro de status só vale na Lista (no Kanban o status é a própria coluna)
  const status =
    visaoAtual === 'lista' ? document.getElementById('filterStatus').value : '';
  const tipo = document.getElementById('filterTipo').value;
  const busca = document
    .getElementById('filterSearch')
    .value.toLowerCase()
    .trim();

  let filtrados = todasSolicitacoes;

  if (status) filtrados = filtrados.filter((s) => s.status === status);
  if (tipo) filtrados = filtrados.filter((s) => s.tipo_solicitacao === tipo);
  if (busca) {
    filtrados = filtrados.filter(
      (s) =>
        (s.nome_cliente && s.nome_cliente.toLowerCase().includes(busca)) ||
        (s.protocolo && s.protocolo.toLowerCase().includes(busca))
    );
  }

  renderizarSolicitacoes(filtrados);
}

function limparFiltros() {
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterTipo').value = '';
  document.getElementById('filterSearch').value = '';

  document.querySelectorAll('.stat-card').forEach((card) => {
    card.style.border = '1px solid #eef0f4';
    card.style.boxShadow = 'none';
  });

  aplicarFiltros();
  atualizarStats(todasSolicitacoes);
}

// ============================================================
// MODAIS
// ============================================================
function atualizarCampoEfetivacao() {
  const ehCancelamento =
    document.getElementById('tipoSolicitacao').value === 'Cancelamento';
  const grupo = document.getElementById('grupoEfetivacao');
  const campo = document.getElementById('dataEfetivacao');
  grupo.classList.toggle('visivel', ehCancelamento);
  campo.required = ehCancelamento;
  if (!ehCancelamento) campo.value = '';
}

function abrirModalFormulario(editData = null) {
  document.getElementById('solicitacaoForm').reset();
  document.getElementById('solicitacaoId').value = '';
  document.getElementById('modalFormTitle').innerText = 'Nova Solicitação';

  if (editData) {
    document.getElementById('modalFormTitle').innerText = 'Editar Solicitação';
    document.getElementById('solicitacaoId').value = editData.id;
    document.getElementById('nomeCliente').value = editData.nome_cliente || '';
    document.getElementById('documento').value = editData.documento || '';
    document.getElementById('protocolo').value = editData.protocolo || '';
    document.getElementById('tipoSolicitacao').value =
      editData.tipo_solicitacao || '';
    document.getElementById('observacoes').value = editData.observacoes || '';
    document.getElementById('dataPedido').value = editData.data_pedido || '';
    document.getElementById('statusInicial').value =
      editData.status || 'Pendente';
    atualizarCampoEfetivacao();
    document.getElementById('dataEfetivacao').value = editData.data_efetivacao
      ? String(editData.data_efetivacao).slice(0, 10)
      : '';
    document.getElementById('dataPedido').readOnly = false;
  } else {
    gerarProtocolo();
    const dataBrasilia = getDataHoraBrasilia();
    document.getElementById('dataPedido').value =
      formatarParaInput(dataBrasilia);
    // Data e hora do pedido são automáticas em novas solicitações
    document.getElementById('dataPedido').readOnly = true;
    document.getElementById('statusInicial').value = 'Pendente';
    atualizarCampoEfetivacao();
  }

  document.getElementById('modalForm').classList.add('active');
}

function fecharModalFormulario() {
  document.getElementById('modalForm').classList.remove('active');
}

function editarSolicitacao(id) {
  const item = todasSolicitacoes.find((s) => s.id === id);
  if (item) {
    if (document.getElementById('modalDetalhes').classList.contains('active')) {
      document.getElementById('modalDetalhes').classList.remove('active');
      document.body.style.overflow = '';
    }
    abrirModalFormulario(item);
  } else {
    mostrarToast('Solicitação não encontrada', 'error');
  }
}

function editarDoDetalhes() {
  if (solicitacaoAtual) {
    document.getElementById('modalDetalhes').classList.remove('active');
    document.body.style.overflow = '';
    abrirModalFormulario(solicitacaoAtual);
  }
}

function abrirModalDetalhes(id) {
  const item = todasSolicitacoes.find((s) => s.id === id);
  if (!item) {
    mostrarToast('Solicitação não encontrada', 'error');
    return;
  }

  solicitacaoAtual = item;

  const body = document.getElementById('detalhesBody');

  const linhaEfetivacao =
    item.tipo_solicitacao === 'Cancelamento' && item.data_efetivacao
      ? `<div class="detalhes-row"><strong>Efetivação:</strong> ${formatarDataISO(
          item.data_efetivacao
        )}</div>`
      : '';

  let html = `
      <div class="detalhes-body-full">
          <div class="detalhes-coluna-esquerda">
              <div class="detalhes-info">
                  <div class="detalhes-row"><strong>Protocolo:</strong> ${escapeHtml(
                    item.protocolo
                  )}</div>
                  <div class="detalhes-row"><strong>Cliente:</strong> ${escapeHtml(
                    item.nome_cliente
                  )}</div>
                  <div class="detalhes-row"><strong>Documento:</strong> ${
                    escapeHtml(item.documento) || '-'
                  }</div>
                  <div class="detalhes-row"><strong>Tipo:</strong> ${escapeHtml(
                    item.tipo_solicitacao
                  )}</div>
                  ${linhaEfetivacao}
                  <div class="detalhes-row"><strong>Analista:</strong> ${
                    escapeHtml(item.analista) || '-'
                  }</div>
                  <div class="detalhes-row"><strong>Data do Pedido:</strong> ${
                    item.data_pedido ? formatarDataHora(item.data_pedido) : '-'
                  }</div>
                  <div class="detalhes-row"><strong>Status:</strong> <span class="status-badge ${getStatusClass(
                    item.status
                  )}">${getStatusLabel(item.status)}</span></div>
                  <div class="detalhes-row"><strong>Observações:</strong> ${
                    escapeHtml(item.observacoes) || 'Nenhuma'
                  }</div>
              </div>
          </div>
          <div class="detalhes-coluna-direita">
              <div class="detalhes-novo-andamento">
                  <button class="btn-andamento" onclick="abrirModalAndamento()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Registrar Atualização
                  </button>
              </div>
              <div class="detalhes-andamentos">
                  <h4>Histórico de Andamento</h4>
                  <div id="andamentosContainer">
  `;

  if (item.andamentos && item.andamentos.length > 0) {
    const sorted = [...item.andamentos].reverse();
    html += sorted
      .map(
        (a) => `
          <div class="andamento-item">
              <div class="andamento-bolinha"></div>
              <div class="andamento-conteudo">
                  <div class="andamento-header">
                      <span class="andamento-titulo">${escapeHtml(
                        a.titulo
                      )}</span>
                      <span class="andamento-data">${formatarDataHora(
                        a.data
                      )}</span>
                  </div>
                  ${
                    a.resumo
                      ? `<div class="andamento-resumo">${escapeHtml(
                          a.resumo
                        )}</div>`
                      : ''
                  }
              </div>
          </div>
      `
      )
      .join('');
  } else {
    html += `<p style="color: #8e94a8; font-size: 0.8rem;">Nenhum andamento registrado.</p>`;
  }

  html += `
                  </div>
              </div>
          </div>
      </div>
  `;

  body.innerHTML = html;
  document.getElementById(
    'detalhesTitulo'
  ).innerText = `${item.nome_cliente} - ${item.protocolo}`;
  document.getElementById('modalDetalhes').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModalDetalhes() {
  document.getElementById('modalDetalhes').classList.remove('active');
  document.body.style.overflow = '';
  solicitacaoAtual = null;
}

// ============================================================
// MODAL ANDAMENTO
// ============================================================
function abrirModalAndamento() {
  document.getElementById('andamentoForm').reset();
  document.getElementById('modalAndamento').classList.add('active');
}

function fecharModalAndamento() {
  document.getElementById('modalAndamento').classList.remove('active');
}

async function salvarAndamento(e) {
  e.preventDefault();

  try {
    if (!solicitacaoAtual) return;

    const titulo = document.getElementById('andamentoTitulo').value.trim();
    const resumo = document.getElementById('andamentoResumo').value.trim();

    if (!titulo) {
      mostrarToast('Informe o título da atualização!', 'error');
      return;
    }

    const dataBrasilia = getDataHoraBrasilia();

    const andamento = {
      id: Date.now().toString(),
      titulo: titulo,
      resumo: resumo,
      data: dataBrasilia.toISOString(),
    };

    const andamentosAtuais = solicitacaoAtual.andamentos || [];
    andamentosAtuais.push(andamento);

    let novoStatus = solicitacaoAtual.status;
    if (
      novoStatus === 'Pendente' ||
      novoStatus === 'Sem Retorno 1° Dia' ||
      novoStatus === 'Sem Retorno 2° Dia' ||
      novoStatus === 'Atenção'
    ) {
      novoStatus = 'Em Andamento';
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from('solicitacoes')
      .update({
        andamentos: andamentosAtuais,
        status: novoStatus,
      })
      .eq('id', solicitacaoAtual.id)
      .eq('user_id', user.id);

    if (error) throw error;

    mostrarToast('Andamento registrado com sucesso!', 'success');
    fecharModalAndamento();
    await carregarSolicitacoes();
    abrirModalDetalhes(solicitacaoAtual.id);
  } catch (err) {
    console.error('Erro ao registrar andamento:', err);
    mostrarToast('Erro ao registrar andamento: ' + err.message, 'error');
  }
}

// ============================================================
// ALERTAS
// Todos usam o mesmo modal e entram em fila (um por vez).
// ============================================================
function enfileirarAlerta(cfg) {
  filaAlertas.push(cfg);
  if (!alertaAberto) abrirProximoAlerta();
}

function abrirProximoAlerta() {
  const cfg = filaAlertas.shift();
  if (!cfg) {
    alertaAberto = false;
    return;
  }
  alertaAberto = true;
  document.getElementById('modalAlertTitulo').textContent = cfg.titulo;
  document.getElementById('modalAlertBody').innerHTML = cfg.html;
  document.getElementById('modalAlertContent').className =
    'modal-content modal-alert ' + (cfg.classe || '');
  document.getElementById('modalAlert').classList.add('active');
}

function fecharModalAlert() {
  document.getElementById('modalAlert').classList.remove('active');
  alertaAberto = false;
  setTimeout(abrirProximoAlerta, 250);
}

function verificarTodosAlertas(incluirCancelamento) {
  if (incluirCancelamento) {
    ultimoDiaAlertaCancelamento = formatarParaInput(
      getDataHoraBrasilia()
    ).slice(0, 10);
    verificarAlertasCancelamento();
  }
  verificarAlertas();
  verificarAlertasAguardando();
}

// A cada 1 hora: recarrega os dados reais e avisa de novo enquanto houver pendência.
// O aviso de cancelamento é repetido quando vira o dia (página aberta por mais de 1 dia).
function iniciarAlertaPorHora() {
  if (timerAlertas) return;
  timerAlertas = setInterval(async () => {
    if (alertaAberto) return;
    await carregarSolicitacoes();
    const hoje = formatarParaInput(getDataHoraBrasilia()).slice(0, 10);
    verificarTodosAlertas(hoje !== ultimoDiaAlertaCancelamento);
  }, 60 * 60 * 1000);
}

function verificarAlertas() {
  const agora = new Date();
  const semRetorno1 = [];
  const semRetorno2 = [];
  const atencao = [];

  todasSolicitacoes.forEach((sol) => {
    if (sol.status === 'Concluída') return;

    const dataPedido = new Date(sol.data_pedido);
    const diffHoras = (agora - dataPedido) / (1000 * 60 * 60);

    const temAndamento = sol.andamentos && sol.andamentos.length > 0;

    if (
      !temAndamento ||
      sol.status === 'Pendente' ||
      sol.status === 'Sem Retorno 1° Dia' ||
      sol.status === 'Sem Retorno 2° Dia'
    ) {
      if (diffHoras > 48) {
        atencao.push(sol);
      } else if (diffHoras > 24) {
        semRetorno2.push(sol);
      } else if (diffHoras > 12) {
        semRetorno1.push(sol);
      }
    }
  });

  if (semRetorno1.length > 0 || semRetorno2.length > 0 || atencao.length > 0) {
    mostrarModalAlertas(semRetorno1, semRetorno2, atencao);
  }
}

function mostrarModalAlertas(semRetorno1, semRetorno2, atencao) {
  let html = '';

  if (semRetorno1.length > 0) {
    html += `<div class="alerta-categoria alerta-amarelo">
            <h4>Solicitações sem retorno 1° dia útil</h4>
            ${semRetorno1
              .map(
                (s) =>
                  `<div class="alerta-item">${escapeHtml(
                    s.protocolo
                  )} - ${escapeHtml(s.nome_cliente)}</div>`
              )
              .join('')}
        </div>`;
  }

  if (semRetorno2.length > 0) {
    html += `<div class="alerta-categoria alerta-laranja">
            <h4>Solicitações sem retorno 2° dia útil</h4>
            ${semRetorno2
              .map(
                (s) =>
                  `<div class="alerta-item">${escapeHtml(
                    s.protocolo
                  )} - ${escapeHtml(s.nome_cliente)}</div>`
              )
              .join('')}
        </div>`;
  }

  if (atencao.length > 0) {
    html += `<div class="alerta-categoria alerta-vermelho">
            <h4>Atenção! - Solicitações com atraso crítico</h4>
            ${atencao
              .map(
                (s) =>
                  `<div class="alerta-item">${escapeHtml(
                    s.protocolo
                  )} - ${escapeHtml(s.nome_cliente)}</div>`
              )
              .join('')}
        </div>`;
  }

  enfileirarAlerta({ titulo: 'Resumo do Dia', html: html, classe: '' });
}

// ---- Aguardando retorno e-mail (aviso por hora) ----
function verificarAlertasAguardando() {
  const agora = new Date();
  const aguardando = todasSolicitacoes.filter((s) => s.status === 'Pendente');
  if (aguardando.length === 0) return;

  const html = `<div class="alerta-categoria alerta-roxo">
      <h4>${aguardando.length} solicitação(ões) aguardando retorno por e-mail</h4>
      ${aguardando
        .map((s) => {
          const horas = Math.max(
            0,
            Math.floor((agora - new Date(s.data_pedido)) / (1000 * 60 * 60))
          );
          return `<div class="alerta-item">${escapeHtml(
            s.protocolo
          )} - ${escapeHtml(s.nome_cliente)} <span style="color:#8e94a8">(${formatarTempo(
            horas
          )})</span></div>`;
        })
        .join('')}
    </div>
    <p class="relatorio-resumo">Você será avisado novamente a cada hora até o status mudar.</p>`;

  enfileirarAlerta({
    titulo: 'Aguardando retorno e-mail',
    html: html,
    classe: 'alert-aguardando',
  });
}

// ---- Cancelamento próximo da efetivação ----
function verificarAlertasCancelamento() {
  const hoje = getDataHoraBrasilia();
  hoje.setHours(0, 0, 0, 0);

  const lista = [];

  todasSolicitacoes.forEach((sol) => {
    if (sol.tipo_solicitacao !== 'Cancelamento') return;
    if (!sol.data_efetivacao || sol.status === 'Concluída') return;

    const efetivacao = parseDataISO(sol.data_efetivacao);
    if (!efetivacao) return;

    if (mesmoDia(hoje, efetivacao)) {
      lista.push({ sol, efetivacao, quando: 'hoje' });
    } else if (mesmoDia(hoje, diaUtilAnterior(efetivacao))) {
      lista.push({ sol, efetivacao, quando: 'antes' });
    }
  });

  if (lista.length === 0) return;

  // Os que efetivam hoje aparecem primeiro
  lista.sort((a, b) => (a.quando === 'hoje' ? -1 : 1) - (b.quando === 'hoje' ? -1 : 1));

  const linhas = lista
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.sol.nome_cliente)}</td>
        <td>${escapeHtml(r.sol.protocolo)}</td>
        <td>${formatarData(r.efetivacao)}</td>
        <td><span class="tag-prazo ${
          r.quando === 'hoje' ? 'tag-hoje' : 'tag-amanha'
        }">${
        r.quando === 'hoje' ? 'Efetiva hoje' : '1 dia útil antes'
      }</span></td>
      </tr>`
    )
    .join('');

  const html = `
    <p class="relatorio-resumo">${lista.length} cliente(s) com cancelamento na data de efetivação ou a 1 dia útil dela.</p>
    <table class="relatorio-table">
      <thead><tr><th>Cliente</th><th>Solicitação</th><th>Efetivação</th><th>Prazo</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>`;

  enfileirarAlerta({
    titulo: 'Cliente próximo a data de cancelamento',
    html: html,
    classe: 'alert-cancel',
  });
}

// ============================================================
// UTILITÁRIOS
// ============================================================
// Formata data/hora para exibição (DD/MM/AAAA HH:MM)
function formatarDataHora(datetimeStr) {
  if (!datetimeStr) return '-';
  try {
    const date = new Date(datetimeStr);
    // Se a data for inválida, tenta sem ajuste
    if (isNaN(date.getTime())) {
      return datetimeStr;
    }
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
  } catch {
    return datetimeStr;
  }
}
// Formata data para input datetime-local (YYYY-MM-DDTHH:MM)
function formatarParaInput(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  const horas = String(date.getHours()).padStart(2, '0');
  const minutos = String(date.getMinutes()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
}

// Converte 'AAAA-MM-DD' em Date local (evita deslocamento de fuso)
function parseDataISO(str) {
  const m = String(str || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function formatarData(date) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${date.getFullYear()}`;
}

function formatarDataISO(str) {
  const d = parseDataISO(str);
  return d ? formatarData(d) : '-';
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Dias úteis = segunda a sexta (feriados não são considerados)
function ehDiaUtil(date) {
  const d = date.getDay();
  return d !== 0 && d !== 6;
}

function diaUtilAnterior(date) {
  const r = new Date(date);
  do {
    r.setDate(r.getDate() - 1);
  } while (!ehDiaUtil(r));
  return r;
}

function formatarTempo(horas) {
  if (horas < 1) return 'há menos de 1h';
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  const resto = horas % 24;
  return resto ? `há ${dias}d ${resto}h` : `há ${dias}d`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function mostrarToast(mensagem, tipo = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = 'toast show ' + tipo;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}