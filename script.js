function checkOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  const el = document.getElementById("rotate-message");
  if (el) el.style.display = isPortrait ? "flex" : "none";
}
window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);
document.addEventListener("DOMContentLoaded", checkOrientation);


const allCards = [
  { name: "Fitoplâncton", level: "producer", img: "assets/cards/producers_fitoplancton.png" },
  { name: "Algas verdes", level: "producer", img: "assets/cards/producers_algas_verdes.png" },
  { name: "Algas vermelhas", level: "producer", img: "assets/cards/producers_algas_vermelhas.png" },

  { name: "Zooplâncton", level: "primary", img: "assets/cards/primary_zooplancton.png" },
  { name: "Peixe pequeno", level: "primary", img: "assets/cards/primary_peixe_pequeno.png" },
  { name: "Cavalo-marinho", level: "primary", img: "assets/cards/primary_cavalo_marinho.png" },

  { name: "Água-viva", level: "secondary", img: "assets/cards/secondary_agua_viva.png" },
  { name: "Lula", level: "secondary", img: "assets/cards/secondary_lula.png" },
  { name: "Peixe carnívoro", level: "secondary", img: "assets/cards/secondary_peixe_carnivoro.png" },

  { name: "Tubarão", level: "tertiary", img: "assets/cards/tertiary_tubarao.png" },
  { name: "Orca", level: "tertiary", img: "assets/cards/tertiary_orca.png" },
  { name: "Foca", level: "tertiary", img: "assets/cards/tertiary_foca.png" }
];


const cardsContainer = document.getElementById('cards-container');
const dropZone = document.getElementById('drop-zone');
const checkBtn = document.getElementById('check-btn');
const newBtn = document.getElementById('new-btn');
const effectsToggle = document.getElementById('effects-toggle');
const musicToggle = document.getElementById('music-toggle');
const toast = document.getElementById('toast');
const scoreBoard = document.getElementById('scoreboard');
const music = document.getElementById('background-music');


let score = 0;
let effectsOn = false;
let musicOn = false;


let audioObjects = { drag: null, drop: null, correct: null, wrong: null };
let audioCtx = null;

function prepareAudio() {
  if (dragSoundUrl) audioObjects.drag = new Audio(dragSoundUrl);
  if (dropSoundUrl) audioObjects.drop = new Audio(dropSoundUrl);
  if (correctSoundUrl) audioObjects.correct = new Audio(correctSoundUrl);
  if (wrongSoundUrl) audioObjects.wrong = new Audio(wrongSoundUrl);

  for (let k in audioObjects) if (audioObjects[k]) audioObjects[k].volume = 0.35;

  if (!audioCtx && !dragSoundUrl) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  }
}

function playTone(freq = 440, time = 120, type = 'sine', gain = 0.06) {
  if (!effectsOn) return;
  if (audioObjects.drag || audioObjects.drop || audioObjects.correct || audioObjects.wrong) {
    return;
  }
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(g.gain.value, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + time / 1000);
  o.stop(now + time / 1000 + 0.02);
}

function playSound(name) {
  if (!effectsOn) return;

  if (audioObjects[name]) {
    audioObjects[name].currentTime = 0;
    audioObjects[name].play().catch(() => { });
    return;
  }

  switch (name) {
    case 'drag': playTone(420, 80, 'sine', 0.03); break;
    case 'drop': playTone(520, 80, 'triangle', 0.03); break;
    case 'correct': playTone(720, 220, 'sine', 0.08); setTimeout(() => playTone(920, 140, 'sine', 0.06), 140); break;
    case 'wrong': playTone(220, 220, 'sawtooth', 0.07); break;
  }
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function showToast(msg, type = '', timeout = 1700) {
  toast.textContent = msg;

  // Remove classes anteriores
  toast.classList.remove('correct', 'wrong', 'hint');

  // Adiciona a classe do tipo (se houver)
  if (type) toast.classList.add(type);

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), timeout);
}

function createCardElement(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.tabIndex = 0;
  el.dataset.level = card.level;
  el.dataset.name = card.name;
  const img = document.createElement('img');
  img.src = card.img;
  img.alt = card.name;
  img.onerror = () => {
    img.remove();
    const ph = document.createElement('div');
    ph.className = 'placeholder';
    ph.innerText = card.name;
    el.appendChild(ph);
  };
  el.appendChild(img);
  return el;
}

function generateDeckAndRender() {
  cardsContainer.innerHTML = '';
  dropZone.innerHTML = '<div class="assembly-hint">Arraste as cartas para cá — reordene livremente</div>';
  const producers = allCards.filter(c => c.level === 'producer');
  const primaries = allCards.filter(c => c.level === 'primary');
  const secondaries = allCards.filter(c => c.level === 'secondary');
  const tertiaries = allCards.filter(c => c.level === 'tertiary');

  let selected = [pickRandom(producers), pickRandom(primaries), pickRandom(secondaries), pickRandom(tertiaries)];
  do { selected = shuffle(selected); } while (selected[0].level === 'producer' && selected[1].level === 'primary' && selected[2].level === 'secondary' && selected[3].level === 'tertiary');

  selected.forEach(c => cardsContainer.appendChild(createCardElement(c)));

  enableSortables();
}

let timeLeft = 30;
let timerInterval;

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 30;
  document.getElementById("timer-desktop").textContent = `Tempo: ${timeLeft}s`;
  document.getElementById("timer-mobile").textContent = `Tempo: ${timeLeft}s`;

  timerInterval = setInterval(() => {
    timeLeft--;

    document.getElementById("timer-desktop").textContent = `Tempo: ${timeLeft}s`;
    document.getElementById("timer-mobile").textContent = `Tempo: ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);

      const placed = Array.from(dropZone.querySelectorAll('.card'));
      if (placed.length === 4) {
        verifyChain();
      } else {
        showToast('Tempo esgotado! Coloque 4 cartas para verificar.');
        playSound('wrong');
      }

      setTimeout(() => {
        generateDeckAndRender();
        startTimer();
      }, 1000);
    }
  }, 1000);
}


let sortableCards, sortableAssembly;
let activeGhost = null; // referência ao clone no mobile

function enableSortables() {
  if (sortableCards) try { sortableCards.destroy(); } catch (e) { }
  if (sortableAssembly) try { sortableAssembly.destroy(); } catch (e) { }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const baseOpts = {
    group: 'shared',
    animation: 180,
    swapThreshold: 0.6,
    fallbackOnBody: true,         // clone vai para <body>, evita bug de ancestral com transform
    forceFallback: isMobile,      // só força no mobile
    ghostClass: 'card-ghost',     // elemento no container enquanto arrasta
    chosenClass: 'card-chosen',   // item original escolhido
    fallbackClass: 'card-fallback', // CLONE mobile (o "fantasma" de verdade)
    onStart: () => playSound('drag'),
    onClone: (evt) => {
      // pega o clone criado pelo fallback
      activeGhost = evt.clone;
      // garante que o fantasma tenha o mesmo tamanho visual da carta original
      activeGhost.style.width = evt.item.offsetWidth + 'px';
      activeGhost.style.height = evt.item.offsetHeight + 'px';
    },
    onEnd: () => {
      activeGhost = null; // solta referência ao finalizar
    },
  };

  sortableCards = new Sortable(cardsContainer, baseOpts);

  sortableAssembly = new Sortable(dropZone, {
    ...baseOpts,
    onAdd: () => {
      playSound('drop');
      const hint = dropZone.querySelector('.assembly-hint');
      if (hint) hint.remove();
    }
  });

  // Atualiza a posição do fantasma no mobile
 if (isMobile) {
  document.addEventListener('touchmove', (e) => {
    if (!activeGhost || !e.touches[0]) return;

    const t = e.touches[0];

    // atualiza posição do fantasma
    activeGhost.style.setProperty('--x', t.clientX + 'px');
    activeGhost.style.setProperty('--y', t.clientY + 'px');

    // impede rolagem vertical
    e.preventDefault();
  }, { passive: false });
}
}

  function verifyChain() {
    const placed = Array.from(dropZone.querySelectorAll('.card'));

    if (placed.length !== 4) {
      showToast('Coloque as 4 cartas na área de montagem!', 'hint'); // toast azul
      playSound('wrong');
      triggerFlash('hint', 300);     // flash azul
      return;
    }

    const expected = ['producer', 'primary', 'secondary', 'tertiary'];
    const levels = placed.map(c => c.dataset.level);
    const ok = levels.join(',') === expected.join(',');

    if (ok) {
      score++;
      scoreBoard.textContent = `Pontuação: ${score}`;
      showToast('Parabéns! Cadeia correta!', 'correct');   // toast verde
      playSound('correct');
      triggerFlash('correct', 300);  // flash verde
    } else {
      showToast('Cadeia incorreta! Tente novamente.', 'wrong'); // toast vermelho
      playSound('wrong');
      triggerFlash('wrong', 300);    // flash vermelho
    }


    setTimeout(() => {
      generateDeckAndRender();
      startTimer();
    }, 900);
  }

  effectsToggle.addEventListener('click', () => {
    effectsOn = !effectsOn;
    effectsToggle.textContent = effectsOn ? 'Efeitos: On' : 'Efeitos: Off';

    if (effectsOn && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  });

  musicToggle.addEventListener('click', () => {
    if (!musicOn) {
      music.volume = 0.15;
      music.play().catch(() => { });
      musicToggle.textContent = 'Música: On';
      musicOn = true;
    } else {
      music.pause();
      musicToggle.textContent = 'Música: Off';
      musicOn = false;
    }
  });

  checkBtn.addEventListener('click', verifyChain);
  newBtn.addEventListener('click', () => {
    generateDeckAndRender();
    startTimer();
  });

  prepareAudio();
  generateDeckAndRender();
  startTimer();

  (function makeBubbles() {
    const container = document.querySelector('.bubbles');
    if (!container) return;
    container.innerHTML = '';
    const count = 18;
    for (let i = 0; i < count; i++) {
      const b = document.createElement('div'); b.className = 'bubble';
      const size = 10 + Math.random() * 70; b.style.width = `${size}px`; b.style.height = `${size}px`;
      b.style.left = `${Math.random() * 100}%`; b.style.animationDuration = `${12 + Math.random() * 18}s`;
      b.style.opacity = `${0.05 + Math.random() * 0.25}`; container.appendChild(b);
    }
  })();

  dropZone.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyChain(); });

  const volumeSlider = document.getElementById('volume-slider');
  volumeSlider.addEventListener('input', () => {
    music.volume = parseFloat(volumeSlider.value);
  });

  function triggerFlash(type = 'correct', duration = 300) {
    const flash = document.getElementById('flash-overlay');
    flash.className = `flash ${type}`;
    flash.style.opacity = '1';

    setTimeout(() => {
      flash.style.opacity = '0';
    }, duration);
  }