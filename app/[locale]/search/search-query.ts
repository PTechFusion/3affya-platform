// Free-text matching for /search (rules S1, S2). Arabic and English are normalised the same way (hamza forms, taa marbuta,
// alef maqsura, diacritics, the article al-), small typos are tolerated, and everyday symptom words map to specialties, so
// "rash" finds dermatology instead of a surname. In memory for the prototype; task 2.1 moves this into Postgres full-text
// search with the same term list.

/** Lower case, accents and Arabic diacritics removed, letter variants folded, punctuation to spaces. */
export function normalise(s: string): string {
  return s
    .toLocaleLowerCase("en-US")
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drops the Arabic article so "الجلدية" and "جلدية" match. */
const stem = (word: string) => (word.length > 4 && word.startsWith("ال") ? word.slice(2) : word);

export const words = (s: string) => normalise(s).split(" ").filter(Boolean).map(stem);

const STOPWORDS = new Set(
  ["dr", "doctor", "doc", "the", "a", "an", "for", "in", "of", "and", "with", "د", "دكتور", "دكتوره", "طبيب", "طبيبه", "في", "من", "مع", "عن", "و"].map(stem),
);

/** Everyday words (English and Arabic) that point to a specialty. Rule S2: test symptom words like "rash". */
const RAW_TERMS: Array<{ words: string[]; specialties: string[] }> = [
  { words: ["rash", "skin", "itch", "itching", "acne", "hair loss", "طفح", "جلد", "جلدية", "حكة", "حساسية جلد", "حب الشباب", "تساقط الشعر"], specialties: ["dermatology", "allergy"] },
  { words: ["heart", "chest pain", "palpitations", "blood pressure", "hypertension", "قلب", "ضغط", "خفقان", "الم الصدر"], specialties: ["cardiology"] },
  { words: ["child", "children", "kid", "kids", "baby", "infant", "طفل", "اطفال", "رضيع", "ابني", "بنتي"], specialties: ["pediatrics", "family-medicine"] },
  { words: ["cough", "asthma", "breathing", "lungs", "سعال", "كحه", "ربو", "تنفس", "رئه"], specialties: ["pulmonology", "allergy"] },
  { words: ["diabetes", "sugar", "thyroid", "hormones", "سكر", "سكري", "غده", "درقيه", "هرمونات"], specialties: ["endocrinology"] },
  { words: ["back pain", "joint", "joints", "knee", "bone", "bones", "ظهر", "مفاصل", "ركبه", "عظام"], specialties: ["orthopedics", "sports-medicine", "pain"] },
  { words: ["headache", "migraine", "seizure", "epilepsy", "numbness", "صداع", "شقيقة", "صرع", "تشنج", "تنميل"], specialties: ["neurology"] },
  { words: ["anxiety", "depression", "sleep", "stress", "قلق", "اكتئاب", "نوم", "توتر"], specialties: ["psychiatry"] },
  { words: ["pregnancy", "pregnant", "period", "fertility", "حمل", "حامل", "دوره", "خصوبه", "نسائيه"], specialties: ["obgyn"] },
  { words: ["stomach", "acid", "reflux", "colon", "معده", "حموضه", "قولون", "هضم"], specialties: ["gastroenterology"] },
  { words: ["ear", "throat", "sinus", "nose", "tonsils", "اذن", "حلق", "جيوب", "انف", "لوز"], specialties: ["ent"] },
  { words: ["kidney", "kidneys", "kidney stones", "urine", "كلى", "كلية", "حصى", "بول"], specialties: ["nephrology", "urology"] },
  { words: ["anemia", "anaemia", "blood", "فقر الدم", "دم"], specialties: ["hematology"] },
  { words: ["eye", "eyes", "vision", "عين", "عيون", "نظر"], specialties: ["ophthalmology"] },
  { words: ["cancer", "tumor", "tumour", "سرطان", "ورم"], specialties: ["oncology"] },
  { words: ["allergy", "allergies", "حساسيه"], specialties: ["allergy"] },
  { words: ["fever", "infection", "حمى", "حرارة", "عدوى", "التهاب"], specialties: ["infectious-disease", "family-medicine"] },
];

const TERMS = RAW_TERMS.map((t) => ({ ...t, words: t.words.map((w) => words(w).join(" ")) }));

/** The everyday words that lead to a specialty, as written, for autocomplete keywords (typing "rash" suggests Dermatology). */
export const symptomWordsFor = (slug: string): string[] => RAW_TERMS.filter((t) => t.specialties.includes(slug)).flatMap((t) => t.words);

/** Edit distance at most `max`, with an early exit; enough for one or two typos. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      row.push(v);
      best = Math.min(best, v);
    }
    if (best > max) return false;
    prev = row;
  }
  return (prev[b.length] ?? max + 1) <= max;
}

/** Typos allowed for a word of this length: none under 4 letters, one at 4, two from 5 (Layla / Leila, Kareem / Karim). */
const typoBudget = (len: number) => (len >= 5 ? 2 : len === 4 ? 1 : 0);

export type ParsedQuery = { tokens: string[]; specialties: Set<string> };

export function parseQuery(q: string): ParsedQuery {
  const tokens = words(q).filter((t) => !STOPWORDS.has(t));
  const padded = ` ${tokens.join(" ")} `;
  const specialties = new Set<string>();
  for (const term of TERMS) {
    const hit = term.words.some((w) =>
      w.includes(" ") ? padded.includes(` ${w} `) : tokens.some((t) => t === w || (t.length >= 5 && within(t, w, 1))),
    );
    if (hit) term.specialties.forEach((s) => specialties.add(s));
  }
  return { tokens, specialties };
}

/** 3 for a whole word, 2 for a prefix ("card" in cardiology), 1 for a near miss. */
function tokenScore(token: string, haystack: string[]): number {
  let best = 0;
  for (const w of haystack) {
    if (w === token) return 3;
    if (token.length >= 2 && w.startsWith(token)) best = Math.max(best, 2);
    else if (best < 1 && typoBudget(token.length) > 0 && within(token, w, typoBudget(token.length))) best = 1;
  }
  return best;
}

/** Relevance of one doctor for the query: word matches on names, specialty, expertise and city, plus mapped symptom words. */
export function scoreDoctor(query: ParsedQuery, haystack: string[], specialty: string): number {
  if (!query.tokens.length) return 0;
  let score = 0;
  for (const t of query.tokens) score += tokenScore(t, haystack);
  if (query.specialties.has(specialty)) score += 2;
  return score;
}
