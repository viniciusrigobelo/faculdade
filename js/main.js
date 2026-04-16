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

    // Mostrar "Meus Produtos" só para PJ aprovada
    if (liVender && usuarioLogado.tipo === "juridica") {
      const _usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
      const _u = _usuarios.find(x => x.email === usuarioLogado.email);
      if (_u && _u.status === "aprovado") {
        liVender.style.display = "inline-block";
      }
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
function adicionarAoCarrinho(nome, preco, img, qtd = 1, precoOriginal = null) {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const idx = carrinho.findIndex((item) => item.nome === nome);
  if (idx >= 0) {
    carrinho[idx].qtd += qtd;
  } else {
    const item = { nome, preco: parseFloat(preco), img, qtd };
    if (precoOriginal && parseFloat(precoOriginal) > parseFloat(preco)) {
      item.precoOriginal = parseFloat(precoOriginal);
    }
    carrinho.push(item);
  }
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  atualizarBadgeCarrinho();
  const nomeResumido = nome.length > 35 ? nome.substring(0, 35) + "..." : nome;
  const sufixo = qtd > 1 ? ` (${qtd}x)` : "";
  mostrarMensagem(`"${nomeResumido}"${sufixo} adicionado ao carrinho!`);
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
    .map((item, idx) => {
      const temDesconto = item.precoOriginal && item.precoOriginal > item.preco;
      const pct = temDesconto ? Math.round((1 - item.preco / item.precoOriginal) * 100) : 0;
      const precoHtml = temDesconto
        ? `<span class="carrinho-item__preco-orig">R$ ${item.precoOriginal.toFixed(2).replace(".", ",")}</span>
           <span class="carrinho-item__preco carrinho-item__preco--desconto">R$ ${item.preco.toFixed(2).replace(".", ",")} <span class="carrinho-item__badge-desc">-${pct}%</span></span>`
        : `<span class="carrinho-item__preco">R$ ${item.preco.toFixed(2).replace(".", ",")}</span>`;
      return `
    <div class="carrinho-item${temDesconto ? " carrinho-item--desconto" : ""}">
      <img src="../${sanitizar(item.img)}" alt="${sanitizar(item.nome)}" class="carrinho-item__img">
      <div class="carrinho-item__info">
        <h3>${sanitizar(item.nome)}</h3>
        ${precoHtml}
      </div>
      <div class="carrinho-item__qtd">
        <button class="btn-qtd" onclick="alterarQtd(${idx}, -1)">−</button>
        <span>${item.qtd}</span>
        <button class="btn-qtd" onclick="alterarQtd(${idx}, 1)">+</button>
      </div>
      <span class="carrinho-item__subtotal">R$ ${(item.preco * item.qtd).toFixed(2).replace(".", ",")}</span>
      <button class="carrinho-item__remover" onclick="removerItem(${idx})" title="Remover">✕</button>
    </div>`;
    })
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

  // Bloqueia cupom se algum item do carrinho já tem desconto
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const temItemComDesconto = carrinho.some(item => item.precoOriginal && item.precoOriginal > item.preco);
  if (temItemComDesconto) {
    msg.textContent = "Cupons não são válidos para itens já em promoção.";
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

const FRETE_GRATIS_MINIMO = 200;

function calcularValoresFrete(uf, qtdItens) {
  // Frete grátis para compras acima de R$ 200
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const subtotal = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
  if (subtotal >= FRETE_GRATIS_MINIMO) {
    return {
      pac:   { preco: 0, prazo: calcularPrazoPac(uf) },
      sedex: { preco: 0, prazo: calcularPrazoSedex(uf) }
    };
  }

  // Regiões Sul/Sudeste: frete mais barato e rápido
  const sudeste  = ["SP", "RJ", "MG", "ES"];
  const sul      = ["PR", "SC", "RS"];
  const co       = ["GO", "MT", "MS", "DF"];
  const norte    = ["AM", "PA", "AC", "RO", "RR", "AP", "TO"];
  const nordeste = ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"];

  const base = 1 + (qtdItens - 1) * 0.5;

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

function calcularPrazoPac(uf) {
  const prazoMap = { SP:5,RJ:5,MG:5,ES:5, PR:6,SC:6,RS:6, GO:8,MT:8,MS:8,DF:8, BA:10,SE:10,AL:10,PE:10,PB:10,RN:10,CE:10,PI:10,MA:10, AM:14,PA:14,AC:14,RO:14,RR:14,AP:14,TO:14 };
  return prazoMap[uf] || 9;
}

function calcularPrazoSedex(uf) {
  const prazoMap = { SP:1,RJ:1,MG:1,ES:1, PR:2,SC:2,RS:2, GO:2,MT:2,MS:2,DF:2, BA:3,SE:3,AL:3,PE:3,PB:3,RN:3,CE:3,PI:3,MA:3, AM:4,PA:4,AC:4,RO:4,RR:4,AP:4,TO:4 };
  return prazoMap[uf] || 3;
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

  // Frete grátis acima de R$ 200
  const freteEfetivo = subtotal >= FRETE_GRATIS_MINIMO ? 0 : freteValor;
  if (subtotal >= FRETE_GRATIS_MINIMO && freteValor > 0) {
    freteValor = 0;
    const freteEl = document.getElementById("frete-valor");
    if (freteEl) freteEl.textContent = "GRÁTIS";
    // Atualiza os preços exibidos nas opções
    const pacPreco   = document.getElementById("frete-pac-preco");
    const sedexPreco = document.getElementById("frete-sedex-preco");
    if (pacPreco)   pacPreco.textContent   = "GRÁTIS";
    if (sedexPreco) sedexPreco.textContent = "GRÁTIS";
  }

  const total = subtotal - desconto + freteEfetivo;

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

  // Banners de frete grátis
  const bannerGratis    = document.getElementById("banner-frete-gratis");
  const bannerProgresso = document.getElementById("banner-frete-progresso");
  if (bannerGratis && bannerProgresso) {
    if (subtotal >= FRETE_GRATIS_MINIMO) {
      bannerGratis.style.display = "block";
      bannerProgresso.style.display = "none";
    } else {
      bannerGratis.style.display = "none";
      const faltam = FRETE_GRATIS_MINIMO - subtotal;
      bannerProgresso.style.display = "block";
      bannerProgresso.textContent = `🚚 Faltam R$ ${faltam.toFixed(2).replace(".", ",")} para frete GRÁTIS!`;
    }
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

  const subtotal = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
  const total = subtotal - subtotal * (descontoAtivo / 100) + freteValor;
  const modalTotal = document.getElementById("modal-total");
  if (modalTotal) modalTotal.textContent = "R$ " + total.toFixed(2).replace(".", ",");

  // Resetar para step 1
  _mostrarStep(1);
  document.querySelectorAll('input[name="pagamento"]').forEach(r => r.checked = false);

  // Cartão sempre disponível
  const radioCartao = document.querySelector('input[name="pagamento"][value="cartao"]');
  const labelCartao = radioCartao?.closest(".pagamento-opcao");
  if (radioCartao) {
    radioCartao.disabled = false;
    labelCartao?.classList.remove("pagamento-opcao--bloqueada");
  }

  const modal = document.getElementById("modal-pagamento");
  if (modal) modal.style.display = "flex";
}

function _mostrarStep(n) {
  [1, 2, 3].forEach(i => {
    const el = document.getElementById("pag-step-" + i);
    if (el) el.style.display = i === n ? "block" : "none";
  });
  const cardStep = document.getElementById("pag-step-card");
  if (cardStep) cardStep.style.display = n === "card" ? "block" : "none";
  const boletoStep = document.getElementById("pag-step-boleto");
  if (boletoStep) boletoStep.style.display = n === "boleto" ? "block" : "none";
}

function fecharModalPagamento() {
  const modal = document.getElementById("modal-pagamento");
  if (modal) modal.style.display = "none";
  _mostrarStep(1);
}

function voltarStep1() {
  _mostrarStep(1);
}

function confirmarPagamento() {
  const metodoPagamento = document.querySelector('input[name="pagamento"]:checked');
  if (!metodoPagamento) {
    mostrarMensagem("Selecione uma forma de pagamento!", "erro");
    return;
  }
  // PIX → vai para etapa 2 (formulário de dados)
  if (metodoPagamento.value === "pix") {
    _abrirFormPix();
    return;
  }

  // Cartão → vai para etapa do cartão
  if (metodoPagamento.value === "cartao") {
    _abrirFormCartao();
    return;
  }

  // Boleto → formulário de dados
  if (metodoPagamento.value === "boleto") {
    _abrirFormBoleto();
    return;
  }

  // Outros métodos → confirma direto
  _finalizarPedido(metodoPagamento.value);
}

function _abrirFormPix() {
  // Exibe o total na etapa 2
  const totalTexto = document.getElementById("modal-total")?.textContent || "R$ 0,00";
  const el = document.getElementById("pix-total-display");
  if (el) el.textContent = totalTexto;

  // Pré-preenche com dados do usuário logado (se existirem)
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const u = usuarios.find(x => x.email === usuarioLogado?.email) || {};

  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };

  set("pix-nome", u.nome || usuarioLogado?.nome || "");

  // Label e placeholder conforme tipo
  const docLabel = document.getElementById("pix-doc-label");
  const docInput = document.getElementById("pix-doc");
  if (u.tipo === "juridica") {
    if (docLabel) docLabel.textContent = "CNPJ *";
    if (docInput) docInput.placeholder = "00.000.000/0000-00";
    set("pix-doc", u.cnpj || "");
  } else {
    if (docLabel) docLabel.textContent = "CPF *";
    if (docInput) docInput.placeholder = "000.000.000-00";
    set("pix-doc", u.cpf || "");
  }

  // Endereço (só existe para Pessoa Física)
  const end = u.endereco || {};
  set("pix-cep",    end.cep    || "");
  set("pix-rua",    end.rua    || "");
  set("pix-numero", end.numero || "");
  set("pix-bairro", end.bairro || "");
  set("pix-cidade", end.cidade || "");
  set("pix-estado", end.estado || "");

  _mostrarStep(2);

  // Formata CEP enquanto digita
  const cepPix = document.getElementById("pix-cep");
  if (cepPix && !cepPix._pixListener) {
    cepPix._pixListener = true;
    cepPix.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "").slice(0, 8);
      if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
      this.value = v;
    });
  }
}

function gerarQRCodePix(e) {
  e.preventDefault();

  const nome   = document.getElementById("pix-nome").value.trim();
  const doc    = document.getElementById("pix-doc").value.trim();
  const cep    = document.getElementById("pix-cep").value.trim();
  const rua    = document.getElementById("pix-rua").value.trim();
  const numero = document.getElementById("pix-numero").value.trim();
  const bairro = document.getElementById("pix-bairro").value.trim();
  const cidade = document.getElementById("pix-cidade").value.trim();
  const estado = document.getElementById("pix-estado").value.trim().toUpperCase();

  if (!nome || !doc || !cep || !rua || !numero || !bairro || !cidade || !estado) {
    mostrarMensagem("Preencha todos os campos obrigatórios!", "erro");
    return;
  }

  const totalTexto = document.getElementById("pix-total-display")?.textContent || "R$ 0,00";
  const totalNum   = totalTexto.replace("R$", "").replace(",", ".").trim();

  // Monta o payload do QR Code
  const pixPayload =
    `00020126580014BR.GOV.BCB.PIX` +
    `0136comicgeekstore@pix.com.br` +
    `52040000` +
    `5303986` +
    `54${String(totalNum.length).padStart(2,"0")}${totalNum}` +
    `5802BR` +
    `5913ComicGeekStore` +
    `6007${estado}` +
    `62070503***` +
    `6304`;

  // QR Code via API pública (sem backend necessário)
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(pixPayload)}`;

  const img = document.getElementById("pix-qrcode-img");
  if (img) img.src = url;

  const totalFinal = document.getElementById("pix-total-final");
  if (totalFinal) totalFinal.textContent = totalTexto;

  _mostrarStep(3);
}

function copiarChavePix() {
  const chave = document.getElementById("pix-chave-exibida")?.textContent || "";
  navigator.clipboard.writeText(chave).then(() => {
    mostrarMensagem("Chave PIX copiada!");
  }).catch(() => {
    mostrarMensagem("Não foi possível copiar. Copie manualmente: " + chave, "erro");
  });
}

function confirmarPagamentoPix() {
  _finalizarPedido("pix");
}

// =========================
// BOLETO
// =========================

function _abrirFormBoleto() {
  const totalTexto = document.getElementById("modal-total")?.textContent || "R$ 0,00";
  const el = document.getElementById("boleto-total-display");
  if (el) el.textContent = totalTexto;

  // Pré-preenche com dados do usuário logado
  const user = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
  if (user) {
    const nomeEl = document.getElementById("boleto-nome");
    if (nomeEl && !nomeEl.value) nomeEl.value = user.nome || "";
    const cpfEl = document.getElementById("boleto-cpf");
    if (cpfEl && !cpfEl.value && user.cpf) cpfEl.value = user.cpf;
  }

  // Máscara CPF
  const cpfInput = document.getElementById("boleto-cpf");
  if (cpfInput && !cpfInput._bolMask) {
    cpfInput._bolMask = true;
    cpfInput.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "").slice(0, 11);
      if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
      else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
      else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
      this.value = v;
    });
  }

  // Máscara CEP
  const cepInput = document.getElementById("boleto-cep");
  if (cepInput && !cepInput._bolMask) {
    cepInput._bolMask = true;
    cepInput.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "").slice(0, 8);
      if (v.length > 5) v = v.replace(/(\d{5})(\d{1,3})/, "$1-$2");
      this.value = v;
    });
  }

  document.getElementById("boleto-form-section").style.display = "block";
  document.getElementById("boleto-display-section").style.display = "none";
  _mostrarStep("boleto");
}

function gerarBoleto(e) {
  e.preventDefault();

  const nome    = document.getElementById("boleto-nome").value.trim();
  const cpf     = document.getElementById("boleto-cpf").value.trim();
  const cep     = document.getElementById("boleto-cep").value.trim();
  const rua     = document.getElementById("boleto-rua").value.trim();
  const num     = document.getElementById("boleto-numero").value.trim();
  const bairro  = document.getElementById("boleto-bairro").value.trim();
  const cidade  = document.getElementById("boleto-cidade").value.trim();
  const estado  = document.getElementById("boleto-estado").value.trim().toUpperCase();

  // Gera números do boleto
  const r4 = () => String(Math.floor(Math.random() * 9000 + 1000));
  const nossoNum = r4() + r4() + r4();
  const numDoc   = "CGS-" + Date.now().toString().slice(-8);

  // Vencimento: 3 dias úteis
  const hoje = new Date();
  let dias = 0;
  const venc = new Date(hoje);
  while (dias < 3) {
    venc.setDate(venc.getDate() + 1);
    const dow = venc.getDay();
    if (dow !== 0 && dow !== 6) dias++;
  }
  const fmt = (d) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;

  const totalTexto = document.getElementById("boleto-total-display").textContent;

  // Linha digitável realista
  const linhaDigitavel =
    `00190.${r4()}${r4()} ${r4()}${r4()}.${r4()}0 ${r4()}${r4()}.${r4()}1 6 ${nossoNum}`;

  // Preenche o boleto visual
  document.getElementById("boleto-linha-digitavel").textContent = linhaDigitavel;
  document.getElementById("boleto-nosso-numero").textContent = nossoNum;
  document.getElementById("boleto-num-doc").textContent = numDoc;
  document.getElementById("boleto-emissao").textContent = fmt(hoje);
  document.getElementById("boleto-vencimento").textContent = fmt(venc);
  document.getElementById("boleto-valor").textContent = totalTexto;
  document.getElementById("boleto-valor-cobrado").textContent = totalTexto;
  document.getElementById("boleto-pagador-nome").textContent = nome;
  document.getElementById("boleto-pagador-end").textContent =
    `${rua}, ${num} — ${bairro} — ${cidade}/${estado} — CEP: ${cep}`;
  document.getElementById("boleto-pagador-doc").textContent = `CPF: ${cpf}`;

  // Gera barras do código de barras
  _gerarBarrasBoleto(nossoNum);

  // Guarda linha para copiar
  window._boletoLinha = linhaDigitavel;

  document.getElementById("boleto-form-section").style.display = "none";
  document.getElementById("boleto-display-section").style.display = "block";
}

function _gerarBarrasBoleto(seed) {
  const container = document.getElementById("boleto-barcode");
  if (!container) return;
  container.innerHTML = "";
  let n = parseInt(seed.replace(/\D/g, "0").slice(0, 9)) || 123456789;
  for (let i = 0; i < 96; i++) {
    n = (n * 1664525 + 1013904223) & 0x7fffffff;
    const w = (n % 3) + 1;
    const span = document.createElement("span");
    span.className = i % 2 === 0 ? "boleto-bar" : "boleto-bar--space";
    span.style.width = w + "px";
    container.appendChild(span);
  }
}

function copiarLinhaDigitavel() {
  const linha = window._boletoLinha || "";
  if (navigator.clipboard) {
    navigator.clipboard.writeText(linha).then(() => mostrarMensagem("Linha digitável copiada!", "sucesso"));
  } else {
    const ta = document.createElement("textarea");
    ta.value = linha;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    mostrarMensagem("Linha digitável copiada!", "sucesso");
  }
}

function confirmarPagamentoBoleto() {
  _finalizarPedido("boleto");
}

// =========================
// CARTÃO — DETECÇÃO
// =========================
const _BANDEIRAS = [
  { id: "elo",       nome: "Elo",        cor: "#1a1a1a", regex: /^(4011|4312|4389|4514|4576|5067|5090|6362|6363|6516|6550)/ },
  { id: "hipercard", nome: "Hipercard",  cor: "#822124", regex: /^(606282|3841)/ },
  { id: "amex",      nome: "Amex",       cor: "#007bc1", regex: /^3[47]/ },
  { id: "mastercard",nome: "Mastercard", cor: "#2c2c2c", regex: /^(5[1-5]|2[2-7])/ },
  { id: "visa",      nome: "Visa",       cor: "#1a1f71", regex: /^4/ },
];

// BINs de débito conhecidos (Brasil, simplificado)
const _BINS_DEBITO = [
  "4011","4312","4389","4514","4576",   // Elo Débito
  "5067","6362","6363",                 // Elo Débito
  "4002","4003","4009","4360",          // Visa Electron
  "5041","5090",                        // Mastercard Débito
];

function _detectarBandeira(n) {
  const digits = n.replace(/\D/g, "");
  return _BANDEIRAS.find(b => b.regex.test(digits)) || null;
}

function _detectarTipo(n) {
  const digits = n.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return _BINS_DEBITO.some(p => digits.startsWith(p)) ? "debito" : "credito";
}

function _abrirFormCartao() {
  const totalTexto = document.getElementById("modal-total")?.textContent || "R$ 0,00";
  const el = document.getElementById("cartao-total-display");
  if (el) el.textContent = totalTexto;

  // Pré-preenche nome do titular
  const u = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (u) {
    const nomeEl = document.getElementById("cartao-nome");
    if (nomeEl && !nomeEl.value) nomeEl.value = u.nome.toUpperCase();
  }

  // Reset preview
  _atualizarPreviewCartao();
  _mostrarStep("card");

  // ---- Listeners do formulário ----
  const numInput = document.getElementById("cartao-numero");
  const nomeInput = document.getElementById("cartao-nome");
  const valInput = document.getElementById("cartao-validade");
  const cvvInput = document.getElementById("cartao-cvv");

  if (numInput && !numInput._cartaoListener) {
    numInput._cartaoListener = true;

    numInput.addEventListener("input", function () {
      // Formata com espaços a cada 4 dígitos
      let v = this.value.replace(/\D/g, "").slice(0, 16);
      this.value = v.replace(/(.{4})/g, "$1 ").trim();
      _atualizarPreviewCartao();
    });

    nomeInput.addEventListener("input", function () {
      this.value = this.value.toUpperCase();
      _atualizarPreviewCartao();
    });

    valInput.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "").slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
      this.value = v;
      _atualizarPreviewCartao();
    });

    cvvInput.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "").slice(0, 4);
      _atualizarPreviewCartao();
    });

    cvvInput.addEventListener("focus",  () => { document.getElementById("cartao-preview")?.classList.add("virado"); });
    cvvInput.addEventListener("blur",   () => { document.getElementById("cartao-preview")?.classList.remove("virado"); });
  }
}

function _atualizarPreviewCartao() {
  const numero   = (document.getElementById("cartao-numero")?.value   || "").replace(/\D/g, "");
  const nome     = document.getElementById("cartao-nome")?.value      || "";
  const validade = document.getElementById("cartao-validade")?.value  || "";
  const cvv      = document.getElementById("cartao-cvv")?.value       || "";

  const preview  = document.getElementById("cartao-preview");
  const bandeira = _detectarBandeira(numero);
  const tipo     = _detectarTipo(numero);

  // Número formatado no preview
  const blocos = (numero.padEnd(16, "•")).match(/.{1,4}/g) || [];
  const prevNumero = document.getElementById("prev-numero");
  if (prevNumero) prevNumero.textContent = blocos.join(" ");

  // Nome
  const prevNome = document.getElementById("prev-nome");
  if (prevNome) prevNome.textContent = nome || "SEU NOME";

  // Validade
  const prevVal = document.getElementById("prev-validade");
  if (prevVal) prevVal.textContent = validade || "MM/AA";

  // CVV
  const prevCvv = document.getElementById("prev-cvv");
  if (prevCvv) prevCvv.textContent = cvv ? "•".repeat(cvv.length) : "•••";

  // Bandeira no preview e no input
  if (preview) {
    _BANDEIRAS.forEach(b => preview.classList.remove("bandeira-" + b.id));
    if (bandeira) preview.classList.add("bandeira-" + bandeira.id);
  }
  const prevBandeira = document.getElementById("prev-bandeira-nome");
  const inlineBandeira = document.getElementById("cartao-bandeira-inline");
  if (prevBandeira) prevBandeira.textContent = bandeira ? bandeira.nome.toUpperCase() : "";
  if (inlineBandeira) inlineBandeira.textContent = bandeira ? bandeira.nome : "";

  // Tipo (Crédito / Débito) no badge do preview
  const prevTipo = document.getElementById("prev-tipo");
  if (prevTipo) {
    prevTipo.textContent = tipo === "debito" ? "DÉBITO" : tipo === "credito" ? "CRÉDITO" : "";
  }

  // Badge detectado embaixo do campo
  const detectado = document.getElementById("cartao-detectado");
  if (detectado) {
    if (bandeira && tipo) {
      detectado.innerHTML =
        `<span class="badge-bandeira" style="background:${bandeira.cor}">${bandeira.nome}</span>` +
        `<span class="badge-tipo badge-tipo--${tipo}">${tipo === "debito" ? "Débito" : "Crédito"}</span>`;
    } else if (bandeira) {
      detectado.innerHTML =
        `<span class="badge-bandeira" style="background:${bandeira.cor}">${bandeira.nome}</span>`;
    } else {
      detectado.innerHTML = numero.length >= 4
        ? '<span style="color:#aaa;font-size:11px">Bandeira não identificada</span>'
        : "";
    }
  }
}

function confirmarPagamentoCartao(e) {
  e.preventDefault();

  const numero   = document.getElementById("cartao-numero")?.value.replace(/\D/g, "") || "";
  const nome     = document.getElementById("cartao-nome")?.value.trim() || "";
  const validade = document.getElementById("cartao-validade")?.value.trim() || "";
  const cvv      = document.getElementById("cartao-cvv")?.value.trim() || "";

  if (numero.length < 13) { mostrarMensagem("Número de cartão inválido!", "erro"); return; }
  if (!nome)               { mostrarMensagem("Informe o nome do titular!", "erro"); return; }
  if (!/^\d{2}\/\d{2}$/.test(validade)) { mostrarMensagem("Validade inválida! Use MM/AA.", "erro"); return; }
  if (cvv.length < 3)      { mostrarMensagem("CVV inválido!", "erro"); return; }

  // Validade não expirada
  const [mm, aa] = validade.split("/").map(Number);
  const agora = new Date();
  const ano4 = 2000 + aa;
  if (ano4 < agora.getFullYear() || (ano4 === agora.getFullYear() && mm < agora.getMonth() + 1)) {
    mostrarMensagem("Cartão expirado!", "erro"); return;
  }

  const tipo = _detectarTipo(numero);
  const metodo = tipo === "debito" ? "cartao_debito" : "cartao_credito";
  _finalizarPedido(metodo);
}

function _finalizarPedido(metodoPagamento) {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const subtotalPedido = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
  const total = subtotalPedido - subtotalPedido * (descontoAtivo / 100) + freteValor;

  const agora = new Date();
  const pedido = {
    id: agora.getTime(),
    numero: "CGS-" + agora.getTime().toString().slice(-6),
    data: agora.toLocaleDateString("pt-BR"),
    dataISO: agora.toISOString(),
    email: usuarioLogado.email,
    itens: JSON.parse(JSON.stringify(carrinho)),
    total,
    pagamento: metodoPagamento,
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
      const origText = card.querySelector(".card-produto__preco h3")?.textContent?.replace("R$","").replace(",",".").trim();
      const precoOriginal = origText ? parseFloat(origText) : null;
      adicionarAoCarrinho(card.dataset.nome, card.dataset.preco, card.dataset.img, 1, precoOriginal);
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
  adicionarAoCarrinho(modalProdutoAtual.nome, modalProdutoAtual.preco, modalProdutoAtual.img, modalQtd, modalProdutoAtual.precoOriginal);
  fecharModalProduto();
  setTimeout(() => window.location.href = "pages/carrinho.html", 800);
}

function adicionarCarrinhoModal() {
  if (!modalProdutoAtual) return;
  adicionarAoCarrinho(modalProdutoAtual.nome, modalProdutoAtual.preco, modalProdutoAtual.img, modalQtd, modalProdutoAtual.precoOriginal);
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
      const novoUsuario = { nome: sanitizar(nome), email: sanitizar(email), senha: senhaHash, tipo,
        status: tipo === "juridica" ? "pendente" : "aprovado" };

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
  const abas = ["produtos","pedidos","usuarios","aprovacoes"];
  btns[abas.indexOf(aba)]?.classList.add("ativo");

  if (aba === "pedidos")    carregarPedidosAdmin();
  if (aba === "usuarios")   carregarUsuariosAdmin();
  if (aba === "aprovacoes") carregarAprovacoes();
}

function carregarPainelAdmin() {
  carregarTabelaProdutos();
  atualizarStats();
  atualizarBadgeAprovacoes();
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

// ---- APROVAÇÕES PJ ----

function atualizarBadgeAprovacoes() {
  const badge = document.getElementById("badge-pendentes");
  if (!badge) return;
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const count = usuarios.filter(u => u.tipo === "juridica" && u.status === "pendente").length;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

function carregarAprovacoes() {
  const lista = document.getElementById("admin-lista-aprovacoes");
  const vazio = document.getElementById("admin-aprovacoes-vazio");
  if (!lista) return;

  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const pendentes = usuarios.filter(u => u.tipo === "juridica" && u.status === "pendente");

  atualizarBadgeAprovacoes();

  if (pendentes.length === 0) {
    lista.innerHTML = "";
    if (vazio) vazio.style.display = "block";
    return;
  }

  if (vazio) vazio.style.display = "none";
  lista.innerHTML = pendentes.map(u => `
    <div class="aprovacao-card">
      <div class="aprovacao-card__avatar">${u.nome.charAt(0).toUpperCase()}</div>
      <div class="aprovacao-card__info">
        <h3>${u.nome}</h3>
        <p><span class="aprovacao-label">Razão Social</span> ${u.razaoSocial || "—"}</p>
        <p><span class="aprovacao-label">CNPJ</span> ${u.cnpj || "—"}</p>
        <p><span class="aprovacao-label">E-mail</span> ${u.email}</p>
      </div>
      <div class="aprovacao-card__acoes">
        <button class="btn-aprovar-vend" onclick="aprovarVendedor('${u.email}')">✓ Aprovar</button>
        <button class="btn-rejeitar-vend" onclick="rejeitarVendedor('${u.email}')">✕ Rejeitar</button>
      </div>
    </div>
  `).join("");
}

function _sincronizarUsuarioLogado(email, campos) {
  const logado = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (logado && logado.email === email) {
    localStorage.setItem("usuarioLogado", JSON.stringify({ ...logado, ...campos }));
  }
}

function aprovarVendedor(email) {
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const idx = usuarios.findIndex(u => u.email === email);
  if (idx < 0) return;
  usuarios[idx].status = "aprovado";
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  _sincronizarUsuarioLogado(email, { status: "aprovado" });
  mostrarMensagem("Vendedor aprovado com sucesso!");
  carregarAprovacoes();
  atualizarBadgeAprovacoes();
}

function rejeitarVendedor(email) {
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const idx = usuarios.findIndex(u => u.email === email);
  if (idx < 0) return;
  usuarios[idx].status = "rejeitado";
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  _sincronizarUsuarioLogado(email, { status: "rejeitado" });
  mostrarMensagem("Cadastro rejeitado.", "erro");
  carregarAprovacoes();
  atualizarBadgeAprovacoes();
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
  // Recalculate stored discount %
  if (p.precoOriginal && p.precoOriginal > p.preco) {
    const desc = Math.round((1 - p.preco / p.precoOriginal) * 100);
    document.getElementById("admin-prod-desconto").value = desc;
  } else {
    document.getElementById("admin-prod-desconto").value = "";
  }
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

function calcularPrecoAdmin() {
  const original = parseFloat(document.getElementById("admin-prod-preco-original")?.value) || 0;
  const desconto = parseFloat(document.getElementById("admin-prod-desconto")?.value) || 0;
  const campoPreco = document.getElementById("admin-prod-preco");
  if (!campoPreco) return;
  if (original > 0) {
    const final = desconto > 0 ? (original * (1 - desconto / 100)).toFixed(2) : original.toFixed(2);
    campoPreco.value = final;
  }
}

function salvarProdutoAdmin(e) {
  e.preventDefault();
  const id            = document.getElementById("admin-prod-id").value;
  const nome          = document.getElementById("admin-prod-nome").value.trim();
  const editora       = document.getElementById("admin-prod-editora").value;
  const precoOriginal = document.getElementById("admin-prod-preco-original").value;
  const desconto      = parseFloat(document.getElementById("admin-prod-desconto")?.value) || 0;
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
    // Admin está promovendo para PJ: garantir acesso imediato (aprovado)
    if (usuarios[idx].status !== "aprovado") {
      usuarios[idx].status = "aprovado";
    }
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
    // Voltou para PF: remove status PJ para virar perfil normal
    delete usuarios[idx].status;
    delete usuarios[idx].razaoSocial;
    delete usuarios[idx].cnpj;
  }

  const salvar = () => {
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    const logado = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (logado && logado.email === emailOriginal) {
      const usuarioAtualizado = usuarios[idx];
      const dadosLogado = { nome: novoNome, email: novoEmail, tipo };
      if (tipo === "juridica") dadosLogado.status = usuarioAtualizado.status;
      localStorage.setItem("usuarioLogado", JSON.stringify(dadosLogado));
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

    lista.appendChild(card);
  });
}

// =========================
// VENDER — PÁGINA PJ
// =========================
function calcularPrecoVendedor() {
  const original = parseFloat(document.getElementById("prod-preco-original")?.value) || 0;
  const desconto = parseFloat(document.getElementById("prod-desconto")?.value) || 0;
  const campoPreco = document.getElementById("prod-preco");
  if (!campoPreco) return;
  if (original > 0) {
    const final = desconto > 0 ? (original * (1 - desconto / 100)).toFixed(2) : original.toFixed(2);
    campoPreco.value = final;
  } else {
    campoPreco.value = "";
  }
}

function inicializarVender() {
  const conteudo   = document.getElementById("vender-conteudo");
  const bloqueado  = document.getElementById("vender-bloqueado");
  const pendente   = document.getElementById("vender-pendente");
  const rejeitado  = document.getElementById("vender-rejeitado");
  if (!conteudo) return;

  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

  // Não é PJ
  if (!usuarioLogado || usuarioLogado.tipo !== "juridica") {
    if (conteudo) conteudo.style.display = "none";
    if (bloqueado) bloqueado.style.display = "block";
    return;
  }

  // Verifica status de aprovação
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const u = usuarios.find(x => x.email === usuarioLogado.email);
  const status = u?.status || "pendente";

  if (status === "pendente") {
    if (conteudo) conteudo.style.display = "none";
    if (pendente) pendente.style.display = "block";
    return;
  }

  if (status === "rejeitado") {
    if (conteudo) conteudo.style.display = "none";
    if (rejeitado) rejeitado.style.display = "block";
    return;
  }

  renderizarMeusProdutos();

  const formProduto = document.getElementById("form-produto");
  if (formProduto) {
    formProduto.addEventListener("submit", function (e) {
      e.preventDefault();
      const nome          = document.getElementById("prod-nome").value.trim();
      const precoOriginal = parseFloat(document.getElementById("prod-preco-original").value);
      const desconto      = parseFloat(document.getElementById("prod-desconto").value) || 0;
      const preco         = desconto > 0
        ? parseFloat((precoOriginal * (1 - desconto / 100)).toFixed(2))
        : precoOriginal;
      const categoria = document.getElementById("prod-categoria").value;
      const img       = document.getElementById("prod-img").value.trim();
      const descricao = document.getElementById("prod-descricao").value.trim();

      if (!nome || !precoOriginal || !img) {
        mostrarMensagem("Preencha todos os campos obrigatórios!", "erro");
        return;
      }

      const produto = {
        id: Date.now(),
        nome, preco, categoria, img, descricao,
        vendedorEmail: usuarioLogado.email,
        vendedorNome: usuarioLogado.nome
      };
      if (desconto > 0) produto.precoOriginal = precoOriginal;

      const produtos = JSON.parse(localStorage.getItem("produtosVendedores")) || [];
      produtos.push(produto);
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

  const todosPedidos = JSON.parse(localStorage.getItem("pedidos")) || [];

  lista.innerHTML = meus.map(p => {
    let qtdVendida = 0;
    todosPedidos.forEach(pedido => {
      pedido.itens.forEach(item => {
        if (item.nome === p.nome) qtdVendida += item.qtd;
      });
    });
    const vendido = qtdVendida > 0;

    return `
    <div class="meu-produto-card">
      <img src="${p.img}" alt="${p.nome}" class="meu-produto-card__img" onerror="this.src='../img/quadrinhos/batman.png'">
      <div class="meu-produto-card__info">
        <h3>${p.nome}</h3>
        <span>${p.descricao || ""}</span>
      </div>
      <span class="meu-produto-card__categoria">${p.categoria}</span>
      <span class="produto-status ${vendido ? "produto-status--vendido" : "produto-status--ativo"}">${vendido ? "Vendido " + qtdVendida + "x" : "Ativo"}</span>
      <span class="meu-produto-card__preco">R$ ${parseFloat(p.preco).toFixed(2).replace(".", ",")}</span>
      <button class="btn-remover-produto" onclick="removerMeuProduto(${p.id})" title="Remover">✕</button>
    </div>`;
  }).join("");
}

function mostrarAbaVender(aba) {
  document.getElementById("aba-anuncios").style.display = aba === "anuncios" ? "block" : "none";
  document.getElementById("aba-vendas").style.display   = aba === "vendas"   ? "block" : "none";
  document.getElementById("tab-anuncios").classList.toggle("ativo", aba === "anuncios");
  document.getElementById("tab-vendas").classList.toggle("ativo",   aba === "vendas");

  const btnNovo = document.getElementById("btn-novo-produto");
  if (btnNovo) btnNovo.style.display = aba === "anuncios" ? "" : "none";

  const formBox = document.getElementById("form-produto-box");
  if (aba === "vendas" && formBox) formBox.style.display = "none";

  if (aba === "vendas") renderizarMinhasVendas();
}

function renderizarMinhasVendas() {
  const lista = document.getElementById("lista-minhas-vendas");
  if (!lista) return;

  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  const todosProdutos = JSON.parse(localStorage.getItem("produtosVendedores")) || [];
  const meusProdutos  = todosProdutos.filter(p => p.vendedorEmail === usuarioLogado?.email);

  if (meusProdutos.length === 0) {
    lista.innerHTML = `<div class="vender-vazio">Você não tem produtos anunciados ainda.<br>Vá até "Meus Anúncios" e cadastre seu primeiro produto.</div>`;
    return;
  }

  const todosPedidos = JSON.parse(localStorage.getItem("pedidos")) || [];

  const vendas = meusProdutos.map(p => {
    let qtdVendida = 0;
    let receita = 0;
    todosPedidos.forEach(pedido => {
      pedido.itens.forEach(item => {
        if (item.nome === p.nome) {
          qtdVendida += item.qtd;
          receita    += item.preco * item.qtd;
        }
      });
    });
    return { ...p, qtdVendida, receita };
  });

  const totalAnunciados = vendas.length;
  const totalVendidos   = vendas.reduce((s, v) => s + v.qtdVendida, 0);
  const totalReceita    = vendas.reduce((s, v) => s + v.receita, 0);

  const resumoHtml = `
    <div class="vendas-resumo">
      <div class="vendas-resumo__item">
        <span class="vendas-resumo__label">Anunciados</span>
        <span class="vendas-resumo__valor">${totalAnunciados}</span>
      </div>
      <div class="vendas-resumo__item">
        <span class="vendas-resumo__label">Unidades Vendidas</span>
        <span class="vendas-resumo__valor">${totalVendidos}</span>
      </div>
      <div class="vendas-resumo__item">
        <span class="vendas-resumo__label">Receita Total</span>
        <span class="vendas-resumo__valor">R$ ${totalReceita.toFixed(2).replace(".", ",")}</span>
      </div>
    </div>`;

  const vendasHtml = vendas.map(v => `
    <div class="venda-card">
      <img src="${v.img}" alt="${v.nome}" class="venda-card__img" onerror="this.src='../img/quadrinhos/batman.png'">
      <div class="venda-card__info">
        <h3>${v.nome}</h3>
        <span>${v.categoria} &bull; R$ ${parseFloat(v.preco).toFixed(2).replace(".", ",")}</span>
      </div>
      <div class="venda-card__qtd">
        <div class="venda-card__qtd-label">Vendido</div>
        <div class="venda-card__qtd-valor">${v.qtdVendida} un.</div>
      </div>
      <div class="venda-card__receita ${v.qtdVendida === 0 ? "venda-card__receita--zero" : ""}">
        ${v.qtdVendida > 0 ? "R$ " + v.receita.toFixed(2).replace(".", ",") : "—"}
      </div>
      <span class="produto-status ${v.qtdVendida > 0 ? "produto-status--vendido" : "produto-status--ativo"}">
        ${v.qtdVendida > 0 ? "Vendido" : "Ativo"}
      </span>
    </div>`).join("");

  lista.innerHTML = resumoHtml + vendasHtml;
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

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify({
      nome: novoNome, email: novoEmail, tipo: usuarios[idx].tipo
    }));
    document.getElementById("perfil-hero-nome").textContent = novoNome;
    document.getElementById("perfil-avatar").textContent    = novoNome.charAt(0).toUpperCase();
    mostrarMensagem("Alterações salvas com sucesso!");
  });
}

// =========================
// REDEFINIÇÃO DE SENHA — MODAL 2 ETAPAS
// =========================
let _resetEmailAtual = null;

function _injetarModalReset() {
  if (document.getElementById("modal-reset-senha")) return;
  const modal = document.createElement("div");
  modal.id = "modal-reset-senha";
  modal.className = "modal-esqueci-overlay";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="modal-esqueci-box" id="modal-reset-box">
      <button class="modal-esqueci-fechar" onclick="fecharModalResetSenha()">&times;</button>

      <!-- Etapa 1: e-mail -->
      <div id="reset-step-1">
        <h2 class="modal-esqueci-titulo">Redefinir Senha</h2>
        <p class="modal-esqueci-desc">Informe o e-mail cadastrado para continuar.</p>
        <form id="form-reset-email" onsubmit="confirmarEmailReset(event)">
          <label class="modal-esqueci-label">E-mail</label>
          <input type="email" id="reset-input-email" class="modal-esqueci-input" placeholder="seu@email.com" required autocomplete="email">
          <button type="submit" class="modal-esqueci-btn">Enviar</button>
        </form>
      </div>

      <!-- Etapa 2: nova senha -->
      <div id="reset-step-2" style="display:none">
        <h2 class="modal-esqueci-titulo">Nova Senha</h2>
        <p class="modal-esqueci-desc reset-email-confirmado"></p>
        <form id="form-reset-nova-senha" onsubmit="salvarNovaSenhaReset(event)">
          <label class="modal-esqueci-label">Nova senha</label>
          <input type="password" id="reset-nova-senha" class="modal-esqueci-input" placeholder="Mínimo 6 caracteres" required minlength="6">
          <label class="modal-esqueci-label" style="margin-top:12px">Confirmar senha</label>
          <input type="password" id="reset-confirmar-senha" class="modal-esqueci-input" placeholder="Repita a nova senha" required>
          <button type="submit" class="modal-esqueci-btn" style="margin-top:16px">Salvar nova senha</button>
        </form>
      </div>

      <!-- Etapa 3: sucesso -->
      <div id="reset-step-3" style="display:none;text-align:center">
        <div style="font-size:52px;margin-bottom:14px">✅</div>
        <h2 class="modal-esqueci-titulo">Senha redefinida!</h2>
        <p class="modal-esqueci-desc">Sua senha foi atualizada com sucesso.</p>
        <button class="modal-esqueci-btn" onclick="fecharModalResetSenha()">Fechar</button>
      </div>
    </div>
  `;
  modal.addEventListener("click", function(e) {
    if (e.target === modal) fecharModalResetSenha();
  });
  document.body.appendChild(modal);
}

function abrirModalResetSenha(emailInicial) {
  _injetarModalReset();
  const modal = document.getElementById("modal-reset-senha");
  modal.style.display = "flex";
  document.getElementById("reset-step-1").style.display = "";
  document.getElementById("reset-step-2").style.display = "none";
  document.getElementById("reset-step-3").style.display = "none";
  document.getElementById("form-reset-email").reset();
  document.getElementById("form-reset-nova-senha").reset();
  _resetEmailAtual = null;
  if (emailInicial) {
    document.getElementById("reset-input-email").value = emailInicial;
  }
}

function fecharModalResetSenha() {
  const modal = document.getElementById("modal-reset-senha");
  if (modal) modal.style.display = "none";
}

function confirmarEmailReset(e) {
  e.preventDefault();
  const email = document.getElementById("reset-input-email").value.trim().toLowerCase();
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const usuario = usuarios.find(u => u.email === email);

  if (!usuario) {
    mostrarMensagem("E-mail não encontrado. Verifique e tente novamente.", "erro");
    return;
  }

  _resetEmailAtual = email;
  document.getElementById("reset-step-1").style.display = "none";
  const desc = document.querySelector(".reset-email-confirmado");
  if (desc) desc.textContent = "E-mail verificado: " + email + ". Crie sua nova senha abaixo.";
  document.getElementById("reset-step-2").style.display = "";
  document.getElementById("reset-nova-senha").focus();
}

function salvarNovaSenhaReset(e) {
  e.preventDefault();
  const nova     = document.getElementById("reset-nova-senha").value;
  const confirma = document.getElementById("reset-confirmar-senha").value;
  if (nova.length < 6) { mostrarMensagem("A senha deve ter pelo menos 6 caracteres!", "erro"); return; }
  if (nova !== confirma) { mostrarMensagem("As senhas não coincidem!", "erro"); return; }

  hashSenha(nova).then(hash => {
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const idx = usuarios.findIndex(u => u.email === _resetEmailAtual);
    if (idx === -1) { mostrarMensagem("Usuário não encontrado!", "erro"); return; }
    usuarios[idx].senha = hash;
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    document.getElementById("reset-step-2").style.display = "none";
    document.getElementById("reset-step-3").style.display = "";
    _resetEmailAtual = null;
  });
}

function solicitarResetSenhaPerfil() {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  abrirModalResetSenha(usuarioLogado ? usuarioLogado.email : "");
}

// =========================
// SINCRONIZAÇÃO ENTRE ABAS (storage event)
// =========================
window.addEventListener("storage", function (e) {
  if (e.key !== "usuarioLogado") return;

  // Atualiza o header imediatamente em todas as abas abertas
  inicializarHeader();

  // Se estiver na página de vendas, re-verifica o acesso
  if (document.getElementById("lista-meus-produtos")) {
    inicializarVender();
  }
});

// =========================
// BANNER SLIDER
// =========================
(function () {
  let slideAtual = 0;
  let autoplayTimer = null;
  const INTERVALO = 4500;

  function _slides() {
    return document.querySelectorAll(".banner-slide");
  }
  function _dots() {
    return document.querySelectorAll(".banner-dot");
  }

  function irParaSlide(idx) {
    const slides = _slides();
    const dots   = _dots();
    if (!slides.length) return;

    slides[slideAtual].classList.remove("ativo");
    dots[slideAtual]?.classList.remove("ativo");

    slideAtual = (idx + slides.length) % slides.length;

    slides[slideAtual].classList.add("ativo");
    dots[slideAtual]?.classList.add("ativo");
  }

  function moverSlide(delta) {
    reiniciarAutoplay();
    irParaSlide(slideAtual + delta);
  }

  function reiniciarAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(() => irParaSlide(slideAtual + 1), INTERVALO);
  }

  // Expor funções globalmente para os onclicks no HTML
  window.irParaSlide  = function(i) { reiniciarAutoplay(); irParaSlide(i); };
  window.moverSlide   = moverSlide;

  // Inicializar só se o slider existir na página
  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("banner-slider")) return;
    reiniciarAutoplay();

    // Pausar ao passar o mouse
    const slider = document.getElementById("banner-slider");
    slider.addEventListener("mouseenter", () => clearInterval(autoplayTimer));
    slider.addEventListener("mouseleave", reiniciarAutoplay);

    // Suporte a swipe no celular
    let touchStartX = 0;
    slider.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener("touchend", e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) moverSlide(diff > 0 ? 1 : -1);
    }, { passive: true });
  });
})();

// =========================
// BADGES E PARCELAS DOS CARDS
// =========================
(function () {
  function formatarPreco(val) {
    return "R$" + parseFloat(val).toFixed(2).replace(".", ",");
  }

  function processarCard(card) {
    if (card.dataset.badgesOk) return;
    card.dataset.badgesOk = "1";

    var imgBox   = card.querySelector(".card-produto__imagem");
    var precoBox = card.querySelector(".card-produto__preco");
    if (!imgBox || !precoBox) return;

    var h3 = precoBox.querySelector("h3");
    var h2 = precoBox.querySelector("h2");

    // Badge de promoção + % quando há desconto
    if (h3 && h2) {
      var original = parseFloat(h3.textContent.replace("R$", "").replace(",", ".").trim());
      var final    = parseFloat(h2.textContent.replace("R$", "").replace(",", ".").trim());

      if (original > final && original > 0 && final > 0) {
        var pct = Math.round((1 - final / original) * 100);

        var badgePromo = document.createElement("span");
        badgePromo.className = "card-badge-promo";
        badgePromo.textContent = "Promoção";
        imgBox.appendChild(badgePromo);

        var badgePct = document.createElement("span");
        badgePct.className = "card-badge-pct-off";
        badgePct.innerHTML = pct + "%<br>OFF";
        imgBox.appendChild(badgePct);
      }
    }

    // Texto de parcela embaixo do preço
    var precoFinal = h2 ? parseFloat(h2.textContent.replace("R$", "").replace(",", ".").trim()) : 0;
    if (precoFinal > 0) {
      var btn = card.querySelector(".card-produto__btn");
      var parcela = document.createElement("p");
      parcela.className = "card-produto__parcela";
      parcela.textContent = "1X de " + formatarPreco(precoFinal) + " sem juros";
      if (btn) card.insertBefore(parcela, btn);
      else card.appendChild(parcela);
    }
  }

  function inicializarBadgesCards() {
    document.querySelectorAll(".card-produto").forEach(processarCard);
  }

  document.addEventListener("DOMContentLoaded", inicializarBadgesCards);
  window._reinicializarBadgesCards = inicializarBadgesCards;
})();

// =========================
// SCROLL HORIZONTAL DE PRODUTOS
// =========================
(function () {
  var SCROLL_PX = 620;

  function criarScrollHorizontal(lista) {
    if (!lista) return;
    if (lista.parentElement && lista.parentElement.classList.contains("secao-scroll-wrapper")) return;

    var wrapper = document.createElement("div");
    wrapper.className = "secao-scroll-wrapper";
    lista.parentNode.insertBefore(wrapper, lista);
    wrapper.appendChild(lista);

    var btnPrev = document.createElement("button");
    btnPrev.type = "button";
    btnPrev.className = "secao-scroll__btn secao-scroll__btn--prev oculto";
    btnPrev.innerHTML = "&#8249;";
    btnPrev.setAttribute("aria-label", "Rolar para a esquerda");

    var btnNext = document.createElement("button");
    btnNext.type = "button";
    btnNext.className = "secao-scroll__btn secao-scroll__btn--next";
    btnNext.innerHTML = "&#8250;";
    btnNext.setAttribute("aria-label", "Rolar para a direita");

    wrapper.appendChild(btnPrev);
    wrapper.appendChild(btnNext);

    function atualizar() {
      var atInicio = lista.scrollLeft <= 2;
      var atFim    = lista.scrollLeft >= lista.scrollWidth - lista.clientWidth - 2;
      btnPrev.classList.toggle("oculto", atInicio);
      btnNext.classList.toggle("oculto", atFim || lista.scrollWidth <= lista.clientWidth);
    }

    btnPrev.addEventListener("click", function () {
      lista.scrollBy({ left: -SCROLL_PX, behavior: "smooth" });
    });

    btnNext.addEventListener("click", function () {
      lista.scrollBy({ left: SCROLL_PX, behavior: "smooth" });
    });

    lista.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar, { passive: true });

    // Swipe no celular
    var touchStartX = 0;
    lista.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    lista.addEventListener("touchend", function (e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        lista.scrollBy({ left: diff > 0 ? SCROLL_PX : -SCROLL_PX, behavior: "smooth" });
      }
    }, { passive: true });

    atualizar();
  }

  function inicializarScrollProdutos() {
    document.querySelectorAll(".lista-cards").forEach(criarScrollHorizontal);
  }

  document.addEventListener("DOMContentLoaded", inicializarScrollProdutos);

  // Exposto para re-chamar quando produtos de vendedor/admin são renderizados dinamicamente
  window._reinicializarScrollProdutos = function () {
    document.querySelectorAll(".lista-cards").forEach(criarScrollHorizontal);
  };
})();

// =========================
// INICIALIZAÇÃO
// =========================
inicializarHeader();
atualizarBadgeCarrinho();
inicializarFiltros();
inicializarPesquisa();
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
inicializarBotoesCarrinho();

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
