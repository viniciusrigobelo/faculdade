// =========================
// SEGURANÇA — SANITIZAÇÃO XSS
// =========================
function sanitizar(str) {
  if (typeof str !== "string") return String(str);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// =========================
// SEGURANÇA — HASH SHA-256
// =========================
async function hashSenha(senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha + "cgs@salt#2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// =========================
// SEGURANÇA — LIMITE DE TENTATIVAS
// =========================
function verificarTentativas(chave) {
  const dados = JSON.parse(localStorage.getItem(chave)) || { tentativas: 0, bloqueadoAte: 0 };
  if (Date.now() < dados.bloqueadoAte) {
    const seg = Math.ceil((dados.bloqueadoAte - Date.now()) / 1000);
    return { bloqueado: true, mensagem: `Muitas tentativas. Tente novamente em ${seg}s.` };
  }
  return { bloqueado: false, dados };
}

function registrarTentativaFalha(chave) {
  const dados = JSON.parse(localStorage.getItem(chave)) || { tentativas: 0, bloqueadoAte: 0 };
  dados.tentativas += 1;
  if (dados.tentativas >= 5) {
    dados.bloqueadoAte = Date.now() + 60000; // bloqueia 60s
    dados.tentativas = 0;
  }
  localStorage.setItem(chave, JSON.stringify(dados));
}

function limparTentativas(chave) {
  localStorage.removeItem(chave);
}

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
// MODAL PERFIL
// =========================

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
    if (linkPerfil) {
      const inPages = window.location.pathname.replace(/\\/g, '/').includes('/pages/');
      linkPerfil.href = inPages ? "perfil.html" : "pages/perfil.html";
    }
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
      <img src="../${sanitizar(item.img)}" alt="${sanitizar(item.nome)}" class="carrinho-item__img">
      <div class="carrinho-item__info">
        <h3>${sanitizar(item.nome)}</h3>
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

// =========================
// CEP — AUTO PREENCHIMENTO
// =========================
function buscarCepAutoFill(cep, campos, msgId) {
  const msg = document.getElementById(msgId);
  if (msg) { msg.textContent = "Buscando endereço..."; msg.style.color = "#888"; }

  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(r => r.json())
    .then(data => {
      if (data.erro) {
        if (msg) { msg.textContent = "CEP não encontrado."; msg.style.color = "#e74c3c"; }
        return;
      }
      const setField = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };
      setField(campos.rua,    data.logradouro || "");
      setField(campos.bairro, data.bairro     || "");
      setField(campos.cidade, data.localidade || "");
      setField(campos.estado, data.uf         || "");
      if (msg) {
        msg.textContent = `📍 ${data.localidade} — ${data.uf}`;
        msg.style.color = "#27ae60";
      }
    })
    .catch(() => {
      if (msg) { msg.textContent = "Erro ao buscar o CEP."; msg.style.color = "#e74c3c"; }
    });
}

// =========================
// FRETE
// =========================
let freteValor = 0;

function calcularFrete() {
  const input = document.getElementById("frete-cep");
  const msg   = document.getElementById("frete-msg");
  const opcoes = document.getElementById("frete-opcoes");
  if (!input) return;

  const cep = input.value.replace(/\D/g, "");
  if (cep.length !== 8) {
    msg.textContent = "CEP inválido. Digite 8 números.";
    msg.style.color = "#e74c3c";
    return;
  }

  msg.textContent = "Consultando CEP...";
  msg.style.color = "#888";
  opcoes.style.display = "none";

  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(r => r.json())
    .then(data => {
      if (data.erro) {
        msg.textContent = "CEP não encontrado.";
        msg.style.color = "#e74c3c";
        return;
      }

      // Formata CEP no input
      input.value = cep.replace(/(\d{5})(\d{3})/, "$1-$2");

      // Calcula frete baseado na UF
      const uf = data.uf;
      const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
      const pesoTotal = carrinho.reduce((sum, item) => sum + item.qtd, 0);

      const { pac, sedex } = calcularValoresFrete(uf, pesoTotal);

      document.getElementById("frete-pac-preco").textContent  = pac.preco === 0 ? "GRÁTIS" : `R$ ${pac.preco.toFixed(2).replace(".", ",")}`;
      document.getElementById("frete-pac-prazo").textContent  = `${pac.prazo} dias úteis`;
      document.getElementById("frete-sedex-preco").textContent = `R$ ${sedex.preco.toFixed(2).replace(".", ",")}`;
      document.getElementById("frete-sedex-prazo").textContent = `${sedex.prazo} dias úteis`;

      msg.textContent = `📍 ${data.localidade} — ${uf}`;
      msg.style.color = "#27ae60";
      opcoes.style.display = "flex";

      // Listeners nas opções
      document.querySelectorAll('input[name="frete"]').forEach(radio => {
        radio.onchange = function() {
          freteValor = this.value === "pac" ? pac.preco : sedex.preco;
          document.getElementById("frete-valor").textContent = freteValor === 0 ? "GRÁTIS" : `R$ ${freteValor.toFixed(2).replace(".", ",")}`;
          document.getElementById("linha-frete").style.display = "flex";
          atualizarTotalComDesconto();
        };
      });
    })
    .catch(() => {
      msg.textContent = "Erro ao consultar o CEP. Tente novamente.";
      msg.style.color = "#e74c3c";
    });
}

function calcularValoresFrete(uf, qtdItens) {
  // Regiões Sul/Sudeste: frete mais barato e rápido
  const sudeste = ["SP", "RJ", "MG", "ES"];
  const sul     = ["PR", "SC", "RS"];
  const co      = ["GO", "MT", "MS", "DF"];
  const norte   = ["AM", "PA", "AC", "RO", "RR", "AP", "TO"];
  const nordeste = ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"];

  const base = 1 + (qtdItens - 1) * 0.5; // peso base em kg simulado

  let pac, sedex;

  if (sudeste.includes(uf)) {
    pac   = { preco: base <= 1 ? 0 : parseFloat((base * 4.5).toFixed(2)), prazo: 5 };
    sedex = { preco: parseFloat((base * 14).toFixed(2)), prazo: 1 };
  } else if (sul.includes(uf)) {
    pac   = { preco: parseFloat((base * 6).toFixed(2)), prazo: 6 };
    sedex = { preco: parseFloat((base * 18).toFixed(2)), prazo: 2 };
  } else if (co.includes(uf)) {
    pac   = { preco: parseFloat((base * 8).toFixed(2)), prazo: 8 };
    sedex = { preco: parseFloat((base * 22).toFixed(2)), prazo: 2 };
  } else if (nordeste.includes(uf)) {
    pac   = { preco: parseFloat((base * 10).toFixed(2)), prazo: 10 };
    sedex = { preco: parseFloat((base * 26).toFixed(2)), prazo: 3 };
  } else if (norte.includes(uf)) {
    pac   = { preco: parseFloat((base * 13).toFixed(2)), prazo: 14 };
    sedex = { preco: parseFloat((base * 32).toFixed(2)), prazo: 4 };
  } else {
    pac   = { preco: parseFloat((base * 8).toFixed(2)), prazo: 9 };
    sedex = { preco: parseFloat((base * 22).toFixed(2)), prazo: 3 };
  }

  return { pac, sedex };
}

// Formata CEP enquanto digita
document.addEventListener("DOMContentLoaded", () => {
  // --- CEP no carrinho (frete) ---
  const cepInput = document.getElementById("frete-cep");
  if (cepInput) {
    const u = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (u) {
      const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
      const dados = usuarios.find(x => x.email === u.email);
      if (dados?.endereco?.cep) {
        cepInput.value = dados.endereco.cep;
        // Calcula frete automaticamente com o CEP salvo
        calcularFrete();
      }
    }
    cepInput.addEventListener("input", function() {
      let v = this.value.replace(/\D/g, "").slice(0, 8);
      if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
      this.value = v;
    });
    cepInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") { e.preventDefault(); calcularFrete(); }
    });
  }

  // --- CEP no cadastro ---
  const cepCadastro = document.getElementById("cep");
  if (cepCadastro) {
    cepCadastro.addEventListener("input", function() {
      let v = this.value.replace(/\D/g, "").slice(0, 8);
      if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
      this.value = v;
      if (v.replace(/\D/g, "").length === 8) {
        buscarCepAutoFill(v.replace(/\D/g, ""), {
          rua: "rua", bairro: "bairro", cidade: "cidade", estado: "estado"
        }, "cep-msg");
      } else {
        const msg = document.getElementById("cep-msg");
        if (msg) msg.textContent = "";
      }
    });
  }

  // --- CEP no perfil ---
  const cepPerfil = document.getElementById("perfil-cep");
  if (cepPerfil) {
    cepPerfil.addEventListener("input", function() {
      let v = this.value.replace(/\D/g, "").slice(0, 8);
      if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
      this.value = v;
      if (v.replace(/\D/g, "").length === 8) {
        buscarCepAutoFill(v.replace(/\D/g, ""), {
          rua: "perfil-rua", bairro: "perfil-bairro", cidade: "perfil-cidade", estado: "perfil-estado"
        }, "perfil-cep-msg");
      } else {
        const msg = document.getElementById("perfil-cep-msg");
        if (msg) msg.textContent = "";
      }
    });
  }
});

function atualizarTotalComDesconto() {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const subtotal = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
  const desconto = subtotal * (descontoAtivo / 100);
  const total = subtotal - desconto + freteValor;

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

  // Cartão de crédito só disponível para compras acima de R$150
  const radioCartao  = document.querySelector('input[name="pagamento"][value="cartao"]');
  const labelCartao  = radioCartao?.closest(".pagamento-opcao");
  const avisoCartao  = document.getElementById("aviso-cartao");
  const faltam       = 150 - total;

  if (radioCartao) {
    if (total < 150) {
      radioCartao.disabled = true;
      labelCartao.classList.add("pagamento-opcao--bloqueada");
      if (avisoCartao) avisoCartao.textContent =
        `Adicione mais R$ ${faltam.toFixed(2).replace(".", ",")} para pagar com cartão.`;
    } else {
      radioCartao.disabled = false;
      labelCartao.classList.remove("pagamento-opcao--bloqueada");
      if (avisoCartao) avisoCartao.textContent = "";
    }
  }

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
  if (metodoPagamento.value === "cartao" && metodoPagamento.disabled) {
    mostrarMensagem("Cartão de crédito disponível apenas para compras acima de R$ 150,00!", "erro");
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
    aplicarBusca();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      filtrarProdutos("tudo");
      input.blur();
    }
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

  // Badge de desconto em cada card
  document.querySelectorAll(".card-produto").forEach((card) => {
    const precoOrigEl = card.querySelector(".card-produto__preco h3");
    const precoVendaEl = card.querySelector(".card-produto__preco h2");
    if (!precoOrigEl || !precoVendaEl) return;

    const orig  = parseFloat(precoOrigEl.textContent.replace("R$","").replace(",",".").trim());
    const venda = parseFloat(precoVendaEl.textContent.replace("R$","").replace(",",".").trim());
    if (!orig || orig <= venda) return;

    const pct = Math.round(((orig - venda) / orig) * 100);
    const badge = document.createElement("div");
    badge.className = "card-produto__badge-desconto badge-pct";
    badge.textContent = "-" + pct + "%";
    card.querySelector(".card-produto__imagem").appendChild(badge);
  });

  // Abre modal ao clicar no card
  document.querySelectorAll(".card-produto").forEach((card) => {
    card.addEventListener("click", function (e) {
      if (e.target.closest(".card-produto__btn")) return;
      abrirModalProduto(this);
    });
  });
}

// =========================
// MODAL DETALHE DO PRODUTO
// =========================
let modalQtd = 1;
let modalProdutoAtual = null;

const descricoes = {
  marvel: [
    "Uma história épica do universo Marvel que vai te deixar preso até a última página.",
    "Aventura, ação e heróis incríveis nesta edição imperdível da Marvel.",
    "Os maiores heróis da Marvel em uma saga que marcou gerações de fãs.",
    "Edição especial com arte incrível e roteiro de tirar o fôlego.",
  ],
  dc: [
    "Uma das histórias mais marcantes do universo DC Comics.",
    "Vilões e heróis se enfrentam nesta edição épica da DC.",
    "Mergulhe no universo DC com esta edição repleta de reviravoltas.",
    "Arte e roteiro excepcionais nesta edição que todo fã da DC precisa ter.",
  ],
};

function getDescricao(editora, nome) {
  const lista = descricoes[editora] || descricoes.marvel;
  const idx = nome.length % lista.length;
  return lista[idx];
}

function calcularDesconto(original, venda) {
  if (!original || original <= venda) return 0;
  return Math.round(((original - venda) / original) * 100);
}

function abrirModalProduto(card) {
  const nome     = card.dataset.nome;
  const preco    = parseFloat(card.dataset.preco);
  const img      = card.dataset.img;
  const editora  = card.dataset.editora || "marvel";

  // Pega o preço original do DOM do card (só existe se houver desconto real)
  const precoOrigEl   = card.querySelector(".card-produto__preco h3");
  const precoOrigText = precoOrigEl ? precoOrigEl.textContent.replace("R$","").replace(",",".").trim() : null;
  const precoOriginal = precoOrigText ? parseFloat(precoOrigText) : null;
  const temDesconto   = precoOriginal && precoOriginal > preco;

  modalProdutoAtual = { nome, preco, img, editora, precoOriginal };
  modalQtd = 1;

  // Preenche o modal
  document.getElementById("modal-nome").textContent      = nome;
  document.getElementById("modal-descricao").textContent = getDescricao(editora, nome);
  document.getElementById("modal-img").src               = img;
  document.getElementById("modal-img").alt               = nome;
  document.getElementById("modal-qtd").textContent       = "1";
  document.getElementById("modal-total-preco").textContent =
    "R$ " + preco.toFixed(2).replace(".", ",");

  // Preço original: só exibe se houver desconto real
  const precoOrigRow = document.getElementById("modal-preco-original").closest(".preco-original");
  if (temDesconto) {
    document.getElementById("modal-preco-original").textContent =
      "R$ " + precoOriginal.toFixed(2).replace(".", ",");
    precoOrigRow.style.display = "";
  } else {
    precoOrigRow.style.display = "none";
  }

  document.getElementById("modal-preco-venda").textContent =
    "R$ " + preco.toFixed(2).replace(".", ",");

  const desconto = temDesconto ? calcularDesconto(precoOriginal, preco) : 0;
  const badge = document.getElementById("modal-badge-off");
  badge.textContent   = desconto > 0 ? desconto + "% OFF" : "";
  badge.style.display = desconto > 0 ? "block" : "none";

  document.getElementById("modal-produto").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function fecharModalProduto(e) {
  if (e && e.target !== document.getElementById("modal-produto")) return;
  document.getElementById("modal-produto").style.display = "none";
  document.body.style.overflow = "";
}

function atualizarTotalModal() {
  const total = (modalProdutoAtual.preco * modalQtd).toFixed(2).replace(".", ",");
  document.getElementById("modal-total-preco").textContent = "R$ " + total;
}

function mudarQtdModal(delta) {
  modalQtd = Math.max(1, modalQtd + delta);
  document.getElementById("modal-qtd").textContent = modalQtd;
  atualizarTotalModal();
}

function comprarModal() {
  if (!modalProdutoAtual) return;
  for (let i = 0; i < modalQtd; i++) {
    adicionarAoCarrinho(modalProdutoAtual.nome, modalProdutoAtual.preco, modalProdutoAtual.img);
  }
  fecharModalProduto();
  setTimeout(() => window.location.href = "pages/carrinho.html", 800);
}

function adicionarCarrinhoModal() {
  if (!modalProdutoAtual) return;
  for (let i = 0; i < modalQtd; i++) {
    adicionarAoCarrinho(modalProdutoAtual.nome, modalProdutoAtual.preco, modalProdutoAtual.img);
  }
  fecharModalProduto();
}

function toggleFavorito() {
  if (!modalProdutoAtual) return;
  const btn = document.getElementById("btn-favorito");
  const favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];
  const idx = favoritos.indexOf(modalProdutoAtual.nome);
  if (idx >= 0) {
    favoritos.splice(idx, 1);
    btn.textContent = "♡ Favorito";
    btn.classList.remove("ativo");
  } else {
    favoritos.push(modalProdutoAtual.nome);
    btn.textContent = "♥ Favorito";
    btn.classList.add("ativo");
  }
  localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

function toggleLista() {
  if (!modalProdutoAtual) return;
  const btn = document.getElementById("btn-lista");
  const lista = JSON.parse(localStorage.getItem("listaDesejos")) || [];
  const idx = lista.indexOf(modalProdutoAtual.nome);
  if (idx >= 0) {
    lista.splice(idx, 1);
    btn.textContent = "☆ Lista de Desejos";
    btn.classList.remove("ativo");
    mostrarMensagem("Removido da lista de desejos.");
  } else {
    lista.push(modalProdutoAtual.nome);
    btn.textContent = "★ Lista de Desejos";
    btn.classList.add("ativo");
    mostrarMensagem("Adicionado à lista de desejos!");
  }
  localStorage.setItem("listaDesejos", JSON.stringify(lista));
}

function atualizarEstadoFavorito(nome) {
  const favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];
  const lista = JSON.parse(localStorage.getItem("listaDesejos")) || [];
  const btnFav = document.getElementById("btn-favorito");
  const btnLista = document.getElementById("btn-lista");
  if (btnFav) {
    btnFav.textContent = favoritos.includes(nome) ? "♥ Favorito" : "♡ Favorito";
    favoritos.includes(nome) ? btnFav.classList.add("ativo") : btnFav.classList.remove("ativo");
  }
  if (btnLista) {
    btnLista.textContent = lista.includes(nome) ? "★ Lista de Desejos" : "☆ Lista de Desejos";
    lista.includes(nome) ? btnLista.classList.add("ativo") : btnLista.classList.remove("ativo");
  }
}

// Fechar modais com ESC
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    const modalProduto = document.getElementById("modal-produto");
    if (modalProduto && modalProduto.style.display !== "none") {
      modalProduto.style.display = "none";
      document.body.style.overflow = "";
    }
    const modalPerfil = document.getElementById("modal-perfil");
    if (modalPerfil && modalPerfil.style.display !== "none") {
      modalPerfil.style.display = "none";
      document.body.style.overflow = "";
    }
  }
});

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
  const campoEndereco = document.getElementById("campo-endereco");
  if (tipo === "juridica") {
    if (campoCpf) campoCpf.style.display = "none";
    if (campoCnpj) campoCnpj.style.display = "block";
    if (campoRazao) campoRazao.style.display = "block";
    if (campoEndereco) campoEndereco.style.display = "none";
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

    hashSenha(senha).then(senhaHash => {
      const novoUsuario = { nome: sanitizar(nome), email: sanitizar(email), senha: senhaHash, tipo };

      if (tipo === "juridica") {
        const razao = document.getElementById("razao-social")?.value.trim();
        const cnpj = document.getElementById("cnpj")?.value.trim();
        if (razao) novoUsuario.razaoSocial = sanitizar(razao);
        if (cnpj) novoUsuario.cnpj = sanitizar(cnpj);
      } else {
        const cpf = document.getElementById("cpf")?.value.trim();
        if (cpf) novoUsuario.cpf = sanitizar(cpf);

        novoUsuario.endereco = {
          cep:         sanitizar(document.getElementById("cep")?.value.trim()         || ""),
          rua:         sanitizar(document.getElementById("rua")?.value.trim()         || ""),
          numero:      sanitizar(document.getElementById("numero")?.value.trim()      || ""),
          complemento: sanitizar(document.getElementById("complemento")?.value.trim() || ""),
          bairro:      sanitizar(document.getElementById("bairro")?.value.trim()      || ""),
          cidade:      sanitizar(document.getElementById("cidade")?.value.trim()      || ""),
          estado:      sanitizar(document.getElementById("estado")?.value.trim().toUpperCase() || ""),
        };
      }

      usuarios.push(novoUsuario);
      localStorage.setItem("usuarios", JSON.stringify(usuarios));
      localStorage.setItem("usuarioLogado", JSON.stringify({ nome: novoUsuario.nome, email: novoUsuario.email, tipo }));

      mostrarMensagem("Conta criada com sucesso!");
      setTimeout(() => (window.location.href = "../index.html"), 1500);
    });
  });
}

// =========================
// LOGIN
// =========================
const formLogin = document.getElementById("dados-entrar");

if (formLogin) {
  formLogin.addEventListener("submit", function (e) {
    e.preventDefault();

    const chave = "tentativas_login";
    const status = verificarTentativas(chave);
    if (status.bloqueado) {
      mostrarMensagem(status.mensagem, "erro");
      return;
    }

    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    hashSenha(senha).then(senhaHash => {
      const usuario = usuarios.find((u) => u.email === email && u.senha === senhaHash);

      if (usuario) {
        limparTentativas(chave);
        localStorage.setItem("usuarioLogado", JSON.stringify({ nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }));
        mostrarMensagem("Login realizado com sucesso!");
        setTimeout(() => (window.location.href = "../index.html"), 1500);
      } else {
        registrarTentativaFalha(chave);
        const statusAtual = JSON.parse(localStorage.getItem(chave)) || {};
        const restantes = 5 - (statusAtual.tentativas || 0);
        mostrarMensagem(`E-mail ou senha inválidos! ${restantes > 0 ? restantes + " tentativas restantes." : ""}`, "erro");
      }
    });
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
    const erro  = document.getElementById("admin-login-erro");

    const chave = "tentativas_admin";
    const status = verificarTentativas(chave);
    if (status.bloqueado) {
      erro.textContent = status.mensagem;
      return;
    }

    const user  = document.getElementById("admin-user").value.trim();
    const senha = document.getElementById("admin-senha").value;

    if (user === ADMIN_USER && senha === ADMIN_SENHA) {
      limparTentativas(chave);
      sessionStorage.setItem("adminLogado", "true");
      loginBox.style.display = "none";
      painel.style.display   = "flex";
      carregarPainelAdmin();
    } else {
      registrarTentativaFalha(chave);
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

  const produtosAdmin     = JSON.parse(localStorage.getItem("produtosAdmin"))     || [];
  const produtosVendedor  = JSON.parse(localStorage.getItem("produtosVendedores")) || [];
  // Marca origem para saber qual array atualizar
  const todos = [
    ...produtosAdmin.map(p => ({ ...p, _origem: "admin" })),
    ...produtosVendedor.map(p => ({ ...p, _origem: "vendedor" })),
  ];
  atualizarStats();

  if (todos.length === 0) {
    tbody.innerHTML = "";
    if (vazio) vazio.style.display = "block";
    return;
  }
  if (vazio) vazio.style.display = "none";

  tbody.innerHTML = todos.map(p => `
    <tr>
      <td><img src="../${p.img}" class="admin-tabela__img" onerror="this.src='../img/quadrinhos/batman.png'"></td>
      <td>
        <strong>${p.nome}</strong>
        ${p._origem === "vendedor" ? '<span class="badge-vendedor">Vendedor</span>' : ""}
      </td>
      <td><span class="admin-tabela__badge badge-${p.editora || p.categoria}">${(p.editora || p.categoria || "—").toUpperCase()}</span></td>
      <td><span class="badge-secao">${p.secao || p.categoria || "—"}</span></td>
      <td>
        ${p.precoOriginal ? `<span style="text-decoration:line-through;color:#aaa;font-size:12px">R$${parseFloat(p.precoOriginal).toFixed(2).replace(".",",")}</span><br>` : ""}
        <strong>R$${parseFloat(p.preco).toFixed(2).replace(".",",")}</strong>
      </td>
      <td>
        <div class="admin-tabela__acoes">
          <button class="btn-editar-prod" onclick="editarProduto(${p.id}, '${p._origem}')">Editar</button>
          <button class="btn-excluir-prod" onclick="excluirProduto(${p.id}, '${p._origem}')">Excluir</button>
        </div>
      </td>
    </tr>`).join("");
}

function editarProduto(id, origem) {
  const chave = origem === "vendedor" ? "produtosVendedores" : "produtosAdmin";
  const produtos = JSON.parse(localStorage.getItem(chave)) || [];
  const p = produtos.find(x => x.id === id);
  if (!p) return;

  document.getElementById("admin-prod-id").value             = p.id;
  document.getElementById("admin-prod-nome").value           = p.nome;
  document.getElementById("admin-prod-editora").value        = p.editora || p.categoria || "marvel";
  document.getElementById("admin-prod-preco-original").value = p.precoOriginal || p.preco;
  document.getElementById("admin-prod-preco").value          = p.preco;
  document.getElementById("admin-prod-secao").value          = p.secao || p.categoria || "lancamentos";
  document.getElementById("admin-prod-img").value            = p.img;
  document.getElementById("admin-form-titulo").textContent   = "Editar Produto";
  // Guarda origem no campo oculto para usar no save
  document.getElementById("admin-prod-id").dataset.origem    = origem || "admin";

  const box = document.getElementById("admin-form-produto");
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth" });
}

function excluirProduto(id, origem) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;
  const chave = origem === "vendedor" ? "produtosVendedores" : "produtosAdmin";
  const produtos = JSON.parse(localStorage.getItem(chave)) || [];
  localStorage.setItem(chave, JSON.stringify(produtos.filter(p => p.id !== id)));
  carregarTabelaProdutos();
  mostrarMensagem("Produto excluído.");
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

  const origem = document.getElementById("admin-prod-id").dataset.origem || "admin";
  const chave  = (id && origem === "vendedor") ? "produtosVendedores" : "produtosAdmin";
  const produtos = JSON.parse(localStorage.getItem(chave)) || [];

  if (id) {
    const idx = produtos.findIndex(p => p.id === parseInt(id));
    if (idx >= 0) {
      produtos[idx] = { ...produtos[idx], nome, editora, precoOriginal: parseFloat(precoOriginal), preco: parseFloat(preco), secao, img };
    }
  } else {
    produtos.push({ id: Date.now(), nome, editora, precoOriginal: parseFloat(precoOriginal), preco: parseFloat(preco), secao, img });
  }

  localStorage.setItem(chave, JSON.stringify(produtos));
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
      <td>
        <div class="admin-tabela__acoes">
          <button class="btn-editar-prod" onclick="editarUsuarioAdmin('${u.email}')">Editar</button>
          <button class="btn-excluir-prod" onclick="excluirUsuarioAdmin('${u.email}')">Excluir</button>
        </div>
      </td>
    </tr>`).join("");
}

function editarUsuarioAdmin(email) {
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const u = usuarios.find(x => x.email === email);
  if (!u) return;

  const end = u.endereco || {};
  document.getElementById("admin-user-email-original").value = u.email;
  document.getElementById("admin-user-nome").value  = u.nome  || "";
  document.getElementById("admin-user-email").value = u.email || "";
  document.getElementById("admin-user-tipo").value  = u.tipo  || "fisica";
  document.getElementById("admin-user-cpf").value   = u.cpf   || "";
  document.getElementById("admin-user-razao").value = u.razaoSocial || "";
  document.getElementById("admin-user-cnpj").value  = u.cnpj  || "";
  document.getElementById("admin-user-cep").value         = end.cep         || "";
  document.getElementById("admin-user-rua").value         = end.rua         || "";
  document.getElementById("admin-user-numero").value      = end.numero      || "";
  document.getElementById("admin-user-complemento").value = end.complemento || "";
  document.getElementById("admin-user-bairro").value      = end.bairro      || "";
  document.getElementById("admin-user-cidade").value      = end.cidade      || "";
  document.getElementById("admin-user-estado").value      = end.estado      || "";

  // Mostra senha atual mascarada
  const campoSenhaAtual = document.getElementById("admin-user-senha-atual");
  if (campoSenhaAtual) {
    campoSenhaAtual.value = u.senha ? "••••••••" : "";
  }
  document.getElementById("admin-user-senha-nova").value = "";
  document.getElementById("admin-user-senha-confirmar").value = "";

  toggleCamposUsuarioAdmin();

  const box = document.getElementById("admin-form-usuario");
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth" });
}

function toggleCamposUsuarioAdmin() {
  const tipo     = document.getElementById("admin-user-tipo")?.value;
  const campoCpf = document.getElementById("admin-user-campo-cpf");
  const campoRazao    = document.getElementById("admin-user-campo-razao");
  const campoEndereco = document.getElementById("admin-user-campo-endereco");
  if (!campoCpf) return;
  if (tipo === "juridica") {
    campoCpf.style.display      = "none";
    campoRazao.style.display    = "";
    campoEndereco.style.display = "none";
  } else {
    campoCpf.style.display      = "";
    campoRazao.style.display    = "none";
    campoEndereco.style.display = "";
  }
}

function fecharFormUsuario() {
  const box = document.getElementById("admin-form-usuario");
  if (box) { box.style.display = "none"; document.getElementById("form-admin-usuario").reset(); }
}

function salvarEdicaoUsuario(e) {
  e.preventDefault();
  const emailOriginal = document.getElementById("admin-user-email-original").value;
  const novoNome  = document.getElementById("admin-user-nome").value.trim();
  const novoEmail = document.getElementById("admin-user-email").value.trim().toLowerCase();
  const tipo      = document.getElementById("admin-user-tipo").value;
  const senhaNova      = document.getElementById("admin-user-senha-nova").value;
  const senhaConfirmar = document.getElementById("admin-user-senha-confirmar").value;

  if (!novoNome || !novoEmail) { mostrarMensagem("Preencha nome e e-mail!", "erro"); return; }

  if (senhaNova) {
    if (senhaNova.length < 6) { mostrarMensagem("A senha deve ter pelo menos 6 caracteres!", "erro"); return; }
    if (senhaNova !== senhaConfirmar) { mostrarMensagem("As senhas não coincidem!", "erro"); return; }
  }

  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const idx = usuarios.findIndex(x => x.email === emailOriginal);
  if (idx === -1) { mostrarMensagem("Usuário não encontrado!", "erro"); return; }

  usuarios[idx].nome  = novoNome;
  usuarios[idx].email = novoEmail;
  usuarios[idx].tipo  = tipo;

  if (tipo === "juridica") {
    usuarios[idx].razaoSocial = document.getElementById("admin-user-razao").value.trim();
    usuarios[idx].cnpj        = document.getElementById("admin-user-cnpj").value.trim();
    delete usuarios[idx].cpf;
    delete usuarios[idx].endereco;
  } else {
    usuarios[idx].cpf = document.getElementById("admin-user-cpf").value.trim();
    usuarios[idx].endereco = {
      cep:         document.getElementById("admin-user-cep").value.trim(),
      rua:         document.getElementById("admin-user-rua").value.trim(),
      numero:      document.getElementById("admin-user-numero").value.trim(),
      complemento: document.getElementById("admin-user-complemento").value.trim(),
      bairro:      document.getElementById("admin-user-bairro").value.trim(),
      cidade:      document.getElementById("admin-user-cidade").value.trim(),
      estado:      document.getElementById("admin-user-estado").value.trim().toUpperCase(),
    };
    delete usuarios[idx].razaoSocial;
    delete usuarios[idx].cnpj;
  }

  const salvar = () => {
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    const logado = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (logado && logado.email === emailOriginal) {
      localStorage.setItem("usuarioLogado", JSON.stringify({ nome: novoNome, email: novoEmail, tipo }));
    }
    fecharFormUsuario();
    carregarUsuariosAdmin();
    atualizarStats();
    document.getElementById("admin-user-senha-nova").value = "";
    document.getElementById("admin-user-senha-confirmar").value = "";
    mostrarMensagem("Usuário atualizado com sucesso!");
  };

  if (senhaNova) {
    hashSenha(senhaNova).then(hash => {
      usuarios[idx].senha = hash;
      salvar();
    });
  } else {
    salvar();
  }
}

function excluirUsuarioAdmin(email) {
  if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  localStorage.setItem("usuarios", JSON.stringify(usuarios.filter(u => u.email !== email)));
  carregarUsuariosAdmin();
  atualizarStats();
  mostrarMensagem("Usuário excluído.");
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
  lista.innerHTML = produtos.map((p) => `
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
      <button class="card-produto__btn">+ Adicionar ao Carrinho</button>
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

    card.addEventListener("click", function(e) {
      if (e.target.closest(".card-produto__btn")) return;
      abrirModalProduto(this);
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
// PÁGINA DE PERFIL
// =========================
function inicializarPerfil() {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (!usuarioLogado) { window.location.href = "login.html"; return; }

  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const u = usuarios.find(x => x.email === usuarioLogado.email) || usuarioLogado;

  // Hero
  document.getElementById("perfil-avatar").textContent    = u.nome.charAt(0).toUpperCase();
  document.getElementById("perfil-hero-nome").textContent = u.nome;
  document.getElementById("perfil-hero-tipo").textContent =
    u.tipo === "juridica" ? "Pessoa Jurídica" : "Pessoa Física";

  // Preenche campos comuns
  document.getElementById("perfil-nome-input").value  = u.nome  || "";
  document.getElementById("perfil-email-input").value = u.email || "";

  // Campos por tipo
  if (u.tipo === "juridica") {
    document.getElementById("campo-cpf-perfil").style.display   = "none";
    document.getElementById("campo-razao-perfil").style.display = "";
    document.getElementById("campo-cnpj-perfil").style.display  = "";
    document.getElementById("perfil-razao-input").value = u.razaoSocial || "";
    document.getElementById("perfil-cnpj-input").value  = u.cnpj        || "";
  } else {
    document.getElementById("perfil-cpf-input").value = u.cpf || "";
    // Mostra endereço e preenche
    document.getElementById("card-endereco").style.display = "";
    const end = u.endereco || {};
    document.getElementById("perfil-cep").value         = end.cep         || "";
    document.getElementById("perfil-rua").value         = end.rua         || "";
    document.getElementById("perfil-numero").value      = end.numero      || "";
    document.getElementById("perfil-complemento").value = end.complemento || "";
    document.getElementById("perfil-bairro").value      = end.bairro      || "";
    document.getElementById("perfil-cidade").value      = end.cidade      || "";
    document.getElementById("perfil-estado").value      = end.estado      || "";
  }

  // Submit único — dados + endereço + senha (opcional)
  document.getElementById("form-perfil").addEventListener("submit", function(e) {
    e.preventDefault();

    const novoNome  = document.getElementById("perfil-nome-input").value.trim();
    const novoEmail = document.getElementById("perfil-email-input").value.trim().toLowerCase();

    if (!novoNome)  { mostrarMensagem("Informe seu nome!", "erro"); return; }
    if (!novoEmail) { mostrarMensagem("Informe seu e-mail!", "erro"); return; }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const idx = usuarios.findIndex(x => x.email === usuarioLogado.email);
    if (idx === -1) { mostrarMensagem("Usuário não encontrado!", "erro"); return; }

    usuarios[idx].nome  = novoNome;
    usuarios[idx].email = novoEmail;

    if (u.tipo === "juridica") {
      usuarios[idx].razaoSocial = document.getElementById("perfil-razao-input").value.trim();
      usuarios[idx].cnpj        = document.getElementById("perfil-cnpj-input").value.trim();
    } else {
      usuarios[idx].cpf = document.getElementById("perfil-cpf-input").value.trim();
      usuarios[idx].endereco = {
        cep:         document.getElementById("perfil-cep").value.trim(),
        rua:         document.getElementById("perfil-rua").value.trim(),
        numero:      document.getElementById("perfil-numero").value.trim(),
        complemento: document.getElementById("perfil-complemento").value.trim(),
        bairro:      document.getElementById("perfil-bairro").value.trim(),
        cidade:      document.getElementById("perfil-cidade").value.trim(),
        estado:      document.getElementById("perfil-estado").value.trim().toUpperCase(),
      };
    }

    // Senha — só altera se preencheu a senha atual
    const senhaAtual    = document.getElementById("perfil-senha-atual").value;
    const senhaNova     = document.getElementById("perfil-senha-nova").value;
    const senhaConfirm  = document.getElementById("perfil-senha-confirmar").value;

    const salvarDados = () => {
      localStorage.setItem("usuarios", JSON.stringify(usuarios));
      localStorage.setItem("usuarioLogado", JSON.stringify({
        nome: novoNome, email: novoEmail, tipo: usuarios[idx].tipo
      }));
      document.getElementById("perfil-hero-nome").textContent = novoNome;
      document.getElementById("perfil-avatar").textContent    = novoNome.charAt(0).toUpperCase();
      mostrarMensagem("Alterações salvas com sucesso!");
    };

    if (senhaAtual) {
      if (senhaNova.length < 6) {
        mostrarMensagem("A nova senha deve ter ao menos 6 caracteres!", "erro"); return;
      }
      if (senhaNova !== senhaConfirm) {
        mostrarMensagem("As senhas não coincidem!", "erro"); return;
      }
      hashSenha(senhaAtual).then(hashAtual => {
        if (usuarios[idx].senha !== hashAtual) {
          mostrarMensagem("Senha atual incorreta!", "erro"); return;
        }
        hashSenha(senhaNova).then(hashNova => {
          usuarios[idx].senha = hashNova;
          salvarDados();
        });
      });
    } else {
      salvarDados();
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
  inicializarBotoesCarrinho();
}

if (document.getElementById("lista-meus-produtos")) {
  inicializarVender();
}

if (document.getElementById("form-perfil")) {
  inicializarPerfil();
}

// Admin
const formAdminProduto = document.getElementById("form-admin-produto");
if (formAdminProduto) formAdminProduto.addEventListener("submit", salvarProdutoAdmin);
inicializarAdmin();

// =========================
// ANIMAÇÕES
// =========================
(function inicializarAnimacoes() {

  // --- Scroll reveal com IntersectionObserver ---
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visivel");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  // Títulos de seção
  document.querySelectorAll(".titulo-secao").forEach(el => {
    el.classList.add("animar", "animar-up");
    observer.observe(el);
  });

  // Cards com stagger
  document.querySelectorAll(".lista-cards").forEach(lista => {
    lista.querySelectorAll(".card-produto").forEach((card, i) => {
      card.classList.add("animar", "animar-up");
      const delay = Math.min(i, 7) + 1;
      card.classList.add(`animar-delay-${delay}`);
      observer.observe(card);
    });
  });

  // Divisores
  document.querySelectorAll(".divisor").forEach(el => {
    el.classList.add("animar", "animar-fade");
    observer.observe(el);
  });

  // --- Ripple em todos os botões ---
  document.addEventListener("click", function(e) {
    const btn = e.target.closest("button, .btn-comprar-modal, .btn-carrinho-modal, .cadastro-btn, .perfil-btn-salvar");
    if (!btn) return;

    const circle = document.createElement("span");
    circle.classList.add("ripple-effect");
    const rect = btn.getBoundingClientRect();
    circle.style.left = (e.clientX - rect.left) + "px";
    circle.style.top  = (e.clientY - rect.top)  + "px";
    btn.style.position = "relative";
    btn.style.overflow = "hidden";
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  });

})();
