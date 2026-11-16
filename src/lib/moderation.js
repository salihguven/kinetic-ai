
// src/lib/moderation.js

export const MAX_STRIKES = 3;

const BAD_WORDS = [
  "piç",
  "pic",
  "orospu",
  "oç",
  "oc",
  "amk",
  "aq",
  "amına",
  "amina",
  "yarrak",
  "yarak",
  "sik",
  "sikerim",
  "sikeyim",
  "siktir",
  "göt",
  "götveren",
  "kahpe",
  "pezevenk",
  "ibne",
  "puşt",
  "şerefsiz",
  "serefsiz",
  "fuck",
  "bitch",
  "asshole",
  "motherfucker",
];

export function checkContentModeration(text = "") {
  const normalized = String(text)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return { flagged: false };
  }

  const words = normalized.split(" ");

  for (const bad of BAD_WORDS) {
    if (
      words.includes(bad) ||
      (bad.length >= 4 && normalized.includes(bad))
    ) {
      return {
        flagged: true,
        reason: "Uygunsuz dil / küfür kullanımı",
      };
    }
  }

  return { flagged: false };
}
