/**
 * SILNIK GRY - obsługuje wszystkie 6 minigier.
 *
 * Zasady punktacji (ustalone przez Ciebie):
 * - każda minigra: max 150 pkt, min 50 pkt
 * - start: 150 pkt
 * - błąd (zgłoszony przez konkretną minigrę): -20 pkt
 * - każde 2 sekundy wykonywania zadania: -1 pkt
 *
 * Każda minigra definiowana jest w games-data.js jako obiekt:
 * { name: "Nazwa gry", render(container, api) { ... } }
 *
 * "api" przekazywane do każdej minigry:
 * - api.registerError()        -> zgłasza pełny błąd (-20 pkt)
 * - api.applyPenalty(points)   -> odejmuje dowolną, niestandardową liczbę punktów (np. "pół błędu" = 10 pkt)
 * - api.completeGame(score?)   -> kończy minigrę i przechodzi do następnej; opcjonalny "score" wymusza konkretny wynik (np. 50 pkt przy pominięciu gry)
 * - api.getElapsedSeconds()    -> ile sekund trwa aktualna minigra (gdyby gra chciała np. limit czasu)
 */

const GAME_CONFIG = {
  maxScore: 150,
  minScore: 50,
  errorPenalty: 20,
  secondsPerPenaltyPoint: 3,
};

/**
 * FILTR WULGARYZMÓW (kopia lekkiej wersji z backend/src/profanityFilter.js).
 *
 * UWAGA: to tylko kontrola "dla wygody gracza" - żeby dostał komunikat
 * od razu, bez czekania na odpowiedź serwera. Prawdziwe, niepodważalne
 * zabezpieczenie jest po stronie backendu (ten sam filtr w server.js) -
 * frontend zawsze da się obejść (np. przez konsolę przeglądarki), więc
 * backend i tak sprawdzi nazwę jeszcze raz przed zapisem do bazy.
 *
 * Jeśli zmieniasz listę słów, zaktualizuj ją w OBU miejscach.
 */
/**
 * FILTR WULGARYZMÓW (kopia lekkiej wersji z backend/src/profanityFilter.js).
 *
 * UWAGA: to tylko kontrola "dla wygody gracza" - żeby dostał komunikat
 * od razu, bez czekania na odpowiedź serwera. Prawdziwe, niepodważalne
 * zabezpieczenie jest po stronie backendu (ten sam filtr w server.js) -
 * frontend zawsze da się obejść (np. przez konsolę przeglądarki), więc
 * backend i tak sprawdzi nazwę jeszcze raz przed zapisem do bazy.
 *
 * Jeśli zmieniasz listę słów, zaktualizuj ją w OBU miejscach.
 *
 * WAŻNE: normalize() zwija powtórzone litery ("kuurwaaa" -> "kurwa").
 * Rdzenie w PROFANITY_FORBIDDEN_STEMS muszą być znormalizowane TĄ SAMĄ
 * funkcją (patrz PROFANITY_NORMALIZED_STEMS niżej) - inaczej słowa z
 * podwójną literą (np. "nigger", "faggot", "asshole") nigdy by się nie
 * złapały, bo znormalizowane wejście ("niger") nie może zawierać
 * dłuższego, niezmienionego rdzenia ("nigger").
 */
const PROFANITY_LEETSPEAK_MAP = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };
const PROFANITY_DIACRITICS_MAP = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };
const PROFANITY_FORBIDDEN_STEMS = [
  "kurw", "chuj", "huj", "pierdol", "pierdal", "pizd", "cwel", "pojeb", "zajeb", "jeb",
  "skurwysyn", "matol", "pedal", "cip", "dziwk", "kutas", "suka",
  "fuck", "shit", "bitch", "cunt", "asshole", "bastard", "nigger", "nigga", "faggot", "whore", "slut", "retard",
];

function normalizeProfanityText(text) {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => PROFANITY_DIACRITICS_MAP[ch] || PROFANITY_LEETSPEAK_MAP[ch] || ch)
    .join("")
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1+/g, "$1");
}

// Rdzenie normalizowane RAZ, przy starcie - tą samą funkcją co wejście
// (patrz duży komentarz wyżej - to naprawia lukę z "nigger"/"faggot"/"asshole").
const PROFANITY_NORMALIZED_STEMS = PROFANITY_FORBIDDEN_STEMS.map(normalizeProfanityText);

function containsProfanity(text) {
  if (typeof text !== "string") return false;
  const normalized = normalizeProfanityText(text);
  return PROFANITY_NORMALIZED_STEMS.some((stem) => normalized.includes(stem));
}

const state = {
  currentIndex: 0,
  scores: [],
  penalty: 0,
  startTime: 0,
  timerInterval: null,
};

const els = {};

function initGameEngine(games) {
  els.count = document.getElementById("game-count");
  els.name = document.getElementById("game-name");
  els.timerValue = document.getElementById("timer-value");
  els.container = document.getElementById("game-container");

  window.__GAMES__ = games;
  loadGame(0);
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  state.startTime = Date.now();
  updateTimerDisplay();
  state.timerInterval = setInterval(updateTimerDisplay, 250);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function updateTimerDisplay() {
  els.timerValue.textContent = formatTime(getElapsedSeconds());
}

function getElapsedSeconds() {
  return (Date.now() - state.startTime) / 1000;
}

function computeScore(penaltyPoints, elapsedSeconds) {
  const raw =
    GAME_CONFIG.maxScore -
    penaltyPoints -
    Math.floor(elapsedSeconds / GAME_CONFIG.secondsPerPenaltyPoint);
  return Math.max(GAME_CONFIG.minScore, Math.min(GAME_CONFIG.maxScore, raw));
}

function loadGame(index) {
  state.currentIndex = index;
  state.penalty = 0;

  const games = window.__GAMES__;
  const game = games[index];

  els.count.textContent = `Minigra ${index + 1}/${games.length}`;
  els.name.textContent = game.name;
  els.container.innerHTML = "";

  startTimer();

  const api = {
    registerError() {
      state.penalty += GAME_CONFIG.errorPenalty;
    },
    applyPenalty(points) {
      state.penalty += points;
    },
    getPenalty() {
      return state.penalty;
    },
    getElapsedSeconds,
    isLastGame() {
      return index === games.length - 1;
    },
    completeGame(overrideScore) {
      finishCurrentGame(overrideScore);
    },
  };

  game.render(els.container, api);
}

function finishCurrentGame(overrideScore) {
  stopTimer();

  let score;
  if (typeof overrideScore === "number") {
    score = Math.max(GAME_CONFIG.minScore, Math.min(GAME_CONFIG.maxScore, overrideScore));
  } else {
    const elapsed = getElapsedSeconds();
    score = computeScore(state.penalty, elapsed);
  }

  state.scores.push(score);

  const games = window.__GAMES__;
  const next = state.currentIndex + 1;

  if (next < games.length) {
    loadGame(next);
  } else {
    showSummary();
  }
}

function showSummary() {
  els.count.textContent = "Podsumowanie";
  els.name.textContent = "Koniec gry!";
  els.timerValue.textContent = "--:--";

  const total = state.scores.reduce((a, b) => a + b, 0);

  els.container.innerHTML = `
    <div class="summary-card">
      <h2 class="summary-heading">Twój wynik: <span class="summary-score">${total}</span> pkt</h2>

      <p class="summary-lorem">
        Gratulację! Udało ci się ukończyć wszystkie nasze minigry z&nbsp;naprawdę dobrym wynikiem.
        <br>
        <span class="highlight">Możesz teraz odebrać nagrodę za swój wynik już w&nbsp;najbliższy piątek</span>
        na naszej zbiórce, która odbędzie się pod Szkołą Podstawową nr. 4 w&nbsp;Oławie
        <span class="highlight">o&nbsp;godzinie 16:00</span>.
        Zachęcamy również do ponownego zagrania w&nbsp;nasze minigry i&nbsp;pobicia wyników innych graczy
        w&nbsp;celu zwiększenia wartości nagrody!
      </p>

      <label class="summary-label" for="player-name">Wpisz swoją nazwę, aby zapisać wynik na tablicy wyników:</label>
      <input type="text" id="player-name" class="summary-input" maxlength="20" placeholder="Twoja nazwa">

      <div class="summary-actions">
        <button id="save-score-btn" class="btn-play">Zapisz wynik</button>
        <a href="index.html" class="btn-secondary">Powrót do strony głównej</a>
      </div>

      <p class="summary-note" id="summary-note"></p>
    </div>
  `;

  document.getElementById("save-score-btn").addEventListener("click", async () => {
    const input = document.getElementById("player-name");
    const name = input.value.trim();
    const note = document.getElementById("summary-note");
    const saveBtn = document.getElementById("save-score-btn");

    if (!name) {
      note.textContent = "Podaj nazwę, aby zapisać wynik.";
      note.classList.add("error");
      return;
    }

    if (containsProfanity(name)) {
      note.textContent = "Ta nazwa zawiera niedozwolone słowa. Wybierz inną nazwę.";
      note.classList.add("error");
      return;
    }

    // blokujemy przycisk i input już na czas wysyłania - zapobiega to
    // podwójnemu zapisowi przy podwójnym kliknięciu / wolnym połączeniu
    saveBtn.disabled = true;
    input.disabled = true;
    note.classList.remove("error");
    note.textContent = "Zapisywanie wyniku...";

    try {
      await saveScore(name, total);
      note.textContent = "Wynik zapisany! Możesz wrócić na stronę główną.";
    } catch (err) {
      console.error("Błąd zapisu wyniku:", err);
      note.textContent = "Nie udało się zapisać wyniku - sprawdź połączenie i spróbuj ponownie.";
      note.classList.add("error");
      // odblokowujemy formularz, żeby gracz mógł spróbować jeszcze raz
      saveBtn.disabled = false;
      input.disabled = false;
    }
  });
}

// Wysyła wynik do backendu (POST /api/scores). API_BASE_URL pochodzi
// z config.js - patrz komentarz w tamtym pliku.
async function saveScore(name, score) {
  const response = await fetch(`${API_BASE_URL}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score }),
  });

  if (!response.ok) {
    // backend przy błędnych danych zwraca np. { error: "Nazwa gracza jest wymagana." }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Serwer zwrócił błąd (status ${response.status}).`);
  }

  return response.json();
}
