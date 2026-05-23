// Content Moderation Filter for jobsy.lv
// Covers Latvian, Russian, and English prohibited content

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  flaggedWords: string[];
}

// Banned categories:
// - Drugs/substances (narcotics, cannabis, cocaine, etc.)
// - Sexual services (prostitution, escort, adult services)
// - Weapons/firearms
// - Hate speech / discrimination
// - Scams / fraud keywords

const BANNED_PATTERNS = {
  // Drugs - Latvian
  lv_drugs: [
    "marihuana", "kanabis", "kokains", "heroins", "amfitamīns", "lsd", "ecstasy",
    "mdma", "spais", "zālīte", "zali", "zāles", "tirgot", "pārdot", "pirkt narko",
    "deva", "doz", "atkarīb", "narkomāns", "narko", "legāls", "legāli",
  ],
  // Drugs - Russian
  ru_drugs: [
    "марихуана", "каннабис", "кокаин", "героин", "амфетамин", "экстази",
    "спайс", "травка", "траву", "закладки", "закладка", "клады", "фен",
    "меф", "мефедрон", "альфа", "доза", "дозы", "наркоман", "наркотики",
    "продам траву", "куплю траву", "легальные",
  ],
  // Drugs - English
  en_drugs: [
    "marijuana", "cannabis", "weed", "cocaine", "heroin", "meth", "mdma",
    "ecstasy", "lsd", "acid", "dmt", "spice", "k2", "xanax", "oxycodone",
    "fentanyl", "dealer", "selling drugs", "buying drugs", "420",
  ],

  // Sexual services - Latvian
  lv_sexual: [
    "prostitut", "eskort", "seksa pakalpojum", "intīm pakalpojum", "erotisk",
    "masāža ar", "happy ending", "striptīz", "striptiz", "kameru", "camgirl",
    "sugardaddy", "sugar baby", "satiksmes", "intīmas", "naktsmājas",
    "nakts klubs", "adult", "porno", "pornogrāf",
  ],
  // Sexual services - Russian
  ru_sexual: [
    "проститут", "эскорт", "интим услуг", "интим", "секс услуг", "эротический",
    "массаж с", "индивидуалк", "камера", "вебкам", "содержанк", "барын",
    "секс за деньги", "интим салон", "стриптиз", "порно",
  ],
  // Sexual services - English
  en_sexual: [
    "prostitute", "escort service", "sex service", "sexual service", "erotic massage",
    "happy ending", "adult service", "camgirl", "onlyfans", "sugar daddy",
    "sugar baby", "brothel", "strip club", "escort girl", "call girl",
    "intimate", "xxx", "porn", "fetish", "bdsm service", "dominatrix",
  ],

  // Weapons - all languages
  weapons: [
    "ieroč", "оружие", "weapon", "pistole", "пистолет", "rifle", "винтовк",
    " šaujam", "гранат", "bomb", "бомб", "explosiv", "взрыв",
    "firearm", "gun for sale", "патрон", "ammunition",
  ],

  // Hate speech / discrimination
  hate: [
    "naci", "nazi", "фашист", "nacist", "hitler", "гитлер", "холокост",
    "holocaust", "kkk", "white power", "supremac", "rasist", "racist",
    "žīd", "kike", "nigger", "neger", "чурк", "хач", "пидор", "faggot",
  ],

  // Scams / fraud
  scams: [
    "банковская карта", "bank card", "cvv", "pin code", "password",
    "krāpniec", "afērist", "scammer", "investment 100%", "guaranteed profit",
    "get rich quick", "make money fast", "mlm", "pyramid", "ponzi",
  ],
};

// Combine all into single array
const ALL_BANNED_WORDS: string[] = Object.values(BANNED_PATTERNS).flat();

// Check if text contains a word. Uses simple includes() for non-ASCII patterns
// (like Cyrillic) because JavaScript \b word boundaries only work with ASCII chars.
function textContains(text: string, word: string): boolean {
  const idx = text.indexOf(word);
  if (idx === -1) return false;
  // For ASCII words: verify we're at a word boundary to avoid partial matches
  const isAscii = /^[\x00-\x7F]+$/.test(word);
  if (!isAscii) return true; // Non-ASCII: accept substring match (pattern is specific enough)
  // ASCII: check surrounding chars are not word chars
  const before = idx === 0 ? "" : text[idx - 1];
  const after = idx + word.length >= text.length ? "" : text[idx + word.length];
  const notBoundaryChar = /[a-z0-9]/;
  return !notBoundaryChar.test(before) && !notBoundaryChar.test(after);
}

export function moderateContent(title: string, description: string = ""): ModerationResult {
  const text = `${title} ${description}`.toLowerCase();
  const flaggedWords: string[] = [];

  for (const word of ALL_BANNED_WORDS) {
    if (textContains(text, word)) {
      flaggedWords.push(word);
    }
  }

  if (flaggedWords.length > 0) {
    // Determine category
    return {
      allowed: false,
      reason: `Content not allowed. Post violates Terms of Use.`,
      flaggedWords,
    };
  }

  // Check for disguised characters (leet speak, unicode tricks)
  const leetPatterns = [
    /w\s*e\s*e\s*d/i,
    /c\s*o\s*c\s*a\s*i\s*n\s*e/i,
    /h\s*e\s*r\s*o\s*i\s*n/i,
    /p\s*r\s*o\s*s\s*t\s*i\s*t\s*u\s*t/i,
    /e\s*s\s*c\s*o\s*r\s*t/i,
  ];

  for (const pattern of leetPatterns) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        reason: "Content not allowed. Disguised characters are prohibited.",
        flaggedWords: ["disguised_content"],
      };
    }
  }

  return { allowed: true, flaggedWords: [] };
}

// Check if a post needs admin review (soft flag - still posted but flagged)
export function softFlagCheck(title: string, description: string = ""): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const suspicious: string[] = [];

  const suspiciousPatterns = [
    "cash only", "только наличные", "tikai skaidra",
    "no questions asked", "без вопросов", "bez jautājumiem",
    "discreet", "дискретно", "diskrēti",
    "18+", "18 plus", "только 18",
    "no id needed", "без паспорта", "bez pases",
    "after dark", "только ночью", "tikai naktī",
  ];

  for (const pattern of suspiciousPatterns) {
    if (text.includes(pattern.toLowerCase())) {
      suspicious.push(pattern);
    }
  }

  return suspicious;
}
