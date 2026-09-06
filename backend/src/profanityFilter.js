/**
 * FILTR WULGARYZMÓW - blokuje obraźliwe/niecenzuralne nazwy graczy.
 *
 * Jak to działa:
 * 1. normalize() sprowadza tekst do "najprostszej" postaci: małe litery,
 *    usunięte polskie znaki diakrytyczne, zamienione typowe podstawienia
 *    "leetspeak" (np. 4 -> a), usunięte spacje/kropki/cyfry, zwinięte
 *    powtórzone litery (żeby "kuurwaaa" i "kurwa" wyglądały tak samo).
 * 2. containsProfanity() sprawdza, czy znormalizowany tekst zawiera
 *    którykolwiek z zakazanych "rdzeni" słów (patrz FORBIDDEN_STEMS) -
 *    rdzenie są normalizowane DOKŁADNIE TĄ SAMĄ funkcją co wejście,
 *    żeby oba porównywane teksty były w tym samym "alfabecie".
 *
 * Rdzenie zamiast całych słów - dzięki temu jeden wpis w liście (np. "kurw")
 * łapie wszystkie odmiany ("kurwa", "kurwo", "kurwy", "kurwiszcze"...).
 *
 * UWAGA: to prosty filtr oparty na dopasowaniu tekstu, nie sztuczna
 * inteligencja - nie złapie każdej możliwej próby obejścia, ale pokrywa
 * zdecydowaną większość realistycznych przypadków (duże/małe litery,
 * spacje między literami, powtórzone litery, proste podstawienia cyfr).
 *
 * WAŻNE: normalize() zwija powtórzone litery ("kuurwaaa" -> "kurwa").
 * To musi być zastosowane SYMETRYCZNIE - zarówno do sprawdzanego tekstu,
 * jak i do samej listy FORBIDDEN_STEMS - inaczej każde zakazane słowo
 * zawierające podwójną literę (np. "nigger", "faggot", "asshole") nigdy
 * by się nie złapało, bo znormalizowany tekst ("niger") nie może zawierać
 * dłuższego, niezmienionego rdzenia ("nigger"). Dlatego NORMALIZED_STEMS
 * jest budowane raz, przy starcie, przez tę samą funkcję normalize().
 */

const LEETSPEAK_MAP = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
};

const DIACRITICS_MAP = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

// Rdzenie polskich i angielskich wulgaryzmów/obelg. Krótkie rdzenie (3-5
// znaków) łapią więcej odmian, ale zwiększają ryzyko fałszywych trafień -
// jeśli jakieś imię/nazwa zacznie być niesłusznie blokowana, to pierwsze
// miejsce do sprawdzenia.
const FORBIDDEN_STEMS = [
  // polskie
  "kurw",
  "chuj",
  "huj",
  "pierdol",
  "pierdal",
  "pizd",
  "cwel",
  "pojeb",
  "zajeb",
  "jeb",
  "skurwysyn",
  "matol",
  "pedal",
  "cip",
  "dziwk",
  "kutas",
  "suka",
  "hitler",
  "ejakulat",
  "epstein",
  "blyat",
  "naplet",
  "pała",
  "szon",
  "cuck",
  "kurewka",
  "seks",
  "sperma",
  "cum",
  "piwo",
  "wóda",
  "wódka",
  "rucha",
  "ćpun",
  "mefe",
  "naga",
  // angielskie
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "bastard",
  "nigger",
  "nigga",
  "faggot",
  "whore",
  "slut",
  "retard",
  "dick",
  "dih",
];

function normalize(text) {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => DIACRITICS_MAP[ch] || LEETSPEAK_MAP[ch] || ch)
    .join("")
    .replace(/[^a-z]/g, "") // usuwa spacje, cyfry (te nieprzetłumaczone), kropki, myślniki itd.
    .replace(/(.)\1+/g, "$1"); // "kuurwaaaa" -> "kurwa" (dowolny ciąg powtórzeń -> 1 litera)
}

// Rdzenie normalizowane RAZ, przy starcie - tą samą funkcją co wejście,
// żeby porównanie było symetryczne (patrz duży komentarz u góry pliku).
const NORMALIZED_FORBIDDEN_STEMS = FORBIDDEN_STEMS.map(normalize);

function containsProfanity(text) {
  if (typeof text !== "string") return false;
  const normalized = normalize(text);
  return NORMALIZED_FORBIDDEN_STEMS.some((stem) => normalized.includes(stem));
}

module.exports = { containsProfanity, normalize };
