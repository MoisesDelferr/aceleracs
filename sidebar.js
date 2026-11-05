// Renderiza o Sidebar dinamicamente com base na estrutura fornecida
document.addEventListener('DOMContentLoaded', function () {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;

  // Identifica a página atual para aplicar a classe 'active'
  const pathAtual = window.location.pathname.split('/').pop() || 'index.html';

  // Mapeamento das opções do menu com ícones Font Awesome (versão regular/outline)
  const menuItems = [
    { href: 'index.html', label: 'Feed', icon: 'fa-regular fa-comments' },
    { href: 'solicitacoes.html', label: 'Solicitações', icon: 'fa-regular fa-file-lines' },
    { href: 'calcular.html', label: 'Calcular datas', icon: 'fa-regular fa-calendar' },
    { href: 'atividades.html', label: 'Atividades', icon: 'fa-regular fa-rectangle-list' },
    { href: 'reminders.html', label: 'Lembretes', icon: 'fa-regular fa-bell' },
    { href: 'onboarding.html', label: 'Treinamentos', icon: 'fa-regular fa-graduation-cap' },
    { href: 'notes.html', label: 'Notas', icon: 'fa-regular fa-pen-to-square' },
    { href: 'cancellation.html', label: 'Cancelamentos', icon: 'fa-regular fa-circle-xmark' },
  ];

  const menuHTML = menuItems
    .map((item) => {
      const isActive = pathAtual === item.href ? 'active' : '';
      return `
        <a href="${item.href}" class="nav-link ${isActive}" title="${item.label}" data-href="${item.href}">
          <i class="${item.icon}"></i>
          <span class="nav-label">${item.label}</span>
        </a>
      `;
    })
    .join('');

  sidebarContainer.innerHTML = `
    <aside class="sidebar" id="mainSidebar">
      <div class="sidebar-top">
        <div class="sidebar-brand">
          <div class="brand-icon">
            <img src="assets/logo/logo_aceleraCS.png" alt="Logo Acelera CS" class="brand-logo">
          </div>
          <span class="brand-text">Acelera CS</span>
        </div>
        <div class="divider"></div>
        <nav class="sidebar-menu">
          ${menuHTML}
        </nav>
      </div>

      <div class="sidebar-user">
        <div class="user-details">
          <div class="avatar">CS</div>
          <div class="user-info">
            <span class="user-name">Moisés</span>
            <span class="user-role">Customer Success</span>
          </div>
        </div>
        <button type="button" class="btn-logout" id="btnLogout" title="Sair da conta" onclick="fazerLogout(event)">
          <i class="fa-regular fa-right-from-bracket"></i>
        </button>
      </div>
    </aside>
  `;

  // Carrega Font Awesome de forma robusta
  carregarFontAwesome();

  // Injeta os estilos CSS do Sidebar
  injetarEstilosSidebar();
  
  // Configura o toggle do sidebar
  configurarToggleSidebar();
});

// Função melhorada para carregar o Font Awesome
function carregarFontAwesome() {
  // Remove qualquer link anterior do Font Awesome para evitar conflitos
  document.querySelectorAll('link[href*="font-awesome"]').forEach(el => el.remove());
  document.querySelectorAll('style[data-fa]').forEach(el => el.remove());

  // Carrega via CDN
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css';
  link.integrity = 'sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==';
  link.crossOrigin = 'anonymous';
  link.referrerPolicy = 'no-referrer';
  document.head.appendChild(link);

  // Fallback com import
  const styleImport = document.createElement('style');
  styleImport.setAttribute('data-fa', 'true');
  styleImport.textContent = `
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css');
  `;
  document.head.appendChild(styleImport);

  // CSS de fallback para garantir os estilos
  const styleFallback = document.createElement('style');
  styleFallback.setAttribute('data-fa', 'true');
  styleFallback.textContent = `
    @font-face {
      font-family: 'Font Awesome 6 Free';
      font-style: normal;
      font-weight: 400;
      font-display: block;
      src: url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-regular-400.woff2') format('woff2'),
           url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-regular-400.ttf') format('truetype');
    }
    
    @font-face {
      font-family: 'Font Awesome 6 Free';
      font-style: normal;
      font-weight: 900;
      font-display: block;
      src: url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-solid-900.woff2') format('woff2'),
           url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-solid-900.ttf') format('truetype');
    }

    .fa, .fas, .far, .fal, .fab, .fa-solid, .fa-regular, .fa-brands {
      font-family: 'Font Awesome 6 Free', 'Font Awesome 6 Pro', 'FontAwesome', sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      display: inline-block;
      font-style: normal;
      font-variant: normal;
      text-rendering: auto;
      line-height: 1;
    }

    .fa-solid, .fas {
      font-weight: 900 !important;
    }

    .fa-regular, .far {
      font-weight: 400 !important;
    }
  `;
  document.head.appendChild(styleFallback);
}

// Configura o toggle do sidebar
function configurarToggleSidebar() {
  const sidebar = document.getElementById('mainSidebar');
  const mainContent = document.querySelector('.main-content');
  
  // Cria o botão de expandir (seta) que aparece quando o menu está fechado
  const expandBtn = document.createElement('button');
  expandBtn.className = 'nav-link expand-btn';
  expandBtn.id = 'btnExpandSidebar';
  expandBtn.title = 'Expandir menu';
  expandBtn.innerHTML = `
    <i class="fa-regular fa-chevron-right"></i>
    <span class="nav-label">Expandir</span>
  `;
  
  // Adiciona o botão de expandir ao menu
  const sidebarMenu = document.querySelector('.sidebar-menu');
  if (sidebarMenu) {
    sidebarMenu.appendChild(expandBtn);
  }

  if (!sidebar) return;

  // Verifica se o estado do sidebar está salvo
  const sidebarFechado = localStorage.getItem('sidebarFechado') === 'true';
  
  // Aplica o estado inicial
  if (sidebarFechado) {
    sidebar.classList.add('sidebar-collapsed');
    if (mainContent) mainContent.classList.add('main-expanded');
  }

  // Mostrar/Esconder o botão de expandir baseado no estado
  function atualizarBotaoExpandir() {
    const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
    if (isCollapsed) {
      expandBtn.style.display = 'flex';
      const icon = expandBtn.querySelector('i');
      if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
      expandBtn.style.display = 'none';
    }
  }

  // Atualiza estado inicial
  setTimeout(atualizarBotaoExpandir, 100);

  // Expandir sidebar (clicando na seta)
  expandBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    sidebar.classList.remove('sidebar-collapsed');
    if (mainContent) mainContent.classList.remove('main-expanded');
    localStorage.setItem('sidebarFechado', 'false');
    atualizarBotaoExpandir();
  });

  // Recolhe automaticamente ao clicar em qualquer link do menu
  document.querySelectorAll('.nav-link[data-href]').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const href = this.getAttribute('data-href');
      
      // Fecha o sidebar imediatamente
      sidebar.classList.add('sidebar-collapsed');
      if (mainContent) mainContent.classList.add('main-expanded');
      localStorage.setItem('sidebarFechado', 'true');
      atualizarBotaoExpandir();
      
      // Aguarda um pequeno delay para o efeito visual e navega
      setTimeout(() => {
        window.location.href = href;
      }, 150);
    });
  });

  // Detecta quando a página é carregada e aplica o estado
  window.addEventListener('pageshow', function () {
    const sidebarFechado = localStorage.getItem('sidebarFechado') === 'true';
    if (sidebarFechado) {
      sidebar.classList.add('sidebar-collapsed');
      if (mainContent) mainContent.classList.add('main-expanded');
    } else {
      sidebar.classList.remove('sidebar-collapsed');
      if (mainContent) mainContent.classList.remove('main-expanded');
    }
    setTimeout(atualizarBotaoExpandir, 100);
  });
}

// Injeta os estilos CSS do Sidebar
function injetarEstilosSidebar() {
  if (document.getElementById('sidebar-styles')) return;

  const style = document.createElement('style');
  style.id = 'sidebar-styles';
  style.textContent = `
    /* Sidebar Principal */
    .sidebar {
      width: 250px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      padding: 24px 16px;
      z-index: 1000;
      justify-content: space-between;
      border-right: 1px solid #eef0f5;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    /* Sidebar Recolhido - mostra apenas ícones e logo */
    .sidebar-collapsed {
      width: 72px !important;
      padding: 16px 12px !important;
    }

    .sidebar-collapsed .brand-text,
    .sidebar-collapsed .nav-label,
    .sidebar-collapsed .user-info,
    .sidebar-collapsed .divider {
      display: none !important;
    }

    .sidebar-collapsed .sidebar-brand {
      justify-content: center;
      padding: 0;
      margin-bottom: 16px;
    }

    .sidebar-collapsed .brand-icon {
      width: 40px;
      height: 40px;
    }

    .sidebar-collapsed .sidebar-menu {
      align-items: center;
    }

    .sidebar-collapsed .nav-link {
      justify-content: center;
      padding: 10px;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      gap: 0;
      position: relative;
    }

    .sidebar-collapsed .nav-link i {
      font-size: 18px;
      margin: 0;
      font-weight: 300;
    }

    .sidebar-collapsed .nav-link .nav-label {
      display: none;
    }

    /* Tooltip para ícones no modo recolhido */
    .sidebar-collapsed .nav-link:hover::after {
      content: attr(title);
      position: absolute;
      left: 56px;
      top: 50%;
      transform: translateY(-50%);
      background: #1a1d24;
      color: #ffffff;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 400;
      white-space: nowrap;
      z-index: 2000;
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      pointer-events: none;
      animation: fadeInTooltip 0.2s ease;
    }

    .sidebar-collapsed .nav-link:hover::before {
      content: '';
      position: absolute;
      left: 50px;
      top: 50%;
      transform: translateY(-50%);
      border: 5px solid transparent;
      border-right-color: #1a1d24;
      z-index: 2000;
      pointer-events: none;
    }

    @keyframes fadeInTooltip {
      from {
        opacity: 0;
        transform: translateY(-50%) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(-50%) scale(1);
      }
    }

    .sidebar-collapsed .sidebar-user {
      flex-direction: column;
      gap: 12px;
      padding: 12px 0;
      align-items: center;
    }

    .sidebar-collapsed .user-details {
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .sidebar-collapsed .avatar {
      width: 36px;
      height: 36px;
      font-size: 0.85rem;
    }

    .sidebar-collapsed .btn-logout {
      padding: 6px;
    }

    .sidebar-collapsed .btn-logout i {
      font-size: 16px;
    }

    /* Botão Expandir (seta) - só aparece quando o menu está fechado */
    .expand-btn {
      display: none;
      margin-top: 8px;
      color: #b0b5c0;
      justify-content: center;
      gap: 10px;
      background: transparent;
      border: none;
      width: 100%;
      cursor: pointer;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 400;
      transition: all 0.2s ease;
      align-items: center;
      font-family: inherit;
    }

    .expand-btn:hover {
      color: #6226ef;
      background: #f8f7ff;
    }

    .expand-btn i {
      font-size: 14px;
      font-weight: 300;
      transition: transform 0.3s ease;
    }

    .expand-btn:hover i {
      transform: translateX(3px);
    }

    /* Topo do Sidebar */
    .sidebar-top {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .sidebar-brand {
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: -0.2px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-left: 6px;
      position: relative;
    }

    .brand-icon {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    .brand-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .brand-text {
      color: #6226ef;
      font-size: 1rem;
      white-space: nowrap;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: #f0f2f7;
      margin-bottom: 16px;
      width: 100%;
    }

    .sidebar-menu {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-link {
      color: #8e94a2;
      text-decoration: none;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 400;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
      font-family: inherit;
    }

    .nav-link i {
      font-size: 17px;
      width: 20px;
      text-align: center;
      color: #8e94a2;
      transition: color 0.2s ease;
      font-weight: 300;
    }

    .nav-link:hover {
      color: #6226ef;
      background: #f8f7ff;
    }

    .nav-link:hover i {
      color: #6226ef;
    }

    .nav-link.active {
      color: #6226ef;
      background: #f5f2ff;
      font-weight: 500;
      position: relative;
    }

    .nav-link.active i {
      color: #6226ef;
      font-weight: 400;
    }

    .nav-link.active::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #6226ef;
      border-radius: 0 3px 3px 0;
    }

    .nav-label {
      white-space: nowrap;
      font-weight: 400;
    }

    .nav-link.active .nav-label {
      font-weight: 500;
    }

    /* Rodapé do Perfil */
    .sidebar-user {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 6px;
      border-top: 1px solid #f0f2f7;
    }

    .user-details {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar {
      width: 32px;
      height: 32px;
      background: #f0f2f7;
      color: #1a1d24;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 500;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      color: #1a1d24;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .user-role {
      color: #8e94a2;
      font-size: 0.7rem;
      font-weight: 400;
    }

    .btn-logout {
      background: transparent;
      border: none;
      color: #8e94a2;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .btn-logout i {
      font-size: 17px;
      font-weight: 300;
    }

    .btn-logout:hover {
      background: #fff5f5;
      color: #ea4335;
    }

    /* Ajuste do conteúdo principal */
    .main-content {
      margin-left: 250px;
      transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .main-expanded {
      margin-left: 72px !important;
    }

    /* Responsivo - Em mobile, o sidebar ocupa toda a tela quando aberto */
    @media (max-width: 768px) {
      .sidebar:not(.sidebar-collapsed) {
        width: 280px;
        box-shadow: 2px 0 20px rgba(0,0,0,0.06);
      }
      
      .sidebar-collapsed {
        width: 0 !important;
        padding: 0 !important;
        border: none !important;
        overflow: hidden;
      }
      
      .sidebar-collapsed .brand-icon,
      .sidebar-collapsed .nav-link,
      .sidebar-collapsed .sidebar-user {
        display: none !important;
      }

      .main-content {
        margin-left: 0;
      }

      .main-expanded {
        margin-left: 0 !important;
      }

      /* Botão de hambúrguer para mobile */
      .menu-toggle-mobile {
        display: flex !important;
        position: fixed;
        top: 16px;
        left: 16px;
        z-index: 1001;
        background: #fff;
        border: 1px solid #eef0f5;
        border-radius: 8px;
        padding: 8px 10px;
        cursor: pointer;
        color: #1a1d24;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        transition: all 0.3s ease;
      }

      .menu-toggle-mobile:hover {
        background: #f8f7ff;
        border-color: #6226ef;
        color: #6226ef;
      }

      .menu-toggle-mobile i {
        font-size: 18px;
        font-weight: 300;
      }

      .sidebar:not(.sidebar-collapsed) ~ .menu-toggle-mobile {
        left: 240px;
      }
    }
  `;

  // Adiciona o botão de toggle apenas para mobile
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  if (mediaQuery.matches) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'menu-toggle-mobile';
    toggleBtn.id = 'menuToggleMobile';
    toggleBtn.innerHTML = '<i class="fa-regular fa-bars"></i>';
    document.body.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', function() {
      const sidebar = document.getElementById('mainSidebar');
      const mainContent = document.querySelector('.main-content');
      
      if (sidebar.classList.contains('sidebar-collapsed')) {
        sidebar.classList.remove('sidebar-collapsed');
        if (mainContent) mainContent.classList.remove('main-expanded');
        localStorage.setItem('sidebarFechado', 'false');
      } else {
        sidebar.classList.add('sidebar-collapsed');
        if (mainContent) mainContent.classList.add('main-expanded');
        localStorage.setItem('sidebarFechado', 'true');
      }
    });
  }

  document.head.appendChild(style);
}