// ============================================================
// INICIALIZAÇÃO DO MAPA
// ============================================================
const votuporangaCoords = [-20.4231, -49.9784];
const map = L.map("map").setView(votuporangaCoords, 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let marcadorBusca = null;
let posicaoSelecionada = null;

// ============================================================
// ÍCONES
// ============================================================
const icones = {
  cachoeira: L.icon({ iconUrl: "imagens/cachoeira.png", iconSize: [32, 32] }),
  descarte: L.icon({ iconUrl: "imagens/descarte.png", iconSize: [32, 32] }),
  ervas: L.icon({ iconUrl: "imagens/ervas.png", iconSize: [32, 32] }),
  pontoForca: L.icon({ iconUrl: "imagens/pontoForca.png", iconSize: [32, 32] }),
};

const nomesAmigaveis = {
  pontoForca: "Ponto de força",
  cachoeira: "Rio / Cachoeira",
  ervas: "Ervas",
  descarte: "Descarte",
};

// ============================================================
// FIREBASE
// ============================================================
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================================
// FUNÇÕES DE LOGIN / CADASTRO
// ============================================================
function abrirLogin() {
  document.getElementById("modal-login").style.display = "block";
}
function fecharLogin() {
  document.getElementById("modal-login").style.display = "none";
}

function abrirCadastro() {
  document.getElementById("modal-cadastro").style.display = "block";
}
function fecharCadastro() {
  document.getElementById("modal-cadastro").style.display = "none";
}

function realizarCadastro() {
  const email = document.getElementById("cadastro-email").value;
  const senha = document.getElementById("cadastro-senha").value;
  const confirmar = document.getElementById("confirmar-senha").value;

  if (senha !== confirmar) {
    alert("As senhas não coincidem!");
    return;
  }

  auth
    .createUserWithEmailAndPassword(email, senha)
    .then(() => {
      alert("Cadastro realizado!");
      fecharCadastro();
    })
    .catch((err) => {
      console.error(err);
      alert("Erro no cadastro: " + err.message);
    });
}

function realizarLogin() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  auth
    .signInWithEmailAndPassword(email, senha)
    .then(() => {
      alert("Login realizado!");
      fecharLogin();
    })
    .catch((err) => {
      console.error(err);
      alert("Erro no login: " + err.message);
    });
}

// ============================================================
// SALVAR E CARREGAR PONTOS
// ============================================================
async function salvarPonto(tipo, descricao, lat, lng) {
  const user = auth.currentUser;
  if (!user) {
    alert("Você precisa estar logado para marcar pontos.");
    return;
  }

  try {
    await db.collection("pontos").add({
      tipo,
      descricao,
      lat,
      lng,
      userId: user.uid,
      criadoEm: new Date(),
    });
    carregarPontos(); // atualiza mapa
  } catch (e) {
    console.error("Erro ao salvar ponto:", e);
  }
}

async function carregarPontos() {
  const snapshot = await db.collection("pontos").get();
  snapshot.forEach((doc) => {
    const p = doc.data();
    L.marker([p.lat, p.lng], { icon: icones[p.tipo] })
      .addTo(map)
      .bindPopup(`<b>${nomesAmigaveis[p.tipo]}</b><br>${p.descricao}`);
  });
}

// ============================================================
// EVENTOS
// ============================================================

// Buscar endereço
function buscarEndereco() {
  const endereco = document.getElementById("endereco").value;
  if (!endereco) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    endereco + ", Votuporanga, SP"
  )}`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (data.length === 0) {
        alert("Endereço não encontrado.");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);

      map.setView([lat, lon], 15);

      if (marcadorBusca) {
        marcadorBusca
          .setLatLng([lat, lon])
          .setPopupContent(endereco)
          .openPopup();
      } else {
        marcadorBusca = L.marker([lat, lon]).addTo(map).bindPopup(endereco).openPopup();
      }
    })
    .catch((err) => {
      console.error("Erro ao buscar endereço:", err);
      alert("Erro ao buscar endereço.");
    });
}

// Clique no mapa -> abre modal de seleção de tipo
map.on("click", function (e) {
  if (!auth.currentUser) {
    alert("Você precisa estar logado para marcar pontos no mapa.");
    return;
  }
  posicaoSelecionada = e.latlng;
  document.getElementById("selecionar-tipo").style.display = "block";
});

// Botões do modal de seleção
function selecionarTipo(tipo) {
  const descricao = prompt("Descrição do ponto:");
  if (!descricao || !posicaoSelecionada) {
    alert("Preencha corretamente.");
    return;
  }
  salvarPonto(tipo, descricao, posicaoSelecionada.lat, posicaoSelecionada.lng);
  fecharModal();
}

function fecharModal() {
  document.getElementById("selecionar-tipo").style.display = "none";
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
carregarPontos();

// Função de logout
document.getElementById("btnLogout")?.addEventListener("click", () => {
  firebase.auth().signOut()
    .then(() => {
      alert("Você saiu com sucesso!");
      window.location.href = "login.html"; // ajuste se o nome do arquivo de login for diferente
    })
    .catch((error) => {
      console.error("Erro ao sair:", error);
    });
});

firebase.auth().currentUser.uid

function salvarPonto(tipo, descricao, lat, lng) {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Você precisa estar logado para salvar pontos.");

  const novoPonto = {
    tipo: tipo,
    descricao: descricao,
    lat: lat,
    lng: lng,
    userId: user.uid,   // 🔹 salva o dono do ponto
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection("pontos").add(novoPonto)
    .then(() => {
      console.log("Ponto salvo com sucesso!");
    })
    .catch((error) => {
      console.error("Erro ao salvar ponto:", error);
    });
}

function carregarPontosNoMapa() {
  const user = firebase.auth().currentUser;

  db.collection("pontos").onSnapshot((snapshot) => {
    snapshot.forEach((doc) => {
      const ponto = doc.data();
      const marker = L.marker([ponto.lat, ponto.lng], {
        icon: escolherIcone(ponto.tipo)
      }).addTo(map);

      let popupContent = `<b>${ponto.tipo}</b><br>${ponto.descricao}`;

      // 🔹 Só mostra botão excluir se o ponto for do usuário logado
      if (user && ponto.userId === user.uid) {
        popupContent += `
          <br><button onclick="excluirPonto('${doc.id}')">
            Excluir
          </button>`;
      }

      marker.bindPopup(popupContent);
    });
  });
}

function excluirPonto(pontoId) {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Você precisa estar logado.");

  const docRef = db.collection("pontos").doc(pontoId);

  docRef.get().then((doc) => {
    if (doc.exists && doc.data().userId === user.uid) {
      docRef.delete()
        .then(() => {
          alert("Ponto excluído com sucesso!");
        })
        .catch((error) => {
          console.error("Erro ao excluir ponto:", error);
        });
    } else {
      alert("Você não tem permissão para excluir este ponto.");
    }
  });
}
