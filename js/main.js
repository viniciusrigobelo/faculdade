// =========================
// MENSAGENS
// =========================
function mostrarMensagem(texto, tipo = "sucesso") {
  const mensagem = document.createElement("div");
  mensagem.classList.add("mensagem");
  mensagem.classList.add(tipo === "erro" ? "mensagem-erro" : "mensagem-sucesso");
  mensagem.textContent = texto;
  document.body.appendChild(mensagem);
  setTimeout(() => {
    mensagem.classList.add("sumir");
    setTimeout(() => mensagem.remove(), 300);
  }, 3000);
}

// =========================
// LOGOUT
// =========================
function logout() {
  localStorage.removeItem("usuarioLogado");
  const inPages = window.location.pathname.replace(/\\/g, '/').includes('/pages/');
  window.location.href = inPages ? "login.html" : "pages/login.html";
}

// =========================
// HEADER — ESTADO DO USUÁRIO
// =========================
function inicializarHeader() {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  const liLogout = document.getElementById("li-logout");
  const liVender = document.getElementById("li-vender");
  const perfilNome = document.getElementById("perfil-nome");
  const linkPerfil = document.getElementById("link-perfil");

  if (usuarioLogado) {
    const primeiroNome = usuarioLogado.nome.split(" ")[0];
    if (perfilNome) perfilNome.textContent = primeiroNome;
    if (linkPerfil) linkPerfil.href = "#";
    if (liLogout) liLogout.style.display = "inline-block";

    // Mostrar "Meus Produtos" só para Pessoa Jurídica
    if (liVender && usuarioLogado.tipo === "juridica") {
      liVender.style.display = "inline-block";
    }
  }

  // Mostrar botão Admin se sessão admin estiver ativa
  const liAdmin = document.getElementById("li-admin");
  if (liAdmin && sessionStorage.getItem("adminLogado") === "true") {
    liAdmin.style.display = "inline-block";
  }

  // Fallback: header antigo (páginas sem id="perfil-nome")
  if (!perfilNome && usuarioLogado) {
    const perfil = document.querySelector(".header-icone-perfil");
    if (perfil) {
      const nomeEl = perfil.parentElement.querySelector("h3");
      if (nomeEl) nomeEl.textContent = usuarioLogado.nome.split(" ")[0];
    }
  }
}

// =========================
// CARRINHO — BADGE
// =========================
function atualizarBadgeCarrinho() {
  const badge = document.getElementById("carrinho-badge");
  if (!badge) return;
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const total = carrinho.reduce((sum, item) => sum + item.qtd, 0);
  badge.textContent = total;
  badge.style.display = total > 0 ? "flex" : "none";
}

// =========================
// CARRINHO — ADICIONAR
// =========================
function adicionarAoCarrinho(nome, preco, img) {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const idx = carrinho.findIndex((item) => item.nome === nome);
  if (idx >= 0) {
    carrinho[idx].qtd += 1;
  } else {
    carrinho.push({ nome, preco: parseFloat(preco), img, qtd: 1 });
  }
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  atualizarBadgeCarrinho();
  const nomeResumido = nome.length > 35 ? nome.substring(0, 35) + "..." : nome;
  mostrarMensagem(`"${nomeResumido}" adicionado ao carrinho!`);
}

// =========================
// CARRINHO — PÁGINA
// =========================
function renderizarCarrinho() {
  const container = document.getElementById("carrinho-lista");
  const resumo = document.getElementById("carrinho-resumo");
  if (!container) return;

  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

  if (carrinho.length === 0) {
    container.innerHTML = `
      <div class="carrinho-vazio">
        <h2>Seu carrinho está vazio</h2>
        <p>Que tal explorar nossos quadrinhos?</p>
        <a href="../index.html" class="btn-continuar">Continuar Comprando</a>
      </div>`;
    if (resumo) resumo.style.display = "none";
    return;
  }

  container.innerHTML = carrinho
    .map(
      (item, idx) => `
    <div class="carrinho-item">
      <img src="../${item.img}" alt="${item.nome}" class="carrinho-item__img">
      <div class="carrinho-item__info">
        <h3>${item.nome}</h3>
        <span class="carrinho-item__preco">R$ ${item.preco.toFixed(2).replace(".", ",")}</span>
      </div>
      <div class="carrinho-item__qtd">
        <button class="btn-qtd" onclick="alterarQtd(${idx}, -1)">−</button>
        <span>${item.qtd}</span>
        <button class="btn-qtd" onclick="alterarQtd(${idx}, 1)">+</button>
      </div>
      <span class="carrinho-item__subtotal">R$ ${(item.preco * item.qtd).toFixed(2).replace(".", ",")}</span>
      <button class="carrinho-item__remover" onclick="removerItem(${idx})" title="Remover">✕</button>
    </div>`
    )
    .join("");

  if (resumo) resumo.style.display = "block";
  atualizarTotalComDesconto();
}

function alterarQtd(idx, delta) {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  carrinho[idx].qtd += delta;
  if (carrinho[idx].qtd <= 0) carrinho.splice(idx, 1);
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  atualizarBadgeCarrinho();
  renderizarCarrinho();
}

function removerItem(idx) {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  carrinho.splice(idx, 1);
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  atualizarBadgeCarrinho();
  renderizarCarrinho();
}

// =========================
// CUPONS
// =========================
const CUPONS = {
  "GEEK10": 10,
  "GEEK20": 20,
  "COMIC20": 20,
  "HEROI15": 15,
  "MARVEL5": 5,
};

let descontoAtivo = 0;

function aplicarCupom() {
  const input = document.getElementById("cupom-input");
  const msg = document.getElementById("cupom-msg");
  if (!input || !msg) return;

  const codigo = input.value.trim().toUpperCase();
  const percentual = CUPONS[codigo];

  if (!codigo) {
    msg.textContent = "Digite um cupom.";
    msg.className = "cupom-msg erro";
    return;
  }

  if (!percentual) {
    msg.textContent = "Cupom inválido ou expirado.";
    msg.className = "cupom-msg erro";
    descontoAtivo = 0;
    atualizarTotalComDesconto();
    return;
  }

  descontoAtivo = percentual;
  msg.textContent = `Cupom aplicado! ${percentual}% de desconto.`;
  msg.className = "cupom-msg sucesso";
  input.disabled = true;
  atualizarTotalComDesconto();
}

function atualizarTotalComDesconto() {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const subtotal = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
  const desconto = subtotal * (descontoAtivo / 100);
  const total = subtotal - desconto;

  const subtotalEl = document.getElementById("subtotal-valor");
  const totalEl = document.getElementById("total-valor");
  const descontoEl = document.getElementById("desconto-valor");
  const linhaDesconto = document.getElementById("linha-desconto");

  if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;
  if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;

  if (descontoAtivo > 0) {
    if (linhaDesconto) linhaDesconto.style.display = "flex";
    if (descontoEl) descontoEl.textContent = `- R$ ${desconto.toFixed(2).replace(".", ",")}`;
  } else {
    if (linhaDesconto) linhaDesconto.style.display = "none";
  }
}

function finalizarCompra() {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (!usuarioLogado) {
    mostrarMensagem("Faça login para finalizar sua compra!", "erro");
    setTimeout(() => (window.location.href = "login.html"), 1500);
    return;
  }

  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  if (carrinho.length === 0) return;

  // Abre o modal de pagamento
  const subtotal = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
  const total = subtotal - subtotal * (descontoAtivo / 100);
  const modalTotal = document.getElementById("modal-total");
  if (modalTotal) modalTotal.textContent = "R$ " + total.toFixed(2).replace(".", ",");

  // Limpa seleção anterior
  document.querySelectorAll('input[name="pagamento"]').forEach(r => r.checked = false);

  const modal = document.getElementById("modal-pagamento");
  if (modal) modal.style.display = "flex";
}

function fecharModalPagamento() {
  const modal = document.getElementById("modal-pagamento");
  if (modal) modal.style.display = "none";
}

function confirmarPagamento() {
  const metodoPagamento = document.querySelector('input[name="pagamento"]:checked');
  if (!metodoPagamento) {
    mostrarMensagem("Selecione uma forma de pagamento!", "erro");
    return;
  }

  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const subtotalPedido = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
  const total = subtotalPedido - subtotalPedido * (descontoAtivo / 100);

  const agora = new Date();
  const pedido = {
    id: agora.getTime(),
    numero: "CGS-" + agora.getTime().toString().slice(-6),
    data: agora.toLocaleDateString("pt-BR"),
    dataISO: agora.toISOString(),
    email: usuarioLogado.email,
    itens: JSON.parse(JSON.stringify(carrinho)),
    total,
    pagamento: metodoPagamento.value,
    status: "concluido",
  };

  const pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];
  pedidos.unshift(pedido);
  localStorage.setItem("pedidos", JSON.stringify(pedidos));

  localStorage.removeItem("carrinho");
  atualizarBadgeCarrinho();
  fecharModalPagamento();
  mostrarMensagem("Pedido #" + pedido.numero + " realizado com sucesso!");
  setTimeout(() => (window.location.href = "pedidos.html"), 1500);
}

// =========================
// PEDIDOS — PÁGINA
// =========================
function renderizarPedidos() {
  const container = document.getElementById("pedidos-lista");
  if (!container) return;

  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

  if (!usuarioLogado) {
    container.innerHTML = `
      <div class="pedidos-vazio">
        <h2>Você precisa estar logado</h2>
        <p>Faça login para visualizar seus pedidos.</p>
        <a href="login.html" class="btn-pedidos-acao">Fazer Login</a>
      </div>`;
    return;
  }

  const todosPedidos = JSON.parse(localStorage.getItem("pedidos")) || [];
  const pedidos = todosPedidos.filter((p) => p.email === usuarioLogado.email);

  if (pedidos.length === 0) {
    container.innerHTML = `
      <div class="pedidos-vazio">
        <h2>Nenhum pedido realizado ainda</h2>
        <p>Explore nossa loja e faça seu primeiro pedido!</p>
        <a href="../index.html" class="btn-pedidos-acao">Explorar Loja</a>
      </div>`;
    return;
  }

  container.innerHTML = pedidos
    .map(
      (pedido) => `
    <div class="pedido-card">
      <div class="pedido-card__header">
        <div class="pedido-card__info">
          <span class="pedido-numero">Pedido #${pedido.numero}</span>
          <span class="pedido-data">📅 ${pedido.data}</span>
        </div>
        <div class="pedido-card__direita">
          <span class="pedido-total">R$ ${pedido.total.toFixed(2).replace(".", ",")}</span>
          <span class="pedido-status">✓ Concluído</span>
        </div>
      </div>
      <div class="pedido-itens">
        ${pedido.itens
          .map(
            (item) => `
          <div class="pedido-item">
            <img src="../${item.img}" alt="${item.nome}" class="pedido-item__img">
            <div class="pedido-item__info">
              <span class="pedido-item__nome">${item.nome}</span>
              <span class="pedido-item__qtd">Qtd: ${item.qtd}</span>
            </div>
            <span class="pedido-item__preco">R$ ${(item.preco * item.qtd).toFixed(2).replace(".", ",")}</span>
          </div>`
          )
          .join("")}
      </div>
    </div>`
    )
    .join("");
}

// =========================
// FILTRO DE CATEGORIAS
// =========================
function filtrarProdutos(filtro) {
  const cards = document.querySelectorAll(".card-produto");
  const grupos = document.querySelectorAll(".secao-grupo");
  const estadoVazio = document.getElementById("estado-vazio");

  cards.forEach((card) => {
    let visivel = true;
    if (filtro === "marvel") {
      visivel = card.dataset.editora === "marvel";
    } else if (filtro === "dc") {
      visivel = card.dataset.editora === "dc";
    } else if (filtro === "lancamentos") {
      visivel = card.dataset.secao === "lancamentos";
    } else if (filtro === "prevenda") {
      visivel = card.dataset.secao === "prevenda";
    } else if (filtro === "especiais") {
      visivel = card.dataset.secao === "especiais";
    }
    card.classList.toggle("card-oculto", !visivel);
  });

  grupos.forEach((grupo) => {
    const temVisiveis = [...grupo.querySelectorAll(".card-produto")].some(
      (c) => !c.classList.contains("card-oculto")
    );
    grupo.style.display = temVisiveis ? "" : "none";
  });

  const algumVisivel = [...cards].some((c) => !c.classList.contains("card-oculto"));
  if (estadoVazio) {
    estadoVazio.style.display = algumVisivel ? "none" : "block";
    if (!algumVisivel) {
      estadoVazio.querySelector("h2").textContent = "Nenhum produto nesta categoria.";
      estadoVazio.querySelector("p").textContent = "Confira outras categorias ou volte mais tarde!";
    }
  }
}

function inicializarFiltros() {
  const navItems = document.querySelectorAll("nav ul li[data-filtro]");
  if (!navItems.length) return;

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((n) => n.classList.remove("nav-ativo"));
      item.classList.add("nav-ativo");
      filtrarProdutos(item.dataset.filtro);

      // Limpar busca ao trocar de filtro
      const inputPesquisa = document.getElementById("input-pesquisa");
      if (inputPesquisa) inputPesquisa.value = "";
    });
  });
}

// =========================
// PESQUISA
// =========================
function inicializarPesquisa() {
  const form = document.getElementById("form-pesquisa");
  const input = document.getElementById("input-pesquisa");
  if (!form || !input) return;

  function aplicarBusca() {
    const query = input.value.trim().toLowerCase();
    const cards = document.querySelectorAll(".card-produto");
    const grupos = document.querySelectorAll(".secao-grupo");
    const estadoVazio = document.getElementById("estado-vazio");

    // Resetar nav ativo
    document.querySelectorAll("nav ul li[data-filtro]").forEach((n) => n.classList.remove("nav-ativo"));
    const itemTudo = document.querySelector('nav ul li[data-filtro="tudo"]');
    if (itemTudo) itemTudo.classList.add("nav-ativo");

    if (!query) {
      filtrarProdutos("tudo");
      return;
    }

    cards.forEach((card) => {
      const nome = (card.dataset.nome || "").toLowerCase();
      card.classList.toggle("card-oculto", !nome.includes(query));
    });

    grupos.forEach((grupo) => {
      const temVisiveis = [...grupo.querySelectorAll(".card-produto")].some(
        (c) => !c.classList.contains("card-oculto")
      );
      grupo.style.display = temVisiveis ? "" : "none";
    });

    const algumVisivel = [...cards].some((c) => !c.classList.contains("card-oculto"));
    if (estadoVazio) {
      estadoVazio.style.display = algumVisivel ? "none" : "block";
      if (!algumVisivel) {
        estadoVazio.querySelector("h2").textContent = `Nenhum resultado para "${input.value.trim()}"`;
        estadoVazio.querySelector("p").textContent = "Tente buscar por outro título.";
      }
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    aplicarBusca();
  });

  input.addEventListener("input", () => {
    if (!input.value.trim()) filtrarProdutos("tudo");
  });
}

// =========================
// BOTÕES "ADICIONAR AO CARRINHO"
// =========================
function inicializarBotoesCarrinho() {
  document.querySelectorAll(".card-produto__btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const card = this.closest(".card-produto");
      adicionarAoCarrinho(card.dataset.nome, card.dataset.preco, card.dataset.img);
    });
  });
}

// =========================
// CADASTRO
// =========================
function inicializarCadastro() {
  const formCadastro = document.getElementById("form-cadastro");
  if (!formCadastro) return;

  // Lê o tipo da URL (?tipo=fisica ou ?tipo=juridica)
  const params = new URLSearchParams(window.location.search);
  const tipo = params.get("tipo") || "fisica";

  // Exibe badge de tipo
  const badge = document.getElementById("tipo-badge");
  const titulo = document.getElementById("cadastro-titulo");
  if (badge) {
    badge.textContent = tipo === "juridica" ? "🏢 Pessoa Jurídica" : "👤 Pessoa Física";
    if (tipo === "juridica") badge.classList.add("juridica");
  }
  if (titulo) {
    titulo.textContent = tipo === "juridica" ? "Criar Conta — Pessoa Jurídica" : "Criar Conta — Pessoa Física";
  }

  // Exibe campos específicos por tipo
  const campoCpf = document.getElementById("campo-cpf");
  const campoCnpj = document.getElementById("campo-cnpj");
  const campoRazao = document.getElementById("campo-razao");
  if (tipo === "juridica") {
    if (campoCpf) campoCpf.style.display = "none";
    if (campoCnpj) campoCnpj.style.display = "block";
    if (campoRazao) campoRazao.style.display = "block";
  }

  formCadastro.addEventListener("submit", function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    if (!nome) { mostrarMensagem("Informe seu nome!", "erro"); return; }
    if (senha.length < 6) { mostrarMensagem("A senha deve ter pelo menos 6 caracteres!", "erro"); return; }
    if (senha !== confirmarSenha) { mostrarMensagem("As senhas não coincidem!", "erro"); return; }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    if (usuarios.find((u) => u.email === email)) {
      mostrarMensagem("Esse e-mail já está cadastrado!", "erro");
      return;
    }

    const novoUsuario = { nome, email, senha: btoa(senha), tipo };

    if (tipo === "juridica") {
      const razao = document.getElementById("razao-social")?.value.trim();
      const cnpj = document.getElementById("cnpj")?.value.trim();
      if (razao) novoUsuario.razaoSocial = razao;
      if (cnpj) novoUsuario.cnpj = cnpj;
    } else {
      const cpf = document.getElementById("cpf")?.value.trim();
      if (cpf) novoUsuario.cpf = cpf;
    }

    usuarios.push(novoUsuario);
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify({ nome, email, tipo }));

    mostrarMensagem("Conta criada com sucesso!");
    setTimeout(() => (window.location.href = "../index.html"), 1500);
  });
}

// =========================
// LOGIN
// =========================
const formLogin = document.getElementById("dados-entrar");

if (formLogin) {
  formLogin.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const usuario = usuarios.find((u) => u.email === email && u.senha === btoa(senha));

    if (usuario) {
      localStorage.setItem("usuarioLogado", JSON.stringify({ nome: usuario.nome, email: usuario.email }));
      mostrarMensagem("Login realizado com sucesso!");
      setTimeout(() => (window.location.href = "../index.html"), 1500);
    } else {
      mostrarMensagem("E-mail ou senha inválidos!", "erro");
    }
  });
}

// =========================
// ADMIN
// =========================
const ADMIN_USER  = "admin";
const ADMIN_SENHA = "admin@2024";

function inicializarAdmin() {
  const loginBox  = document.getElementById("admin-login");
  const painel    = document.getElementById("admin-painel");
  if (!loginBox || !painel) return;

  // Verifica sessão admin já ativa
  if (sessionStorage.getItem("adminLogado") === "true") {
    loginBox.style.display = "none";
    painel.style.display   = "flex";
    carregarPainelAdmin();
    return;
  }

  const form = document.getElementById("form-admin-login");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const user  = document.getElementById("admin-user").value.trim();
    const senha = document.getElementById("admin-senha").value;
    const erro  = document.getElementById("admin-login-erro");

    if (user === ADMIN_USER && senha === ADMIN_SENHA) {
      sessionStorage.setItem("adminLogado", "true");
      loginBox.style.display = "none";
      painel.style.display   = "flex";
      carregarPainelAdmin();
    } else {
      erro.textContent = "Usuário ou senha incorretos.";
      setTimeout(() => erro.textContent = "", 3000);
    }
  });
}

function logoutAdmin() {
  sessionStorage.removeItem("adminLogado");
  window.location.reload();
}

function mostrarAba(aba) {
  document.querySelectorAll(".admin-aba").forEach(a => a.style.display = "none");
  document.querySelectorAll(".admin-nav__item").forEach(b => b.classList.remove("ativo"));
  document.getElementById("aba-" + aba).style.display = "block";
  const btns = document.querySelectorAll(".admin-nav__item");
  const abas = ["produtos","pedidos","usuarios"];
  btns[abas.indexOf(aba)]?.classList.add("ativo");

  if (aba === "pedidos")  carregarPedidosAdmin();
  if (aba === "usuarios") carregarUsuariosAdmin();
}

function carregarPainelAdmin() {
  carregarTabelaProdutos();
  atualizarStats();
}

function atualizarStats() {
  const produtos  = JSON.parse(localStorage.getItem("produtosAdmin")) || [];
  const pedidos   = JSON.parse(localStorage.getItem("pedidos"))       || [];
  const usuarios  = JSON.parse(localStorage.getItem("usuarios"))      || [];
  const el = (id) => document.getElementById(id);
  if (el("stat-total-produtos")) el("stat-total-produtos").textContent = produtos.length;
  if (el("stat-total-pedidos"))  el("stat-total-pedidos").textContent  = pedidos.length;
  if (el("stat-total-usuarios")) el("stat-total-usuarios").textContent = usuarios.length;
}

// ---- PRODUTOS ADMIN ----

function toggleFormProduto() {
  const box = document.getElementById("admin-form-produto");
  if (!box) return;
  const visivel = box.style.display !== "none";
  box.style.display = visivel ? "none" : "block";
  if (!visivel) {
    document.getElementById("form-admin-produto").reset();
    document.getElementById("admin-prod-id").value = "";
    document.getElementById("admin-form-titulo").textContent = "Cadastrar Novo Produto";
  }
}

function carregarTabelaProdutos() {
  const tbody  = document.getElementById("admin-tabela-produtos");
  const vazio  = document.getElementById("admin-produtos-vazio");
  if (!tbody) return;

  const produtos = JSON.parse(localStorage.getItem("produtosAdmin")) || [];
  atualizarStats();

  if (produtos.length === 0) {
    tbody.innerHTML = "";
    if (vazio) vazio.style.display = "block";
    return;
  }
  if (vazio) vazio.style.display = "none";

  tbody.innerHTML = produtos.map(p => `
    <tr>
      <td><img src="../${p.img}" class="admin-tabela__img" onerror="this.src='../img/quadrinhos/batman.png'"></td>
      <td><strong>${p.nome}</strong></td>
      <td><span class="admin-tabela__badge badge-${p.editora}">${p.editora.toUpperCase()}</span></td>
      <td><span class="badge-secao">${p.secao}</span></td>
      <td>
        <span style="text-decoration:line-through;color:#aaa;font-size:12px">R$${parseFloat(p.precoOriginal).toFixed(2).replace(".",",")}</span><br>
        <strong>R$${parseFloat(p.preco).toFixed(2).replace(".",",")}</strong>
      </td>
      <td>
        <div class="admin-tabela__acoes">
          <button class="btn-editar-prod" onclick="editarProduto(${p.id})">Editar</button>
          <button class="btn-excluir-prod" onclick="excluirProduto(${p.id})">Excluir</button>
        </div>
      </td>
    </tr>`).join("");
}

function editarProduto(id) {
  const produtos = JSON.parse(localStorage.getItem("produtosAdmin")) || [];
  const p = produtos.find(x => x.id === id);
  if (!p) return;

  document.getElementById("admin-prod-id").value             = p.id;
  document.getElementById("admin-prod-nome").value           = p.nome;
  document.getElementById("admin-prod-editora").value        = p.editora;
  document.getElementById("admin-prod-preco-original").value = p.precoOriginal;
  document.getElementById("admin-prod-preco").value          = p.preco;
  document.getElementById("admin-prod-secao").value          = p.secao;
  document.getElementById("admin-prod-img").value            = p.img;
  document.getElementById("admin-form-titulo").textContent   = "Editar Produto";

  const box = document.getElementById("admin-form-produto");
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth" });
}

function excluirProduto(id) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;
  const produtos = JSON.parse(localStorage.getItem("produtosAdmin")) || [];
  localStorage.setItem("produtosAdmin", JSON.stringify(produtos.filter(p => p.id !== id)));
  carregarTabelaProdutos();
}

function salvarProdutoAdmin(e) {
  e.preventDefault();
  const id            = document.getElementById("admin-prod-id").value;
  const nome          = document.getElementById("admin-prod-nome").value.trim();
  const editora       = document.getElementById("admin-prod-editora").value;
  const precoOriginal = document.getElementById("admin-prod-preco-original").value;
  const preco         = document.getElementById("admin-prod-preco").value;
  const secao         = document.getElementById("admin-prod-secao").value;
  const img           = document.getElementById("admin-prod-img").value.trim();

  if (!nome || !preco || !precoOriginal || !img) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  const produtos = JSON.parse(localStorage.getItem("produtosAdmin")) || [];

  if (id) {
    // Editar existente
    const idx = produtos.findIndex(p => p.id === parseInt(id));
    if (idx >= 0) {
      produtos[idx] = { ...produtos[idx], nome, editora, precoOriginal: parseFloat(precoOriginal), preco: parseFloat(preco), secao, img };
    }
  } else {
    // Novo produto
    produtos.push({ id: Date.now(), nome, editora, precoOriginal: parseFloat(precoOriginal), preco: parseFloat(preco), secao, img });
  }

  localStorage.setItem("produtosAdmin", JSON.stringify(produtos));
  toggleFormProduto();
  carregarTabelaProdutos();
  mostrarMensagem("Produto salvo com sucesso!");
}

// ---- PEDIDOS ADMIN ----

function carregarPedidosAdmin() {
  const container = document.getElementById("admin-lista-pedidos");
  const vazio     = document.getElementById("admin-pedidos-vazio");
  if (!container) return;

  const pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];
  if (pedidos.length === 0) {
    container.innerHTML = "";
    if (vazio) vazio.style.display = "block";
    return;
  }
  if (vazio) vazio.style.display = "none";

  container.innerHTML = pedidos.map(p => `
    <div class="admin-pedido-card">
      <div class="admin-pedido-card__header">
        <div>
          <strong>#${p.numero}</strong>
          <span style="margin-left:12px">${p.data}</span>
        </div>
        <div>
          <span>👤 ${p.email}</span>
          <span style="margin-left:12px;background:#2ecc71;color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">✓ Concluído</span>
        </div>
      </div>
      <div class="admin-pedido-card__body">
        ${p.itens.map(i => `
          <div class="admin-pedido-item">
            <span>${i.nome} × ${i.qtd}</span>
            <span>R$ ${(i.preco * i.qtd).toFixed(2).replace(".",",")}</span>
          </div>`).join("")}
        <div class="admin-pedido-total">Total: R$ ${p.total.toFixed(2).replace(".",",")}</div>
      </div>
    </div>`).join("");
}

// ---- USUÁRIOS ADMIN ----

function carregarUsuariosAdmin() {
  const tbody = document.getElementById("admin-tabela-usuarios");
  const vazio = document.getElementById("admin-usuarios-vazio");
  if (!tbody) return;

  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  if (usuarios.length === 0) {
    tbody.innerHTML = "";
    if (vazio) vazio.style.display = "block";
    return;
  }
  if (vazio) vazio.style.display = "none";

  tbody.innerHTML = usuarios.map(u => `
    <tr>
      <td><strong>${u.nome}</strong></td>
      <td>${u.email}</td>
      <td><span class="admin-tabela__badge" style="background:#f3ebff;color:var(--cor-primaria)">${u.tipo === "juridica" ? "🏢 Jurídica" : "👤 Física"}</span></td>
    </tr>`).join("");
}

// =========================
// PRODUTOS DE VENDEDORES — INDEX
// =========================
function renderizarProdutosVendedores() {
  const lista = document.getElementById("lista-vendedores");
  const grupo = document.getElementById("grupo-vendedores");
  if (!lista || !grupo) return;

  const produtos = JSON.parse(localStorage.getItem("produtosVendedores")) || [];
  if (produtos.length === 0) return;

  grupo.style.display = "block";
  lista.innerHTML = produtos.map((p, idx) => `
    <article class="card-produto"
      data-editora="${p.categoria}"
      data-secao="${p.categoria}"
      data-nome="${p.nome}"
      data-preco="${p.preco}"
      data-img="${p.img}">
      <div class="card-produto__imagem">
        <img src="${p.img}" alt="${p.nome}" onerror="this.src='../img/quadrinhos/batman.png'">
      </div>
      <div class="card-produto__nome"><h3>${p.nome}</h3></div>
      <div class="card-produto__preco">
        <h2>R$${parseFloat(p.preco).toFixed(2).replace(".", ",")}</h2>
      </div>
      <button class="card-produto__btn" onclick="adicionarAoCarrinho('${p.nome}', '${p.preco}', '${p.img}')">+ Adicionar ao Carrinho</button>
    </article>`).join("");
}

// =========================
// PRODUTOS ADMIN — INDEX
// =========================
function renderizarProdutosAdmin() {
  const produtos = JSON.parse(localStorage.getItem("produtosAdmin")) || [];
  if (produtos.length === 0) return;

  // Mapa de seção → lista de cards existente
  const mapaSecao = {
    lancamentos: document.querySelector("#grupo-lancamentos .lista-cards"),
    marvel:      document.querySelector("#grupo-marvel .lista-cards"),
    dc:          document.querySelector("#grupo-dc .lista-cards"),
    prevenda:    document.querySelector("#grupo-prevenda .lista-cards"),
    especiais:   document.querySelector("#grupo-especiais .lista-cards"),
  };

  produtos.forEach(p => {
    const lista = mapaSecao[p.secao];
    if (!lista) return;

    const card = document.createElement("article");
    card.className = "card-produto";
    card.dataset.editora = p.editora;
    card.dataset.secao   = p.secao;
    card.dataset.nome    = p.nome;
    card.dataset.preco   = p.preco;
    card.dataset.img     = p.img;

    const imgSrc = p.img.startsWith("http") ? p.img : p.img;
    card.innerHTML = `
      <div class="card-produto__imagem">
        <img src="${imgSrc}" alt="${p.nome}" onerror="this.src='img/quadrinhos/batman.png'">
      </div>
      <div class="card-produto__nome"><h3>${p.nome}</h3></div>
      <div class="card-produto__preco">
        <h3>R$${parseFloat(p.precoOriginal).toFixed(2).replace(".",",")}</h3>
        <h2>R$${parseFloat(p.preco).toFixed(2).replace(".",",")}</h2>
      </div>
      <button class="card-produto__btn">+ Adicionar ao Carrinho</button>`;

    card.querySelector(".card-produto__btn").addEventListener("click", function(e) {
      e.stopPropagation();
      adicionarAoCarrinho(p.nome, p.preco, p.img);
    });

    lista.appendChild(card);
  });
}

// =========================
// VENDER — PÁGINA PJ
// =========================
function inicializarVender() {
  const conteudo = document.getElementById("vender-conteudo");
  const bloqueado = document.getElementById("vender-bloqueado");
  if (!conteudo) return;

  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (!usuarioLogado || usuarioLogado.tipo !== "juridica") {
    if (conteudo) conteudo.style.display = "none";
    if (bloqueado) bloqueado.style.display = "block";
    return;
  }

  renderizarMeusProdutos();

  const formProduto = document.getElementById("form-produto");
  if (formProduto) {
    formProduto.addEventListener("submit", function (e) {
      e.preventDefault();
      const nome = document.getElementById("prod-nome").value.trim();
      const preco = document.getElementById("prod-preco").value;
      const categoria = document.getElementById("prod-categoria").value;
      const img = document.getElementById("prod-img").value.trim();
      const descricao = document.getElementById("prod-descricao").value.trim();

      if (!nome || !preco || !img) {
        mostrarMensagem("Preencha todos os campos obrigatórios!", "erro");
        return;
      }

      const produtos = JSON.parse(localStorage.getItem("produtosVendedores")) || [];
      produtos.push({
        id: Date.now(),
        nome, preco: parseFloat(preco), categoria, img, descricao,
        vendedorEmail: usuarioLogado.email,
        vendedorNome: usuarioLogado.nome
      });
      localStorage.setItem("produtosVendedores", JSON.stringify(produtos));

      mostrarMensagem("Produto cadastrado com sucesso!");
      formProduto.reset();
      fecharFormProduto();
      renderizarMeusProdutos();
    });
  }
}

function renderizarMeusProdutos() {
  const lista = document.getElementById("lista-meus-produtos");
  if (!lista) return;

  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  const todos = JSON.parse(localStorage.getItem("produtosVendedores")) || [];
  const meus = todos.filter(p => p.vendedorEmail === usuarioLogado?.email);

  if (meus.length === 0) {
    lista.innerHTML = `<div class="vender-vazio">Você ainda não cadastrou nenhum produto.<br>Clique em "+ Cadastrar Produto" para começar.</div>`;
    return;
  }

  lista.innerHTML = meus.map(p => `
    <div class="meu-produto-card">
      <img src="${p.img}" alt="${p.nome}" class="meu-produto-card__img" onerror="this.src='../img/quadrinhos/batman.png'">
      <div class="meu-produto-card__info">
        <h3>${p.nome}</h3>
        <span>${p.descricao || ""}</span>
      </div>
      <span class="meu-produto-card__categoria">${p.categoria}</span>
      <span class="meu-produto-card__preco">R$ ${parseFloat(p.preco).toFixed(2).replace(".", ",")}</span>
      <button class="btn-remover-produto" onclick="removerMeuProduto(${p.id})" title="Remover">✕</button>
    </div>`).join("");
}

function removerMeuProduto(id) {
  const produtos = JSON.parse(localStorage.getItem("produtosVendedores")) || [];
  const novos = produtos.filter(p => p.id !== id);
  localStorage.setItem("produtosVendedores", JSON.stringify(novos));
  renderizarMeusProdutos();
  mostrarMensagem("Produto removido.");
}

function abrirFormProduto() {
  const box = document.getElementById("form-produto-box");
  if (box) box.style.display = "block";
}

function fecharFormProduto() {
  const box = document.getElementById("form-produto-box");
  if (box) box.style.display = "none";
}

// =========================
// INICIALIZAÇÃO
// =========================
inicializarHeader();
atualizarBadgeCarrinho();
inicializarFiltros();
inicializarPesquisa();
inicializarBotoesCarrinho();
inicializarCadastro();

if (document.getElementById("carrinho-lista")) {
  renderizarCarrinho();
}

if (document.getElementById("pedidos-lista")) {
  renderizarPedidos();
}

if (document.getElementById("lista-vendedores")) {
  renderizarProdutosVendedores();
  renderizarProdutosAdmin();
}

if (document.getElementById("lista-meus-produtos")) {
  inicializarVender();
}

// Admin
const formAdminProduto = document.getElementById("form-admin-produto");
if (formAdminProduto) formAdminProduto.addEventListener("submit", salvarProdutoAdmin);
inicializarAdmin();
