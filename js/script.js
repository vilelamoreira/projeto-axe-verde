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
// PONTOS: salvar, listar em tempo real e excluir (apenas do dono)
// ============================================================

// ⛔️ IMPORTANTE: este bloco substitui as funções duplicadas anteriores.
// Apaga chamadas antigas como `carregarPontos();` e qualquer `firebase.auth().currentUser.uid` solto.

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
      userId: user.uid, // dono da marcação
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // O listener em tempo real atualiza o mapa sozinho
  } catch (e) {
    console.error("Erro ao salvar ponto:", e);
    alert("Erro ao salvar ponto.");
  }
}

// --- Listener em tempo real dos pontos ---
let unsubscribePontos = null;
const markersById = {}; // id do doc -> marker Leaflet

function limparTodosMarcadores() {
  Object.values(markersById).forEach((m) => map.removeLayer(m));
  for (const id in markersById) delete markersById[id];
}

function iniciarListenerPontos(user) {
  // Cancela listener anterior (se houver) e limpa marcadores
  if (unsubscribePontos) {
    unsubscribePontos();
    unsubscribePontos = null;
  }
  limparTodosMarcadores();

  // Mostra TODOS os pontos para qualquer visitante
  unsubscribePontos = db.collection("pontos").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const id = change.doc.id;

      if (change.type === "removed") {
        if (markersById[id]) {
          map.removeLayer(markersById[id]);
          delete markersById[id];
        }
        return;
      }

      // added / modified → (re)criar marcador
      const p = change.doc.data();

      // remove marcador antigo se existir (para "modified")
      if (markersById[id]) {
        map.removeLayer(markersById[id]);
        delete markersById[id];
      }

      const icon = icones[p.tipo] || L.icon({ iconUrl: "imagens/pontoForca.png", iconSize: [32, 32] });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);

      let popupHtml = `<b>${nomesAmigaveis[p.tipo] || p.tipo}</b><br>${p.descricao}`;

      // Só o dono vê o botão de excluir
      if (user && user.uid === p.userId) {
        popupHtml += `<br><button onclick="excluirPonto('${id}')">Excluir marcação.</button>`;
      }

      marker.bindPopup(popupHtml);
      markersById[id] = marker;
    });
  });
}

// --- Excluir marcação (apenas do dono) ---
function excluirPonto(pontoId) {
  const user = auth.currentUser;
  if (!user) return alert("Você precisa estar logado.");

  const docRef = db.collection("pontos").doc(pontoId);

  docRef.get().then((doc) => {
    if (!doc.exists) return;

    const data = doc.data();
    if (data.userId !== user.uid) {
      alert("Você não tem permissão para excluir esta marcação.");
      return;
    }

    return docRef.delete().then(() => {
      // O listener em tempo real remove o marcador do mapa
      alert("Ponto excluído com sucesso!");
    });
  }).catch((err) => {
    console.error("Erro ao excluir ponto:", err);
    alert("Erro ao excluir ponto.");
  });
}

// ============================================================
// AUTENTICAÇÃO: mostrar/esconder botão Sair e redirecionar ao sair
// ============================================================
auth.onAuthStateChanged((user) => {
  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) logoutBtn.style.display = user ? "block" : "none";

  // Recria os popups conforme o usuário (para mostrar/ocultar "Excluir marcação.")
  iniciarListenerPontos(user || null);
});

// Botão Sair → desloga e volta à tela principal (index.html)
document.getElementById("btnLogout")?.addEventListener("click", () => {
  auth.signOut()
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Erro ao sair:", error);
      alert("Erro ao sair.");
    });
});

// Clique no mapa -> abre modal de seleção (somente se logado)
map.on("click", function (e) {
  if (!auth.currentUser) {
    alert("Você precisa estar logado para marcar pontos no mapa.");
    return;
  }
  posicaoSelecionada = e.latlng;
  document.getElementById("selecionar-tipo").style.display = "block";
});

// Botões do modal chamam selecionarTipo('pontoForca'|'cachoeira'|'descarte'|'ervas')
function selecionarTipo(tipo) {
  const descricao = prompt("Descreva brevemente este ponto:");
  if (!descricao || !posicaoSelecionada) {
    alert("Preencha corretamente.");
    return;
  }
  salvarPonto(tipo, descricao, posicaoSelecionada.lat, posicaoSelecionada.lng);
  fecharModal(); // mantém seu fluxo
}

function fecharModal() {
  document.getElementById("selecionar-tipo").style.display = "none";
}

