// =========================
// MENSAGENS
// =========================
function mostrarMensagem(texto, tipo = "sucesso") {
  const mensagem = document.createElement("div");
  mensagem.classList.add("mensagem");

  if (tipo === "erro") {
    mensagem.classList.add("mensagem-erro");
  } else {
    mensagem.classList.add("mensagem-sucesso");
  }

  mensagem.textContent = texto;

  document.body.appendChild(mensagem);

  setTimeout(() => {
    mensagem.classList.add("sumir");
    setTimeout(() => mensagem.remove(), 300);
  }, 3000);
}

// =========================
// CADASTRO
// =========================
const formCadastro = document.getElementById("form-cadastro");

if (formCadastro) {
  formCadastro.addEventListener("submit", function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    const emailFormatado = email.toLowerCase();

    if (senha.length < 6) {
      mostrarMensagem("A senha deve ter pelo menos 6 caracteres!", "erro");
      return;
    }

    if (senha !== confirmarSenha) {
      mostrarMensagem("As senhas não coincidem!", "erro");
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuarioExiste = usuarios.find(
      (u) => u.email === emailFormatado
    );

    if (usuarioExiste) {
      mostrarMensagem("Esse e-mail já está cadastrado!", "erro");
      return;
    }

    const senhaHash = btoa(senha);

    usuarios.push({
      nome,
      email: emailFormatado,
      senha: senhaHash,
    });

    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    localStorage.setItem(
      "usuarioLogado",
      JSON.stringify({ nome, email: emailFormatado })
    );

    mostrarMensagem("Conta criada com sucesso!");

    setTimeout(() => {
      window.location.href = "../index.html";
    }, 1500);
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

    const senhaHash = btoa(senha);

    const usuario = usuarios.find(
      (u) => u.email === email && u.senha === senhaHash
    );

    if (usuario) {
      localStorage.setItem(
        "usuarioLogado",
        JSON.stringify({ nome: usuario.nome, email: usuario.email })
      );

      mostrarMensagem("Login realizado com sucesso!");

      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1500);
    } else {
      mostrarMensagem("E-mail ou senha inválidos!", "erro");
    }
  });
}

// =========================
// USUÁRIO LOGADO (HEADER)
// =========================
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

if (usuarioLogado) {
  const perfil = document.querySelector(".header-icone-perfil");

  if (perfil) {
    const nomeElemento = perfil.parentElement.querySelector("h3");

    if (nomeElemento) {
      nomeElemento.textContent = usuarioLogado.nome;
    }
  }
}

// =========================
// LOGOUT
// =========================
function logout() {
  localStorage.removeItem("usuarioLogado");
  window.location.href = "pages/login.html";
}