
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
    const matchesWholeWord = words.some((word) => {
      if (word === bad) return true;
      // Recognize a short inflection suffix without matching profanity as an
      // arbitrary substring inside normal words, code, or pasted source text.
      return bad.length >= 4 && word.startsWith(bad) && word.length <= bad.length + 3;
    });
    if (matchesWholeWord) {
      return {
        flagged: true,
        reason: "Uygunsuz dil / küfür kullanımı",
      };
    }
  }

  return { flagged: false };
}
