/**
 * LISTA 6 MINIGIER - w tej kolejności.
 * Na razie każda to placeholder testowy: pozwala sprawdzić działanie
 * silnika (stoper, punktacja, przejścia, podsumowanie), zanim podmienimy
 * zawartość na prawdziwą rozgrywkę.
 *
 * Każdy obiekt gry ma:
 * - name: nazwa wyświetlana w nagłówku
 * - render(container, api): rysuje UI gry w danym kontenerze
 *   - api.registerError() wywołuj przy każdym błędzie (-20 pkt)
 *   - api.completeGame() wywołuj, gdy gracz kończy zadanie
 */

function buildPlaceholderGame(name) {
  return {
    name,
    render(container, api) {
      container.innerHTML = `
        <div class="game-placeholder">
          <p class="placeholder-title">Tu pojawi się gra: <strong>${name}</strong></p>
          <p class="placeholder-note">To tymczasowy ekran testowy silnika - opisz zasady tej gry, a zostanie ona tu zaprogramowana.</p>
          <div class="placeholder-actions">
            <button class="btn-play" id="ph-complete">Zakończ minigrę</button>
            <button class="btn-secondary" id="ph-error" type="button">Symuluj błąd (-20 pkt)</button>
          </div>
        </div>
      `;
      container.querySelector("#ph-complete").addEventListener("click", () => api.completeGame());
      container.querySelector("#ph-error").addEventListener("click", () => api.registerError());
    },
  };
}

/**
 * MINIGRA 1: Deszyfrowanie czekoladki.
 * Losowe słowo z listy jest wyświetlane czcionką "ChocolateCipher"
 * (podmienia zwykłe litery na symbole szyfru). Gracz wpisuje odgadnięte
 * słowo zwykłym alfabetem i klika "Sprawdź".
 * - błędna odpowiedź: -20 pkt (api.registerError()), można próbować dalej
 * - poprawna odpowiedź: krótki komunikat, potem automatyczne przejście dalej
 */
const CIPHER_WORDS = [
  "Terenowy",
  "Szyszki",
  "Harcersko",
  "szyfrowanie",
  "Enigma",
  "surwiwal",
  "ekwipunek",
  "Patrolowy",
  "eksploracja",
  "siekiera",
];

const cipherGame = {
  name: "Deszyfrowanie czekoladki",
  render(container, api) {
    const targetWord = CIPHER_WORDS[Math.floor(Math.random() * CIPHER_WORDS.length)];
    let errorCount = 0;

    container.innerHTML = `
      <div class="cipher-game">
        <img src="assets/games/szyfr-zasady.png" alt="Zasady szyfru czekoladowego" class="cipher-rules-img">
        <p class="cipher-instructions">Rozszyfruj poniższe słowo zapisane szyfrem czekoladowym, którego zasady przedstawione są na grafice i wpisz je w polu poniżej. Zauważ, że litera zmienia się w zależności od położenia kropki.</p>
        <div class="cipher-word">${targetWord}</div>
        <input type="text" id="cipher-input" class="cipher-input" placeholder="Wpisz rozszyfrowane słowo" autocomplete="off">
        <button id="cipher-check" class="btn-play">Sprawdź</button>
        <p id="cipher-feedback" class="cipher-feedback"></p>
      </div>
    `;

    const input = container.querySelector("#cipher-input");
    const feedback = container.querySelector("#cipher-feedback");
    const checkBtn = container.querySelector("#cipher-check");

    function lockControls() {
      checkBtn.disabled = true;
      input.disabled = true;
    }

    function checkAnswer() {
      const guess = input.value.trim().toLowerCase();
      const correct = targetWord.trim().toLowerCase();

      if (guess === correct) {
        feedback.textContent = "Poprawnie! Przechodzimy do kolejnej minigry...";
        feedback.className = "cipher-feedback ok";
        lockControls();
        setTimeout(() => api.completeGame(), 1200);
        return;
      }

      errorCount += 1;
      api.registerError();

      if (errorCount >= 3) {
        feedback.textContent = "Nic straconego! Ta minigra zostaje pominięta, ale i tak zaliczamy Ci 50 punktów - powodzenia w następnej!";
        feedback.className = "cipher-feedback bad";
        lockControls();
        setTimeout(() => api.completeGame(50), 2000);
      } else {
        feedback.textContent = "Błąd! Spróbuj jeszcze raz.";
        feedback.className = "cipher-feedback bad";
      }
    }

    checkBtn.addEventListener("click", checkAnswer);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") checkAnswer();
    });
  },
};

/**
 * MINIGRA 3: Strzał z łuku (SVG, przeciąganie = kąt + siła naciągu).
 */
const archeryGame = {
  name: "Strzał z łuku",
  render(container, api) {
    const VIEW_W = 400;
    const VIEW_H = 600;
    const PIVOT = { x: 200, y: 460 };
    const MAX_DRAW = 110;
    const MAX_ANGLE = 19.6;
    const MIN_POWER_TO_FIRE = 0.4;
    const TARGET_Y = 95;
    const TRACK_MIN = 70;
    const TRACK_MAX = 330;
    const OUTER_R = 34;
    const BULLSEYE_R = 11;
    const TOTAL_ARROWS = 3;
    const TARGET_SPEED = 0.55;

    let arrowsUsed = 0;
    let finished = false;
    let busy = false;
    let dragging = false;
    let power = 0;
    let angleDeg = 0;
    let targetX = 200;
    let targetFrozen = false;
    let elapsedTotal = 0;
    let lastFrameTime = null;

    container.innerHTML = `
      <div class="archery-game">
        <div class="archery-board">
          <svg id="archery-svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" class="archery-svg" style="touch-action:none;">
            <g id="target-group">
              <circle cx="200" cy="${TARGET_Y}" r="${OUTER_R}" fill="#cfcfcf" stroke="#3d3d3d" stroke-width="2"></circle>
              <circle cx="200" cy="${TARGET_Y}" r="${OUTER_R * 0.6}" fill="#9a9a9a"></circle>
              <circle cx="200" cy="${TARGET_Y}" r="${BULLSEYE_R}" fill="#e2352f"></circle>
            </g>
            <g id="flying-layer"></g>
            <g id="bow-group" transform="rotate(0 ${PIVOT.x} ${PIVOT.y})">
              <path d="M110,${PIVOT.y} Q200,${PIVOT.y - 95} 290,${PIVOT.y}" fill="none" stroke="#8a5a2b" stroke-width="9" stroke-linecap="round"></path>
              <line id="string-left" x1="110" y1="${PIVOT.y}" x2="200" y2="${PIVOT.y}" stroke="#e8e0d0" stroke-width="3"></line>
              <line id="string-right" x1="290" y1="${PIVOT.y}" x2="200" y2="${PIVOT.y}" stroke="#e8e0d0" stroke-width="3"></line>
              <g id="arrow-visual">
                <line id="arrow-shaft" x1="200" y1="${PIVOT.y - 110}" x2="200" y2="${PIVOT.y}" stroke="#e2352f" stroke-width="4"></line>
                <polygon id="arrow-head" points="200,${PIVOT.y - 122} 191,${PIVOT.y - 106} 209,${PIVOT.y - 106}" fill="#e2352f"></polygon>
              </g>
            </g>
          </svg>

          <div class="archery-overlay-top">
            <p class="archery-instructions">Przeciągnij łuk w dół, aby go naciągnąć i wycelować w ruchomą tarczę. Traf w sam jej środek a przejdziesz minigrę!</p>
            <div class="archery-counter" id="archery-counter">Strzał 1/${TOTAL_ARROWS}</div>
          </div>

          <p class="archery-feedback-overlay" id="archery-feedback"></p>
        </div>
      </div>
    `;

    const svgEl = container.querySelector("#archery-svg");
    const bowGroup = container.querySelector("#bow-group");
    const stringLeft = container.querySelector("#string-left");
    const stringRight = container.querySelector("#string-right");
    const arrowShaft = container.querySelector("#arrow-shaft");
    const arrowVisual = container.querySelector("#arrow-visual");
    const targetGroup = container.querySelector("#target-group");
    const flyingLayer = container.querySelector("#flying-layer");
    const counterEl = container.querySelector("#archery-counter");
    const feedbackEl = container.querySelector("#archery-feedback");

    function toSvgCoords(clientX, clientY) {
      const rect = svgEl.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * VIEW_W,
        y: ((clientY - rect.top) / rect.height) * VIEW_H,
      };
    }

    function renderBowState() {
      const nockY = PIVOT.y + power * MAX_DRAW;
      stringLeft.setAttribute("y2", nockY);
      stringRight.setAttribute("y2", nockY);
      arrowShaft.setAttribute("y2", nockY);
      bowGroup.setAttribute("transform", `rotate(${angleDeg} ${PIVOT.x} ${PIVOT.y})`);
    }

    function updateFromPointer(clientX, clientY) {
      const p = toSvgCoords(clientX, clientY);
      const dx = p.x - PIVOT.x;
      const dy = p.y - PIVOT.y;
      power = Math.max(0, Math.min(1, dy / MAX_DRAW));
      // ujemny znak = odwrócony kierunek obracania względem przeciągnięcia
      angleDeg = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, -dx * 0.25));
      renderBowState();
    }

    function animateResetBow() {
      const startPower = power;
      const startAngle = angleDeg;
      const duration = 220;
      const t0 = performance.now();
      function step(t) {
        const p = Math.min(1, (t - t0) / duration);
        power = startPower * (1 - p);
        angleDeg = startAngle * (1 - p);
        renderBowState();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function onPointerDown(e) {
      if (finished || busy) return;
      dragging = true;
      updateFromPointer(e.clientX, e.clientY);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    }
    function onPointerMove(e) {
      if (!dragging) return;
      updateFromPointer(e.clientX, e.clientY);
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      if (power < MIN_POWER_TO_FIRE) {
        animateResetBow();
        return;
      }
      fireArrow(angleDeg);
    }

    svgEl.addEventListener("pointerdown", onPointerDown);

    function animateTarget(now) {
      if (finished) return;
      if (lastFrameTime === null) lastFrameTime = now;
      const dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      // tarcza zamraża się na czas lotu strzały, żeby to co widać
      // pokrywało się dokładnie z tym, co jest oceniane jako trafienie
      if (!targetFrozen) {
        elapsedTotal += dt;
        targetX = 200 + 130 * Math.sin(elapsedTotal * TARGET_SPEED);
        targetGroup.querySelectorAll("circle").forEach((c) => c.setAttribute("cx", targetX));
      }
      requestAnimationFrame(animateTarget);
    }
    requestAnimationFrame(animateTarget);

    function fireArrow(angle) {
      busy = true;
      targetFrozen = true;
      arrowsUsed += 1;
      counterEl.textContent = `Strzał ${Math.min(arrowsUsed, TOTAL_ARROWS)}/${TOTAL_ARROWS}`;

      const frozenTargetX = targetX;
      const rad = (angle * Math.PI) / 180;
      const startX = PIVOT.x + 110 * Math.sin(rad);
      const startY = PIVOT.y - 110 * Math.cos(rad);

      // strzała leci po linii dokładnie wzdłuż kąta, w który wycelowany
      // jest łuk (prosta rzutowana od punktu obrotu przez grot, aż do
      // wysokości tarczy) - a nie po niezależnie wyliczonej trasie
      const landingX = PIVOT.x + (PIVOT.y - TARGET_Y) * Math.tan(rad);

      // ukryj strzałę spoczywającą na cięciwie - od teraz reprezentuje ją
      // osobny, latający element, żeby nie było wizualnego "skoku"
      arrowVisual.style.opacity = "0";

      const flying = document.createElementNS("http://www.w3.org/2000/svg", "line");
      flying.setAttribute("x1", startX);
      flying.setAttribute("y1", startY);
      flying.setAttribute("x2", startX);
      flying.setAttribute("y2", startY);
      flying.setAttribute("stroke", "#e2352f");
      flying.setAttribute("stroke-width", "4");
      flying.setAttribute("stroke-linecap", "round");
      flyingLayer.appendChild(flying);

      const duration = 380;
      const t0 = performance.now();
      function step(now) {
        const p = Math.min(1, (now - t0) / duration);
        const curX = startX + (landingX - startX) * p;
        const curY = startY + (TARGET_Y - startY) * p;
        flying.setAttribute("x2", curX);
        flying.setAttribute("y2", curY);
        flying.setAttribute("x1", startX + (curX - startX) * Math.max(0, p - 0.15));
        flying.setAttribute("y1", startY + (curY - startY) * Math.max(0, p - 0.15));
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          flyingLayer.removeChild(flying);
          // dopiero teraz łuk wraca do pozycji neutralnej
          power = 0;
          angleDeg = 0;
          renderBowState();
          arrowVisual.style.opacity = "1";
          evaluateShot(landingX, frozenTargetX);
        }
      }
      requestAnimationFrame(step);
    }

    function endGameSkipped() {
      finished = true;
      feedbackEl.textContent = "Strzały się skończyły! Ta minigra zostaje pominięta, ale i tak zaliczamy Ci 50 punktów - powodzenia w następnej!";
      feedbackEl.className = "archery-feedback-overlay bad";
      setTimeout(() => api.completeGame(50), 2000);
    }

    function evaluateShot(landingX, frozenTargetX) {
      const dist = Math.abs(landingX - frozenTargetX);

      if (dist <= BULLSEYE_R) {
        finished = true;
        feedbackEl.textContent = "Prosto w środek! Świetny strzał! Przechodzimy do kolejnej minigry...";
        feedbackEl.className = "archery-feedback-overlay ok";
        setTimeout(() => api.completeGame(), 1200);
        return;
      }

      if (dist <= OUTER_R) {
        api.applyPenalty(10);
        feedbackEl.textContent = "Trafiono tarczę, ale nie w sam środek.";
      } else {
        api.registerError();
        feedbackEl.textContent = "Pudło! Strzała nie trafiła w tarczę.";
      }
      feedbackEl.className = "archery-feedback-overlay bad";

      if (arrowsUsed >= TOTAL_ARROWS) {
        endGameSkipped();
      } else {
        busy = false;
        targetFrozen = false;
      }
    }
  },
};

/**
 * MINIGRA 5: Mapa Oławy.
 * Gracz widzi nazwę miejsca w Oławie i musi zaznaczyć je na interaktywnej
 * mapie (Leaflet + OpenStreetMap), klikając w odpowiedni punkt, a potem
 * zatwierdzić wybór przyciskiem.
 * - trafienie w promień tolerancji danego miejsca: sukces, przejście dalej
 * - pudło: -20 pkt (api.registerError()), gracz ma 3 próby
 * - po wykorzystaniu 3 prób bez trafienia: automatyczne zaliczenie na 50 pkt
 */
const OLAWA_PLACES = [
  { name: "Dworzec PKP Oława", lat: 50.93097, lng: 17.29695, radius: 150 },
  { name: "Szpital w Oławie", lat: 50.95218066842174, lng: 17.28547078989738, radius: 130 },
  { name: "Hufiec ZHP Oława Kamienna 4", lat: 50.936720853993656, lng: 17.29901856055208, radius: 130 },
  { name: "Komenda Powiatowa Policji w Oławie", lat: 50.94234391380608, lng: 17.296833905545103, radius: 130 },
  { name: "Pomnik Stulecia Niepodległości", lat: 50.93385859353967, lng: 17.298018480064037, radius: 130 },
];

const MAP_CENTER = [50.9375, 17.2955];
const MAP_ATTEMPTS = 3;

function loadLeaflet(onReady) {
  if (window.L) {
    onReady();
    return;
  }
  if (window.__leafletLoading__) {
    window.__leafletLoading__.push(onReady);
    return;
  }
  window.__leafletLoading__ = [onReady];

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
  document.head.appendChild(link);

  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
  script.onload = () => {
    const callbacks = window.__leafletLoading__ || [];
    window.__leafletLoading__ = null;
    callbacks.forEach((cb) => cb());
  };
  document.head.appendChild(script);
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const mapGame = {
  name: "Mapa",
  render(container, api) {
    const place = OLAWA_PLACES[Math.floor(Math.random() * OLAWA_PLACES.length)];
    let attemptsLeft = MAP_ATTEMPTS;
    let guessMarker = null;
    let finished = false;

    container.innerHTML = `
      <div class="map-game">
        <p class="map-instructions">Zaznacz na mapie, gdzie znajduje się:</p>
        <div class="map-target-name">${place.name}</div>
        <div id="map-widget" class="map-widget"></div>
        <p class="map-attempts" id="map-attempts">Pozostałe próby: ${attemptsLeft}</p>
        <div class="map-actions">
          <button id="map-confirm" class="btn-play" disabled>Zatwierdź lokalizację</button>
        </div>
        <p id="map-feedback" class="map-feedback"></p>
      </div>
    `;

    const confirmBtn = container.querySelector("#map-confirm");
    const feedback = container.querySelector("#map-feedback");
    const attemptsEl = container.querySelector("#map-attempts");

    loadLeaflet(() => {
      if (finished) return;

      const map = L.map(container.querySelector("#map-widget")).setView(MAP_CENTER, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e) => {
        if (finished) return;
        if (guessMarker) {
          guessMarker.setLatLng(e.latlng);
        } else {
          guessMarker = L.marker(e.latlng).addTo(map);
        }
        confirmBtn.disabled = false;
        feedback.textContent = "";
        feedback.className = "map-feedback";
      });

      confirmBtn.addEventListener("click", () => {
        if (!guessMarker || finished) return;

        const guess = guessMarker.getLatLng();
        const distance = haversineMeters(guess.lat, guess.lng, place.lat, place.lng);

        if (distance <= place.radius) {
          finished = true;
          feedback.textContent = "Trafiony punkt! Przechodzimy do kolejnej minigry...";
          feedback.className = "map-feedback ok";
          confirmBtn.disabled = true;
          setTimeout(() => api.completeGame(), 1200);
          return;
        }

        attemptsLeft -= 1;
        api.registerError();
        attemptsEl.textContent = `Pozostałe próby: ${attemptsLeft}`;

        if (attemptsLeft <= 0) {
          finished = true;
          feedback.textContent =
            "Niestety, to nie to miejsce. Zaliczamy minimalne 50 punktów - powodzenia w następnej!";
          feedback.className = "map-feedback bad";
          confirmBtn.disabled = true;
          setTimeout(() => api.completeGame(50), 2000);
        } else {
          feedback.textContent = "To nie ta lokalizacja. Spróbuj jeszcze raz.";
          feedback.className = "map-feedback bad";
        }
      });
    });
  },
};

/**
 * MINIGRA: Quiz z 4 odpowiedziami.
 * Losowe pytanie z puli (większość jednokrotnego wyboru, jedno pytanie
 * wielokrotnego wyboru - zaznaczone jako "type: multi").
 * - dobra odpowiedź: sukces, przejście dalej (api.completeGame(), a więc
 *   normalne odejmowanie punktów za czas jak w silniku)
 * - zła odpowiedź: błąd (-20 pkt) i NOWE losowe pytanie
 * - zła odpowiedź na tym drugim pytaniu: kolejny błąd i automatyczne
 *   zaliczenie na 50 pkt (klasyczny "skip" jak w innych minigrach)
 *
 * UWAGA: w pytaniu 4 ("Która z tych rzeczy nie przyda się Tobie podczas
 * wędrówki w góry?") nie było oznaczenia poprawnej odpowiedzi wykrzyknikiem
 * - przyjąłem "Szampon" jako logicznie poprawną. Jeśli miało być inaczej,
 * wystarczy przestawić "correct: true" na inną opcję w QUIZ_QUESTIONS.
 */
const QUIZ_QUESTIONS = [
  {
    question: "Która z tych nazw węzłów nie istnieje?",
    type: "single",
    options: [
      { text: "Przyjaźni", correct: false },
      { text: "Ratowniczy", correct: false },
      { text: "Płaski", correct: false },
      { text: "Polski", correct: true },
    ],
  },
  {
    question: "Jaki rodzaj drewna najlepiej rozpali się podczas deszczu?",
    type: "single",
    options: [
      { text: "Patyczki z jemioły", correct: false },
      { text: "Kora brzozowa", correct: true },
      { text: "Buk", correct: false },
      { text: "Patyczki z Dębu", correct: false },
    ],
  },
  {
    question: "Jaka Drużyna Harcerska działa w SP4?",
    type: "single",
    options: [
      { text: '5 Drużyna Harcerska "Czarne Wilki"', correct: true },
      { text: '35 Drużyna Harcerska "Wilki"', correct: false },
      { text: '101 Drużyna Harcerska "Wilki"', correct: false },
      { text: '5 Drużyna Harcerska "Brzozy"', correct: false },
    ],
  },
  {
    // patrz UWAGA w komentarzu na górze pliku - brak wykrzyknika w źródle
    question: "Która z tych rzeczy nie przyda się Tobie podczas wędrówki w góry?",
    type: "single",
    options: [
      { text: "Powerbank", correct: false },
      { text: "Kompas", correct: false },
      { text: "Szampon", correct: true },
      { text: "Czekolada", correct: false },
    ],
  },
  {
    question: "Które z tych rzeczy można zrobić na ognisku?",
    type: "multi",
    options: [
      { text: "Podpłomyki", correct: true },
      { text: "Spaghetti", correct: true },
      { text: "Pierogi Ruskie", correct: true },
      { text: "Leczo", correct: true },
    ],
  },
  {
    question: "Po zaszyfrowaniu, którym z tych szyfrów, zamiast liter będziesz widział obrazki?",
    type: "single",
    options: [
      { text: "Szyfr Cezara", correct: false },
      { text: "Czekoladka", correct: true },
      { text: "Gaderypoluki", correct: false },
      { text: "Ułamkowy", correct: false },
    ],
  },
  {
    question: 'Co oznacza ten znak patrolowy "--->-->"?',
    type: "single",
    options: [
      { text: "Wracać", correct: false },
      { text: "Ukryj się tutaj", correct: false },
      { text: "Biec tędy", correct: false },
      { text: "Iść szybko tędy", correct: true },
    ],
  },
  {
    question: "Gdzie Hufiec ZHP Oława jeździ najczęściej na obóz?",
    type: "single",
    options: [
      { text: "Gdańsk", correct: false },
      { text: "Katowice", correct: false },
      { text: "Lubiatowo", correct: true },
      { text: "Dębica", correct: false },
    ],
  },
  {
    question: 'Jaki kolor chust mają harcerze 5. Drużyny Harcerskiej "Czarne Wilki"?',
    type: "single",
    options: [
      { text: "Czerwono-Czarne", correct: true },
      { text: "Biało-Zielone", correct: false },
      { text: "Czarno-Zielone", correct: false },
      { text: "Czerwono-Białe", correct: false },
    ],
  },
  {
    question: 'W jakie dni odbywają się zbiórki 5. Drużyny Harcerskiej "Czarne Wilki"?',
    type: "single",
    options: [
      { text: "Piątki", correct: true },
      { text: "Soboty", correct: false },
      { text: "Środy", correct: false },
      { text: "Wtorki", correct: false },
    ],
  },
];

// Wspólna, globalna pula "zużytych" pytań - dzięki temu obie minigry
// "Quiz z 4 odpowiedziami" w jednej rozgrywce (patrz GAMES niżej) nigdy
// nie wylosują tego samego pytania. Zeruje się dopiero, gdy pula się
// wyczerpie (co przy 10 pytaniach i max. 4 losowaniach na rozgrywkę nie
// powinno się zdarzyć) albo przy odświeżeniu strony / nowej rozgrywce.
const usedQuizQuestionIndices = new Set();

function pickQuizQuestionIndex() {
  if (usedQuizQuestionIndices.size >= QUIZ_QUESTIONS.length) {
    usedQuizQuestionIndices.clear();
  }
  let idx;
  do {
    idx = Math.floor(Math.random() * QUIZ_QUESTIONS.length);
  } while (usedQuizQuestionIndices.has(idx));
  usedQuizQuestionIndices.add(idx);
  return idx;
}

const quizGame = {
  name: "Quiz z 4 odpowiedziami",
  render(container, api) {
    let attemptsUsed = 0;
    let finished = false;

    function renderQuestion() {
      const q = QUIZ_QUESTIONS[pickQuizQuestionIndex()];
      const inputType = q.type === "multi" ? "checkbox" : "radio";

      container.innerHTML = `
        <div class="quiz-game">
          <p class="quiz-instructions">${
            q.type === "multi" ? "Zaznacz wszystkie poprawne odpowiedzi:" : "Wybierz poprawną odpowiedź:"
          }</p>
          <div class="quiz-question">${q.question}</div>
          <form class="quiz-options" id="quiz-form">
            ${q.options
              .map(
                (opt, i) => `
              <label class="quiz-option">
                <input type="${inputType}" name="quiz-opt" value="${i}">
                <span>${opt.text}</span>
              </label>`
              )
              .join("")}
          </form>
          <button id="quiz-submit" class="btn-play">Sprawdź</button>
          <p id="quiz-feedback" class="quiz-feedback"></p>
        </div>
      `;

      const form = container.querySelector("#quiz-form");
      const submitBtn = container.querySelector("#quiz-submit");
      const feedback = container.querySelector("#quiz-feedback");

      submitBtn.addEventListener("click", () => {
        if (finished) return;

        const inputs = Array.from(form.querySelectorAll("input"));
        const selected = inputs.filter((i) => i.checked).map((i) => Number(i.value));

        if (selected.length === 0) {
          feedback.textContent = "Zaznacz odpowiedź, zanim sprawdzisz.";
          feedback.className = "quiz-feedback bad";
          return;
        }

        const correctIndices = q.options
          .map((opt, i) => (opt.correct ? i : null))
          .filter((i) => i !== null);

        const isCorrect =
          selected.length === correctIndices.length &&
          selected.every((i) => correctIndices.includes(i));

        inputs.forEach((input) => {
          input.disabled = true;
        });
        submitBtn.disabled = true;

        if (isCorrect) {
          finished = true;
          feedback.textContent = api.isLastGame()
            ? "Brawo! Udało ci się ukończyć każdą minigrę!"
            : "Poprawnie! Przechodzimy do kolejnej minigry...";
          feedback.className = "quiz-feedback ok";
          setTimeout(() => api.completeGame(), 1200);
          return;
        }

        attemptsUsed += 1;
        api.registerError();

        if (attemptsUsed >= 2) {
          finished = true;
          feedback.textContent = api.isLastGame()
            ? "Niestety, znów źle. Zaliczamy minimalne 50 punktów."
            : "Niestety, znów źle. Zaliczamy minimalne 50 punktów - powodzenia w następnej!";
          feedback.className = "quiz-feedback bad";
          setTimeout(() => api.completeGame(50), 2000);
        } else {
          feedback.textContent = "Błędna odpowiedź. Kolejne pytanie...";
          feedback.className = "quiz-feedback bad";
          setTimeout(renderQuestion, 1400);
        }
      });
    }

    renderQuestion();
  },
};

/**
 * MINIGRA: Quiz prawda / fałsz.
 * Te same zasady co w Quizie z 4 odpowiedziami: zła odpowiedź = błąd
 * (-20 pkt) i nowe losowe stwierdzenie, druga zła odpowiedź = kolejny
 * błąd i automatyczne zaliczenie na 50 pkt.
 *
 * Stwierdzenia powstały z Twoich pytań 4-odpowiedziowych: każde pytanie
 * dało jedno stwierdzenie prawdziwe (z poprawną odpowiedzią) i jedno
 * fałszywe (z jedną z błędnych odpowiedzi).
 */
const TRUE_FALSE_STATEMENTS = [
  {
    statement: "Krzyżem Harcerskim oznacza się przynależność do Związku Harcerstwa Polskiego.",
    answer: true,
  },
  {
    statement: "Symbolem przynależności do Związku Harcerstwa Polskiego jest Liść Dębu.",
    answer: false,
  },
  {
    statement: "Harcerz jest Skautem",
    answer: true,
  },
  {
    statement: "Harcerze dzielnie służyli podczas II Wojny Światowej jako ''Szare Szeregi''",
    answer: true,
  },
  {
    statement: "Przy pakowaniu się, najcięższe rzeczy należy umieścić NA DNIE plecaka",
    answer: true,
  },
  {
    statement: "Podczas wędrówki największą stratą byłby brak ładowarki do telefonu.",
    answer: false,
  },
  {
    statement:
      "Gdy przez założony bandaż na ranie nadal przecieka krew, należy nałożyć kolejną warstwę opatrunku.",
    answer: true,
  },
  {
    statement: "Gdy przez założony bandaż na ranie nadal przecieka krew, wystarczy regularnie zdejmować bandaż i przemywać ranę wodą.",
    answer: false,
  },
];

const trueFalseGame = {
  name: "Quiz prawda / fałsz",
  render(container, api) {
    let attemptsUsed = 0;
    let finished = false;
    const usedIndices = [];

    function pickIndex() {
      if (usedIndices.length >= TRUE_FALSE_STATEMENTS.length) {
        usedIndices.length = 0;
      }
      let idx;
      do {
        idx = Math.floor(Math.random() * TRUE_FALSE_STATEMENTS.length);
      } while (usedIndices.includes(idx));
      usedIndices.push(idx);
      return idx;
    }

    function renderStatement() {
      const item = TRUE_FALSE_STATEMENTS[pickIndex()];

      container.innerHTML = `
        <div class="tf-game">
          <p class="tf-instructions">Prawda czy fałsz?</p>
          <div class="tf-statement">${item.statement}</div>
          <div class="tf-actions">
            <button id="tf-true" class="btn-play">Prawda</button>
            <button id="tf-false" class="btn-play">Fałsz</button>
          </div>
          <p id="tf-feedback" class="tf-feedback"></p>
        </div>
      `;

      const trueBtn = container.querySelector("#tf-true");
      const falseBtn = container.querySelector("#tf-false");
      const feedback = container.querySelector("#tf-feedback");

      function handleAnswer(answer) {
        if (finished) return;

        trueBtn.disabled = true;
        falseBtn.disabled = true;

        if (answer === item.answer) {
          finished = true;
          feedback.textContent = "Poprawnie! Przechodzimy do kolejnej minigry...";
          feedback.className = "tf-feedback ok";
          setTimeout(() => api.completeGame(), 1200);
          return;
        }

        attemptsUsed += 1;
        api.registerError();

        if (attemptsUsed >= 2) {
          finished = true;
          feedback.textContent = "Niestety, znów źle. Zaliczamy minimalne 50 punktów - powodzenia w następnej!";
          feedback.className = "tf-feedback bad";
          setTimeout(() => api.completeGame(50), 2000);
        } else {
          feedback.textContent = "Niestety, zła odpowiedź, spróbuj ponownie...";
          feedback.className = "tf-feedback bad";
          setTimeout(renderStatement, 1400);
        }
      }

      trueBtn.addEventListener("click", () => handleAnswer(true));
      falseBtn.addEventListener("click", () => handleAnswer(false));
    }

    renderStatement();
  },
};

const GAMES = [
  cipherGame,
  quizGame,
  archeryGame,
  trueFalseGame,
  mapGame,
  quizGame,
];

document.addEventListener("DOMContentLoaded", () => {
  initGameEngine(GAMES);
});
