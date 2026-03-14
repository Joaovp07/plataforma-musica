/**
 * ECLO — Leaked Archive
 * js/script.js — Integrado com Music Platform API (Node.js + Express + MongoDB)
 *
 * Índice:
 *  §1   Configuração da API
 *  §2   Estado global
 *  §3   Referências DOM
 *  §4   Utilitários (sanitize, formatTime, toast)
 *  §5   Auth — register / login / logout (JWT via API)
 *  §6   Sessão — salva/restaura token no sessionStorage
 *  §7   Landing screen / enterSite / goToHomeScreen
 *  §8   Carregar músicas da API
 *  §9   Renderizar track list
 *  §10  Player — loadTrack / play / pause / next / prev
 *  §11  Progresso — barra + seek + tempo
 *  §12  Volume
 *  §13  Upload de leak (admin)
 *  §14  Delete de track (admin)
 *  §15  Modais
 *  §16  Event listeners
 *  §17  Inicialização
 */

'use strict';

/* ══════════════════════════════════════════════════════
   §1  CONFIGURAÇÃO DA API
══════════════════════════════════════════════════════ */
const API_BASE = 'http://localhost:3000';

/* Chave do sessionStorage para o JWT */
const SS_TOKEN_KEY = 'eclo_jwt';
const SS_USER_KEY  = 'eclo_user';

/* Tipos MIME permitidos (validação client-side) */
const ALLOWED_AUDIO_MIME = Object.freeze(['audio/mpeg','audio/mp3','audio/wav','audio/wave','audio/ogg','audio/x-wav','audio/flac','audio/aac']);
const ALLOWED_AUDIO_EXT  = Object.freeze(['.mp3','.wav','.ogg','.flac','.aac','.m4a']);
const MAX_AUDIO_SIZE     = 50 * 1024 * 1024; /* 50 MB */


/* ══════════════════════════════════════════════════════
   §2  ESTADO GLOBAL
══════════════════════════════════════════════════════ */
let tracks        = [];    /* array de músicas vindas da API */
let currentIndex  = -1;
let isPlaying     = false;
let isAdmin       = false; /* true se usuário está logado */
let authToken     = null;  /* JWT armazenado em memória */
let currentBlobURL = null; /* URL de blob do áudio atual */


/* ══════════════════════════════════════════════════════
   §3  REFERÊNCIAS DOM
══════════════════════════════════════════════════════ */
const landing           = document.getElementById('landing');
const app               = document.getElementById('app');
const headerLeft        = document.querySelector('.h-left');
const adminBar          = document.getElementById('admin-bar');
const btnLogout         = document.getElementById('btn-logout');
const btnAdminOpen      = document.getElementById('btn-admin-open');
const btnNewLeak        = document.getElementById('btn-new-leak');
const trackList         = document.getElementById('tlist');
const trackCount        = document.getElementById('s-count');
const headerNow         = document.getElementById('h-now');
const coverImg          = document.getElementById('p-cover');
const playerTitle       = document.getElementById('p-title');
const playerArtist      = document.getElementById('p-artist');
const progBg            = document.getElementById('prog-bg');
const progFill          = document.getElementById('prog-fill');
const timeCur           = document.getElementById('t-cur');
const timeTot           = document.getElementById('t-tot');
const btnPlay           = document.getElementById('btn-play');
const btnPrev           = document.getElementById('btn-prev');
const btnNext           = document.getElementById('btn-next');
const playIcon          = document.getElementById('play-icon');
const volSlider         = document.getElementById('vol-slider');
const audioEl           = document.getElementById('audio-player');

/* Modais — login */
const modalLogin        = document.getElementById('modal-login');
const modalLoginClose   = document.getElementById('modal-login-close');
const inputLogin        = document.getElementById('input-login');
const inputPass         = document.getElementById('input-pass');
const loginError        = document.getElementById('login-error');
const btnLoginSubmit    = document.getElementById('btn-login-submit');

/* Modais — nova leak */
const modalNewLeak      = document.getElementById('modal-new-leak');
const modalNewLeakClose = document.getElementById('modal-new-leak-close');
const nlTitle           = document.getElementById('nl-title');
const nlArtist          = document.getElementById('nl-artist');
const nlAudioInput      = document.getElementById('nl-audio');
const nlCoverInput      = document.getElementById('nl-cover');
const nlAudioName       = document.getElementById('nl-audio-name');
const nlCoverName       = document.getElementById('nl-cover-name');
const btnNewLeakSubmit  = document.getElementById('btn-new-leak-submit');


/* ══════════════════════════════════════════════════════
   §4  UTILITÁRIOS
══════════════════════════════════════════════════════ */

/**
 * Sanitiza string para uso seguro no DOM (anti-XSS).
 */
function sanitizeInput(str, max) {
  if (typeof str !== 'string') return '';
  max = (typeof max === 'number' && max > 0) ? max : 200;
  return str.slice(0, max)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Formata segundos em mm:ss.
 */
function formatTime(secs) {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

/**
 * Exibe um toast flutuante no canto da tela.
 * @param {string}  msg
 * @param {'ok'|'err'|'info'} type
 */
function showToast(msg, type = 'ok') {
  let el = document.getElementById('eclo-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'eclo-toast';
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', right: '24px',
      background: type === 'err' ? 'rgba(200,50,50,0.95)' : 'var(--white)',
      color: type === 'err' ? 'var(--white)' : 'var(--black)',
      border: '2px solid var(--white)',
      padding: '10px 18px',
      fontSize: '11px',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      zIndex: '999',
      maxWidth: '320px',
      boxShadow: '4px 4px 0 rgba(255,255,255,0.12)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      opacity: '0',
      transform: 'translateY(10px)',
      pointerEvents: 'none',
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = type === 'err' ? 'rgba(200,50,50,0.95)' : 'var(--white)';
  el.style.color = type === 'err' ? 'var(--white)' : 'var(--black)';
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  clearTimeout(el._t);
  el._t = setTimeout(function () {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
  }, 3000);
}

/**
 * Faz uma requisição autenticada para a API.
 * @param {string} path    — ex: '/api/music'
 * @param {object} options — fetch options (method, body, etc.)
 * @returns {Promise<object>} — JSON da resposta
 */
async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}


/* ══════════════════════════════════════════════════════
   §5  AUTH — Login / Logout via API JWT
══════════════════════════════════════════════════════ */

/**
 * Faz login na API, armazena o JWT e ativa o modo admin.
 */
async function secureLogin() {
  const email    = inputLogin.value.trim();
  const password = inputPass.value;

  if (!email || !password) {
    loginError.textContent = 'Preencha e-mail e senha.';
    loginError.hidden = false;
    return;
  }

  btnLoginSubmit.textContent = 'ENTRANDO...';
  btnLoginSubmit.disabled = true;

  try {
    const { ok, data } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (ok && data.success) {
      /* Armazena o token em memória e no sessionStorage */
      authToken = data.data.token;
      sessionStorage.setItem(SS_TOKEN_KEY, authToken);
      sessionStorage.setItem(SS_USER_KEY, data.data.user.name);

      enableAdminMode(data.data.user.name);
      closeModal(modalLogin);

      /* Limpa campos sensíveis */
      inputLogin.value = '';
      inputPass.value  = '';
      loginError.hidden = true;

      showToast('Admin mode ativo');
    } else {
      loginError.textContent = data.message || 'Login ou senha incorretos.';
      loginError.hidden = false;
      inputPass.value = '';

      /* Shake nos inputs */
      [inputLogin, inputPass].forEach(function (inp) {
        inp.classList.add('input-error');
        setTimeout(function () { inp.classList.remove('input-error'); }, 400);
      });
    }
  } catch (e) {
    loginError.textContent = 'Erro de conexão com a API.';
    loginError.hidden = false;
  }

  btnLoginSubmit.textContent = 'ENTRAR';
  btnLoginSubmit.disabled = false;
}

/**
 * Ativa visualmente o modo admin.
 */
function enableAdminMode(name) {
  isAdmin = true;
  adminBar.classList.add('visible');
  adminBar.removeAttribute('aria-hidden');
  btnAdminOpen.classList.add('active');
  btnAdminOpen.textContent = 'ADMIN ✓';

  /* Mostra botões admin-only */
  document.querySelectorAll('.admin-only').forEach(function (el) {
    el.hidden = false;
  });

  renderTrackList(); /* Re-renderiza para mostrar botões de delete */
}

/**
 * Logout — remove token e desativa modo admin.
 */
function logoutAdmin() {
  authToken = null;
  isAdmin   = false;
  sessionStorage.removeItem(SS_TOKEN_KEY);
  sessionStorage.removeItem(SS_USER_KEY);

  adminBar.classList.remove('visible');
  adminBar.setAttribute('aria-hidden', 'true');
  btnAdminOpen.classList.remove('active');
  btnAdminOpen.textContent = 'ADMIN';

  document.querySelectorAll('.admin-only').forEach(function (el) {
    el.hidden = true;
  });

  renderTrackList();
  showToast('Sessão encerrada');
}


/* ══════════════════════════════════════════════════════
   §6  SESSÃO — restaura JWT do sessionStorage
══════════════════════════════════════════════════════ */
function restoreSession() {
  const saved = sessionStorage.getItem(SS_TOKEN_KEY);
  const name  = sessionStorage.getItem(SS_USER_KEY);
  if (saved) {
    authToken = saved;
    enableAdminMode(name || 'Admin');
  }
}


/* ══════════════════════════════════════════════════════
   §7  LANDING / ENTER / HOME
══════════════════════════════════════════════════════ */

/* DVD bounce do logo na landing */
let dvdX = 100, dvdY = 100, dvdVx = 1.4, dvdVy = 1.0;
let dvdRAF = null;

function dvdBounce() {
  const stage = document.querySelector('.illo-stage');
  if (!stage) return;
  const pw = landing.clientWidth  - stage.offsetWidth;
  const ph = landing.clientHeight - stage.offsetHeight;

  dvdX += dvdVx;
  dvdY += dvdVy;

  let hit = false;
  if (dvdX <= 0)  { dvdX = 0;  dvdVx =  Math.abs(dvdVx); hit = true; }
  if (dvdX >= pw) { dvdX = pw; dvdVx = -Math.abs(dvdVx); hit = true; }
  if (dvdY <= 0)  { dvdY = 0;  dvdVy =  Math.abs(dvdVy); hit = true; }
  if (dvdY >= ph) { dvdY = ph; dvdVy = -Math.abs(dvdVy); hit = true; }

  stage.style.left = dvdX + 'px';
  stage.style.top  = dvdY + 'px';

  if (hit) {
    stage.classList.add('corner-hit');
    setTimeout(function () { stage.classList.remove('corner-hit'); }, 300);
  }

  dvdRAF = requestAnimationFrame(dvdBounce);
}

function enterSite() {
  /* Para o DVD bounce */
  if (dvdRAF) cancelAnimationFrame(dvdRAF);

  landing.classList.add('exit');
  app.removeAttribute('aria-hidden');
  app.classList.add('on');

  setTimeout(function () {
    landing.style.display = 'none';
  }, 750);

  loadLeaksFromAPI();
}

function goToHomeScreen() {
  /* Pausa áudio */
  pauseMusic();

  app.classList.add('leaving');
  setTimeout(function () {
    app.classList.remove('on', 'leaving');
    app.setAttribute('aria-hidden', 'true');
    landing.style.display = '';
    landing.classList.remove('exit');
    dvdBounce();
  }, 450);
}


/* ══════════════════════════════════════════════════════
   §8  CARREGAR MÚSICAS DA API
══════════════════════════════════════════════════════ */

/**
 * Busca as músicas do usuário logado via GET /api/music.
 * Se não estiver logado, exibe lista vazia com mensagem.
 */
async function loadLeaksFromAPI() {
  if (!authToken) {
    /* Sem login: exibe placeholder convidando a logar */
    tracks = [];
    renderTrackList();
    trackCount.textContent = '0 LEAKS';
    return;
  }

  try {
    const { ok, data } = await apiFetch('/api/music?limit=100');
    if (ok && data.success) {
      tracks = data.data.musics.map(function (m) {
        return {
          id:         m._id,
          title:      m.title,
          artist:     m.artist || 'ECLO',
          dur:        '—',          /* duração carregada ao tocar */
          tags:       [ m.genre || 'LEAK', m.album || '2024' ].filter(Boolean),
          cover:      '',           /* sem capa por padrão */
          src:        null,         /* URL do stream carregada sob demanda */
          originalName: m.originalName,
          size:       m.size,
        };
      });
      trackCount.textContent = tracks.length + ' LEAK' + (tracks.length !== 1 ? 'S' : '');
      renderTrackList();
    } else {
      showToast('Erro ao carregar leaks', 'err');
    }
  } catch (e) {
    showToast('Erro de conexão com a API', 'err');
  }
}


/* ══════════════════════════════════════════════════════
   §9  RENDERIZAR TRACK LIST
══════════════════════════════════════════════════════ */
function renderTrackList() {
  trackList.innerHTML = '';

  if (!authToken) {
    /* Não logado — mensagem de acesso restrito */
    const msg = document.createElement('div');
    msg.style.cssText = 'padding: 40px 20px; text-align: center; color: rgba(242,242,242,0.3); font-size: 11px; letter-spacing: 3px; text-transform: uppercase; line-height: 2;';
    msg.innerHTML = '[ ACESSO RESTRITO ]<br><span style="font-size:10px; opacity:0.6;">Faça login como admin<br>para visualizar as leaks</span>';
    trackList.appendChild(msg);
    return;
  }

  if (tracks.length === 0) {
    const msg = document.createElement('div');
    msg.style.cssText = 'padding: 40px 20px; text-align: center; color: rgba(242,242,242,0.3); font-size: 11px; letter-spacing: 3px; text-transform: uppercase; line-height: 2;';
    msg.innerHTML = '[ SEM LEAKS ]<br><span style="font-size:10px; opacity:0.6;">Adicione a primeira via + NOVA LEAK</span>';
    trackList.appendChild(msg);
    return;
  }

  tracks.forEach(function (track, index) {
    const item = document.createElement('div');
    item.className = 'track-item' + (index === currentIndex ? ' active' : '');
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', sanitizeInput(track.title) + ' por ' + sanitizeInput(track.artist));

    /* Tags */
    const tagsHTML = (track.tags || []).map(function (tag) {
      return '<span class="t-tag">' + sanitizeInput(tag, 20) + '</span>';
    }).join('');

    /* Controles de admin (delete) */
    let adminHTML = '';
    if (isAdmin) {
      adminHTML = '<div class="track-admin-controls">' +
        '<button class="track-admin-btn track-delete-btn" data-index="' + index + '" aria-label="Excluir track">✕ DELETE</button>' +
        '</div>';
    }

    item.innerHTML =
      '<div class="t-num">' + String(index + 1).padStart(2, '0') + '</div>' +
      '<div class="t-info">' +
        '<p class="t-title">'  + sanitizeInput(track.title,  80) + '</p>' +
        '<p class="t-artist">' + sanitizeInput(track.artist, 80) + '</p>' +
        '<div class="t-tags">' + tagsHTML + '</div>' +
        adminHTML +
      '</div>' +
      '<div class="t-right">' +
        '<span class="t-dur">' + sanitizeInput(track.dur || '—', 10) + '</span>' +
        (index === currentIndex && isPlaying
          ? '<div class="t-wave" aria-hidden="true"><span></span><span></span><span></span></div>'
          : '') +
      '</div>';

    /* Click na track — toca */
    item.addEventListener('click', function (e) {
      if (e.target.closest('.track-admin-controls')) return; /* não toca se clicou em botão admin */
      loadTrack(index);
      playMusic();
    });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadTrack(index); playMusic(); }
    });

    /* Botão delete */
    const deleteBtn = item.querySelector('.track-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteTrack(index);
      });
    }

    trackList.appendChild(item);
  });
}


/* ══════════════════════════════════════════════════════
   §10  PLAYER — loadTrack / play / pause / next / prev
══════════════════════════════════════════════════════ */

/**
 * Carrega os metadados de uma track no player.
 * O áudio em si é carregado sob demanda em playMusic().
 */
function loadTrack(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;

  const track = tracks[index];
  playerTitle.textContent  = track.title  || 'UNTITLED';
  playerArtist.textContent = track.artist || '—';
  headerNow.textContent    = track.title  || '— SELECT A TRACK —';

  /* Capa: usa cover salvo ou placeholder com gradiente */
  if (track.cover && track.cover.startsWith('data:')) {
    coverImg.src = track.cover;
  } else {
    /* Placeholder preto com texto */
    coverImg.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">' +
      '<rect width="400" height="400" fill="#0a0a0a"/>' +
      '<text x="200" y="210" text-anchor="middle" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.15)" letter-spacing="4">' +
      sanitizeInput(track.title || 'ECLO', 20) +
      '</text></svg>'
    );
  }

  /* Reseta barra de progresso */
  progFill.style.width = '0%';
  timeCur.textContent  = '0:00';
  timeTot.textContent  = track.dur !== '—' ? track.dur : '0:00';

  /* Para o áudio anterior e revoga blob URL */
  audioEl.pause();
  if (currentBlobURL) { URL.revokeObjectURL(currentBlobURL); currentBlobURL = null; }
  audioEl.src = '';
  isPlaying   = false;
  updatePlayIcon();
  renderTrackList();
}

/**
 * Faz o stream da música via XMLHttpRequest (blob) e começa a reprodução.
 * Usamos XHR em vez de fetch para maior compatibilidade com streams de áudio
 * quando o servidor está em localhost e o frontend abre via file://.
 */
function playMusic() {
  if (currentIndex < 0) {
    if (tracks.length > 0) { loadTrack(0); }
    else { showToast('Nenhuma leak disponível', 'err'); return; }
    return;
  }

  const track = tracks[currentIndex];
  if (!track) return;

  /* Se já tem blob carregado, apenas retoma */
  if (currentBlobURL && audioEl.src === currentBlobURL) {
    audioEl.play().catch(function () {});
    isPlaying = true;
    updatePlayIcon();
    renderTrackList();
    return;
  }

  /* Indicador de carregamento */
  playerTitle.textContent = '[ CARREGANDO... ]';

  /* Revoga blob anterior */
  if (currentBlobURL) { URL.revokeObjectURL(currentBlobURL); currentBlobURL = null; }
  audioEl.src = '';

  /* XHR — suporta Authorization header e retorna blob */
  var xhr = new XMLHttpRequest();
  xhr.open('GET', API_BASE + '/api/music/' + track.id + '/stream', true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
  xhr.responseType = 'blob';

  xhr.onload = function () {
    if (xhr.status === 200 || xhr.status === 206) {
      currentBlobURL = URL.createObjectURL(xhr.response);
      audioEl.src = currentBlobURL;
      audioEl.play().catch(function (e) {
        showToast('Erro ao reproduzir: ' + e.message, 'err');
      });
      isPlaying = true;
      playerTitle.textContent = track.title;
      updatePlayIcon();
      renderTrackList();
    } else {
      showToast('Erro ao carregar áudio (' + xhr.status + ')', 'err');
      playerTitle.textContent = track.title;
    }
  };

  xhr.onerror = function () {
    showToast('Erro de conexão com a API', 'err');
    playerTitle.textContent = track.title;
  };

  xhr.send();
}

function pauseMusic() {
  audioEl.pause();
  isPlaying = false;
  updatePlayIcon();
  renderTrackList();
}

function nextTrack() {
  if (tracks.length === 0) return;
  const next = (currentIndex + 1) % tracks.length;
  loadTrack(next);
  playMusic();
}

function previousTrack() {
  if (tracks.length === 0) return;
  /* Se passou de 3s, reinicia a música atual */
  if (audioEl.currentTime > 3) {
    audioEl.currentTime = 0;
    return;
  }
  const prev = (currentIndex - 1 + tracks.length) % tracks.length;
  loadTrack(prev);
  playMusic();
}

function updatePlayIcon() {
  const pause = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  const play  = '<path d="M8 5v14l11-7z"/>';
  playIcon.innerHTML = isPlaying ? pause : play;
  btnPlay.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproduzir');
}


/* ══════════════════════════════════════════════════════
   §11  PROGRESSO — barra + seek + tempo
══════════════════════════════════════════════════════ */
audioEl.addEventListener('timeupdate', function () {
  if (!audioEl.duration) return;
  const pct = (audioEl.currentTime / audioEl.duration) * 100;
  progFill.style.width = pct + '%';
  timeCur.textContent  = formatTime(audioEl.currentTime);
  timeTot.textContent  = formatTime(audioEl.duration);

  /* Atualiza duração na track */
  if (currentIndex >= 0) {
    tracks[currentIndex].dur = formatTime(audioEl.duration);
  }
});

audioEl.addEventListener('ended', nextTrack);

/* Seek ao clicar na barra de progresso */
progBg.addEventListener('click', function (e) {
  if (!audioEl.duration) return;
  const rect = progBg.getBoundingClientRect();
  const pct  = (e.clientX - rect.left) / rect.width;
  audioEl.currentTime = pct * audioEl.duration;
});


/* ══════════════════════════════════════════════════════
   §12  VOLUME
══════════════════════════════════════════════════════ */
function setVolume(val) {
  val = Math.max(0, Math.min(100, val));
  audioEl.volume = val / 100;
  volSlider.value = val;
}

volSlider.addEventListener('input', function () {
  setVolume(Number(this.value));
});


/* ══════════════════════════════════════════════════════
   §13  UPLOAD DE LEAK (admin)
══════════════════════════════════════════════════════ */
async function uploadLeak() {
  if (!isAdmin || !authToken) {
    showToast('Acesso negado', 'err');
    return;
  }

  const title  = nlTitle.value.trim();
  const artist = nlArtist.value.trim();
  const file   = nlAudioInput.files[0];

  if (!title) {
    showToast('Título é obrigatório', 'err');
    return;
  }
  if (!file) {
    showToast('Selecione um arquivo de áudio', 'err');
    return;
  }

  /* Validação client-side */
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_AUDIO_EXT.includes(ext)) {
    showToast('Formato não suportado: ' + ext, 'err');
    return;
  }
  if (file.size > MAX_AUDIO_SIZE) {
    showToast('Arquivo muito grande (máx 50MB)', 'err');
    return;
  }

  btnNewLeakSubmit.textContent = 'ENVIANDO...';
  btnNewLeakSubmit.disabled    = true;

  const form = new FormData();
  form.append('music',  file);
  form.append('title',  title);
  form.append('artist', artist || 'ECLO');

  /* Adiciona capa se selecionada (não enviada para a API — usada localmente) */
  const coverFile = nlCoverInput.files[0];

  try {
    const res  = await fetch(API_BASE + '/api/music/upload', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + authToken },
      body:    form,
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast('Leak adicionada: ' + sanitizeInput(title, 40));
      closeModal(modalNewLeak);

      /* Reset do formulário */
      nlTitle.value  = '';
      nlArtist.value = '';
      nlAudioInput.value = '';
      nlCoverInput.value = '';
      nlAudioName.textContent = 'Escolher arquivo de áudio';
      nlCoverName.textContent = 'Escolher imagem de capa';

      /* Se teve capa, lê como base64 e salva localmente */
      if (coverFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
          /* Encontra a track recém criada e associa a capa */
          const newId = data.data.music._id;
          loadLeaksFromAPI().then(function () {
            const idx = tracks.findIndex(function (t) { return t.id === newId; });
            if (idx >= 0) { tracks[idx].cover = e.target.result; renderTrackList(); }
          });
        };
        reader.readAsDataURL(coverFile);
      } else {
        loadLeaksFromAPI();
      }
    } else {
      showToast(data.message || 'Erro no upload', 'err');
    }
  } catch (e) {
    showToast('Erro de conexão com a API', 'err');
  }

  btnNewLeakSubmit.textContent = 'ADICIONAR LEAK';
  btnNewLeakSubmit.disabled    = false;
}


/* ══════════════════════════════════════════════════════
   §14  DELETE DE TRACK (admin)
══════════════════════════════════════════════════════ */
async function deleteTrack(index) {
  if (!isAdmin || !authToken) { showToast('Acesso negado', 'err'); return; }
  const track = tracks[index];
  if (!track) return;

  if (!confirm('Excluir "' + track.title + '"?\nEsta ação não pode ser desfeita.')) return;

  try {
    const { ok, data } = await apiFetch('/api/music/' + track.id, { method: 'DELETE' });

    if (ok && data.success) {
      showToast('Leak excluída');

      /* Se era a track ativa, reseta o player */
      if (index === currentIndex) {
        pauseMusic();
        audioEl.src = '';
        if (currentBlobURL) { URL.revokeObjectURL(currentBlobURL); currentBlobURL = null; }
        currentIndex = -1;
        playerTitle.textContent  = 'SELECT A TRACK';
        playerArtist.textContent = '—';
        headerNow.textContent    = '— SELECT A TRACK —';
        progFill.style.width     = '0%';
      }

      loadLeaksFromAPI();
    } else {
      showToast(data.message || 'Erro ao excluir', 'err');
    }
  } catch (e) {
    showToast('Erro de conexão com a API', 'err');
  }
}


/* ══════════════════════════════════════════════════════
   §15  MODAIS
══════════════════════════════════════════════════════ */
function openModal(modal) {
  modal.removeAttribute('aria-hidden');
  modal.classList.add('open');
  const first = modal.querySelector('input, button:not(.modal-close)');
  if (first) setTimeout(function () { first.focus(); }, 60);
}

function closeModal(modal) {
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('open');
}

/* Fecha modal ao clicar no overlay */
[modalLogin, modalNewLeak].forEach(function (modal) {
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal(modal);
  });
});


/* ══════════════════════════════════════════════════════
   §16  EVENT LISTENERS
══════════════════════════════════════════════════════ */

/* Landing */
landing.addEventListener('click', enterSite);
landing.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterSite(); }
});

/* Header logo → Home */
headerLeft.setAttribute('role', 'button');
headerLeft.setAttribute('tabindex', '0');
headerLeft.setAttribute('aria-label', 'Voltar para a tela inicial');
headerLeft.style.cursor = 'pointer';
headerLeft.addEventListener('click', goToHomeScreen);
headerLeft.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToHomeScreen(); }
});

/* Botão ADMIN no header */
btnAdminOpen.addEventListener('click', function () {
  if (isAdmin) {
    if (confirm('Sair do modo admin?')) logoutAdmin();
  } else {
    openModal(modalLogin);
  }
});

/* Modal login */
modalLoginClose.addEventListener('click', function () {
  inputPass.value = '';
  inputLogin.value = '';
  loginError.hidden = true;
  closeModal(modalLogin);
});
btnLoginSubmit.addEventListener('click', secureLogin);
inputPass.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') secureLogin();
});
inputLogin.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') inputPass.focus();
});
[inputLogin, inputPass].forEach(function (inp) {
  inp.addEventListener('input', function () { loginError.hidden = true; });
});

/* Logout */
btnLogout.addEventListener('click', logoutAdmin);

/* Nova Leak */
btnNewLeak.addEventListener('click', function () {
  if (!isAdmin) return;
  openModal(modalNewLeak);
});
modalNewLeakClose.addEventListener('click', function () { closeModal(modalNewLeak); });
btnNewLeakSubmit.addEventListener('click', uploadLeak);

/* Preview nomes de arquivo */
nlAudioInput.addEventListener('change', function () {
  nlAudioName.textContent = this.files[0] ? sanitizeInput(this.files[0].name, 60) : 'Escolher arquivo de áudio';
});
nlCoverInput.addEventListener('change', function () {
  nlCoverName.textContent = this.files[0] ? sanitizeInput(this.files[0].name, 60) : 'Escolher imagem de capa';
});

/* Player */
btnPlay.addEventListener('click', function () { isPlaying ? pauseMusic() : playMusic(); });
btnNext.addEventListener('click', nextTrack);
btnPrev.addEventListener('click', previousTrack);

/* Teclado global */
document.addEventListener('keydown', function (e) {
  if (!app.classList.contains('on'))              return;
  if (document.activeElement.tagName === 'INPUT') return;
  if (modalLogin.classList.contains('open') || modalNewLeak.classList.contains('open')) return;

  switch (e.key) {
    case ' ':
      e.preventDefault();
      isPlaying ? pauseMusic() : playMusic();
      break;
    case 'ArrowRight': e.preventDefault(); nextTrack();     break;
    case 'ArrowLeft':  e.preventDefault(); previousTrack(); break;
    case 'ArrowUp':    e.preventDefault(); setVolume(Number(volSlider.value) + 5); break;
    case 'ArrowDown':  e.preventDefault(); setVolume(Number(volSlider.value) - 5); break;
    case 'Escape':
      closeModal(modalLogin);
      closeModal(modalNewLeak);
      break;
  }
});


/* ══════════════════════════════════════════════════════
   §17  INICIALIZAÇÃO
══════════════════════════════════════════════════════ */
setVolume(80);
restoreSession();  /* restaura sessão JWT se aba foi recarregada */
dvdBounce();       /* inicia animação do logo na landing */
