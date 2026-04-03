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
  const perfilNome = document.getElementById("perfil-nome");
  const linkPerfil = document.getElementById("link-perfil");

  if (usuarioLogado) {
    const primeiroNome = usuarioLogado.nome.split(" ")[0];
    if (perfilNome) perfilNome.textContent = primeiroNome;
    if (linkPerfil) linkPerfil.href = "#";
    if (liLogout) liLogout.style.display = "inline-block";
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

  const total = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
  if (resumo) {
    resumo.style.display = "block";
    const totalEl = document.getElementById("total-valor");
    if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
  }
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

function finalizarCompra() {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (!usuarioLogado) {
    mostrarMensagem("Faça login para finalizar sua compra!", "erro");
    setTimeout(() => (window.location.href = "login.html"), 1500);
    return;
  }

  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  if (carrinho.length === 0) return;

  const total = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
  const agora = new Date();
  const pedido = {
    id: agora.getTime(),
    numero: "CGS-" + agora.getTime().toString().slice(-6),
    data: agora.toLocaleDateString("pt-BR"),
    dataISO: agora.toISOString(),
    email: usuarioLogado.email,
    itens: JSON.parse(JSON.stringify(carrinho)),
    total,
    status: "concluido",
  };

  const pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];
  pedidos.unshift(pedido); // mais recente primeiro
  localStorage.setItem("pedidos", JSON.stringify(pedidos));

  localStorage.removeItem("carrinho");
  atualizarBadgeCarrinho();
  mostrarMensagem("Pedido #" + pedido.numero + " realizado com sucesso!");
  setTimeout(() => renderizarCarrinho(), 500);
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
    } else if (filtro === "prevenda" || filtro === "especiais") {
      visivel = false;
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
const formCadastro = document.getElementById("form-cadastro");

if (formCadastro) {
  formCadastro.addEventListener("submit", function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    if (!nome) {
      mostrarMensagem("Informe seu nome!", "erro");
      return;
    }
    if (senha.length < 6) {
      mostrarMensagem("A senha deve ter pelo menos 6 caracteres!", "erro");
      return;
    }
    if (senha !== confirmarSenha) {
      mostrarMensagem("As senhas não coincidem!", "erro");
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    if (usuarios.find((u) => u.email === email)) {
      mostrarMensagem("Esse e-mail já está cadastrado!", "erro");
      return;
    }

    usuarios.push({ nome, email, senha: btoa(senha) });
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify({ nome, email }));

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
// INICIALIZAÇÃO
// =========================
inicializarHeader();
atualizarBadgeCarrinho();
inicializarFiltros();
inicializarPesquisa();
inicializarBotoesCarrinho();

if (document.getElementById("carrinho-lista")) {
  renderizarCarrinho();
}

if (document.getElementById("pedidos-lista")) {
  renderizarPedidos();
}
