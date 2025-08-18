const usuarioLogado = true;

const votuporangaCoords = [-20.4231, -49.9784];
const map = L.map('map').setView(votuporangaCoords, 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marcadorBusca = null;
let posicaoSelecionada = null;

// Ícones personalizados
const icones = {
  cachoeira: L.icon({ iconUrl: 'imagens/cachoeira.png', iconSize: [32, 32] }),
  descarte: L.icon({ iconUrl: 'imagens/descarte.png', iconSize: [32, 32] }),
  ervas: L.icon({ iconUrl: 'imagens/ervas.png', iconSize: [32, 32] }),
  pontoForca: L.icon({ iconUrl: 'imagens/pontoForca.png', iconSize: [32, 32] }),
};

// Nomes amigáveis para exibir no popup
const nomesAmigaveis = {
  pontoForca: "Ponto de força",
  cachoeira: "Rio / Cachoeira",
  ervas: "Ervas",
  descarte: "Descarte",
};

// BUSCA DE ENDEREÇO
function buscarEndereco() {
  const endereco = document.getElementById("endereco").value;
  if (!endereco) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco + ', Votuporanga, SP')}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        alert("Endereço não encontrado.");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);

      map.setView([lat, lon], 15);

      if (marcadorBusca) {
        marcadorBusca.setLatLng([lat, lon]).setPopupContent(endereco).openPopup();
      } else {
        marcadorBusca = L.marker([lat, lon]).addTo(map)
          .bindPopup(endereco)
          .openPopup();
      }
    })
    .catch(err => {
      console.error("Erro ao buscar endereço:", err);
      alert("Erro ao buscar endereço.");
    });
}

// ABRE MODAL AO CLICAR NO MAPA
map.on('click', function (e) {
  if (!usuarioLogado) {
    alert('Você precisa estar logado para marcar pontos no mapa.');
    return;
  }

  posicaoSelecionada = e.latlng;
  document.getElementById('selecionar-tipo').style.display = 'flex';
});

// USUÁRIO CLICA EM UMA OPÇÃO DO MODAL
function selecionarTipo(tipo) {
  fecharModal();

  const descricao = prompt("Descreva brevemente este ponto:");
  if (!descricao) return;

  L.marker(posicaoSelecionada, { icon: icones[tipo] }).addTo(map)
    .bindPopup(`<strong>${nomesAmigaveis[tipo]}</strong><br>${descricao}`);
}

// FECHA MODAL
function fecharModal() {
  document.getElementById('selecionar-tipo').style.display = 'none';
}

function abrirLogin() {
  document.getElementById('modal-login').style.display = 'flex';
}

function fecharLogin() {
  document.getElementById('modal-login').style.display = 'none';
}

function realizarLogin() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  firebase.auth().signInWithEmailAndPassword(email, senha)
    .then(userCredential => {
      alert("Login realizado com sucesso!");
      fecharLogin();
      // Aqui você pode salvar que o usuário está logado:
      // usuarioLogado = true;
    })
    .catch(error => {
      alert("Erro no login: " + error.message);
    });
}


function realizarCadastro() {
  const email = document.getElementById("cadastro-email").value;
  const senha = document.getElementById("cadastro-senha").value;
  const confirmar = document.getElementById("confirmar-senha").value;

  if (!email || !senha || !confirmar) {
    alert("Preencha todos os campos.");
    return;
  }

  if (senha !== confirmar) {
    alert("As senhas não coincidem.");
    return;
  }

  firebase.auth().createUserWithEmailAndPassword(email, senha)
    .then(userCredential => {
      alert("Cadastro realizado com sucesso!");
      fecharCadastro();
    })
    .catch(error => {
      alert("Erro no cadastro: " + error.message);
    });
}

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    console.log("Usuário logado:", user.email);
    // Aqui você pode exibir botões extras ou permitir marcação no mapa
  } else {
    console.log("Usuário deslogado");
  }
});

function abrirCadastro() {
  document.getElementById('modal-cadastro').style.display = 'flex';
}

function fecharCadastro() {
  document.getElementById('modal-cadastro').style.display = 'none';
}

const db = firebase.firestore();

async function salvarPonto(tipo, descricao, lat, lng) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("Você precisa estar logado para marcar pontos.");
    return;
  }

  try {
    await db.collection('pontos').add({
      tipo,
      descricao,
      lat,
      lng,
      usuarioId: user.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Ponto salvo com sucesso!");
  } catch (error) {
    alert("Erro ao salvar ponto: " + error.message);
  }
}

function confirmarDescricao() {
  const descricao = document.getElementById('descricaoPonto').value.trim();
  if (!descricao) {
    alert("Por favor, escreva uma descrição.");
    return;
  }
  salvarPonto(tipoSelecionado, descricao, pontoMarcado.lat, pontoMarcado.lng)
    .then(() => {
      adicionarMarcadorNoMapa(tipoSelecionado, pontoMarcado.lat, pontoMarcado.lng, descricao);
      fecharModalDescricao();
    });
}

function carregarPontosNoMapa() {
  db.collection('pontos').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const data = change.doc.data();
        adicionarMarcadorNoMapa(data.tipo, data.lat, data.lng, data.descricao);
      }
      // você pode tratar 'modified' e 'removed' se quiser
    });
  });
}

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    usuarioLogado = true;
    // Habilita marcar pontos
  } else {
    usuarioLogado = false;
    // Desabilita marcar pontos e informa usuário
  }
});

