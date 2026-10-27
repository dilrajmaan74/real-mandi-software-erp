/**
 * Punjabi transliteration utility
 * Converts English phonetic input into Gurmukhi Punjabi.
 */

// Common Punjabi names, titles, relations, and words dictionary for instantaneous offline fallback
const COMMON_DICTIONARY: Record<string, string> = {
  // Surnames / Titles
  singh: 'ਸਿੰਘ',
  kaur: 'ਕੌਰ',
  sardar: 'ਸਰਦਾਰ',
  sardarni: 'ਸਰਦਾਰਨੀ',
  jatt: 'ਜੱਟ',
  maan: 'ਮਾਨ',
  dhillon: 'ਢਿੱਲੋਂ',
  sidhu: 'ਸਿੱਧੂ',
  gill: 'ਗਿੱਲ',
  sandhu: 'ਸੰਧੂ',
  grewal: 'ਗਰੇਵਾਲ',
  aulakh: 'ਔਲਖ',
  brar: 'ਬਰਾੜ',
  cheema: 'ਚੀਮਾ',
  bajwa: 'ਬਾਜਵਾ',
  sohi: 'ਸੋਹੀ',
  chahal: 'ਚਹਿਲ',
  deol: 'ਦਿਓਲ',
  randhawa: 'ਰੰਧਾਵਾ',
  sekho: 'ਸੇਖੋਂ',
  sekhon: 'ਸੇਖੋਂ',

  // Common First Names
  malkit: 'ਮਲਕੀਤ',
  harnek: 'ਹਰਨੇਕ',
  baldev: 'ਬਲਦੇਵ',
  gurmel: 'ਗੁਰਮੇਲ',
  gurpreet: 'ਗੁਰਪ੍ਰੀਤ',
  harpreet: 'ਹਰਪ੍ਰੀਤ',
  jaspreet: 'ਜਸਪ੍ਰੀਤ',
  jaswinder: 'ਜਸਵਿੰਦਰ',
  kuldeep: 'ਕੁਲਦੀਪ',
  kulwant: 'ਕੁਲਵੰਤ',
  manpreet: 'ਮਨਪ੍ਰੀਤ',
  amrit: 'ਅੰਮ੍ਰਿਤ',
  amrik: 'ਅਮਰੀਕ',
  jagjit: 'ਜਗਜੀਤ',
  jaspal: 'ਜਸਪਾਲ',
  satnam: 'ਸਤਨਾਮ',
  paramjit: 'ਪਰਮਜੀਤ',
  surjit: 'ਸੁਰਜੀਤ',
  hardeep: 'ਹਰਦੀਪ',
  davinder: 'ਦਵਿੰਦਰ',
  devinder: 'ਦਵਿੰਦਰ',
  rajinder: 'ਰਾਜਿੰਦਰ',
  balwinder: 'ਬਲਵਿੰਦਰ',
  bhagwant: 'ਭਗਵੰਤ',
  avtar: 'ਅਵਤਾਰ',
  dilraj: 'ਦਿਲਰਾਜ',
  beant: 'ਬੇਅੰਤ',
  tarseem: 'ਤਰਸੇਮ',
  tarsem: 'ਤਰਸੇਮ',
  nirmal: 'ਨਿਰਮਲ',
  sukha: 'ਸੁੱਖਾ',
  sukhwinder: 'ਸੁਖਵਿੰਦਰ',
  sukhpal: 'ਸੁਖਪਾਲ',
  amanpreet: 'ਅਮਨਪ੍ਰੀਤ',
  aman: 'ਅਮਨ',
  inderjit: 'ਇੰਦਰਜੀਤ',
  harminder: 'ਹਰਮਿੰਦਰ',
  harvinder: 'ਹਰਵਿੰਦਰ',
  gurmit: 'ਗੁਰਮੀਤ',
  gurmeet: 'ਗੁਰਮੀਤ',
  jarnail: 'ਜਰਨੈਲ',
  karnail: 'ਕਰਨੈਲ',
  major: 'ਮੇਜਰ',
  captain: 'ਕੈਪਟਨ',

  // Relations
  son: 'ਪੁੱਤਰ',
  puttar: 'ਪੁੱਤਰ',
  brother: 'ਭਰਾ',
  bhra: 'ਭਰਾ',
  wife: 'ਪਤਨੀ',
  father: 'ਪਿਤਾ',
  mother: 'ਮਾਤਾ',
  daughter: 'ਧੀ',
  joint: 'ਹਿੱਸੇਦਾਰ',
  partner: 'ਹਿੱਸੇਦਾਰ',

  // Towns & Villages
  bhadaur: 'ਭਦੌੜ',
  barnala: 'ਬਰਨਾਲਾ',
  moga: 'ਮੋਗਾ',
  khanna: 'ਖੰਨਾ',
  sangrur: 'ਸੰਗਰੂਰ',
  ludhiana: 'ਲੁਧਿਆਣਾ',
  jalandhar: 'ਜਲੰਧਰ',
  bathinda: 'ਬਠਿੰਡਾ',
  amritsar: 'ਅੰਮ੍ਰਿਤਸਰ',
  patiala: 'ਪਟਿਆਲਾ',
  meharaj: 'ਮਹਿਰਾਜ',
  mehraj: 'ਮਹਿਰਾਜ',
  kotkapura: 'ਕੋਟਕਪੂਰਾ',
  faridkot: 'ਫਰੀਦਕੋਟ',
  mansa: 'ਮਾਨਸਾ',
  dhuri: 'ਧੂਰੀ',
  malerkotla: 'ਮਲੇਰਕੋਟਲਾ',
  nabha: 'ਨਾਭਾ',
  samana: 'ਸਮਾਣਾ',
  raikot: 'ਰਾਏਕੋਟ',
  jagraon: 'ਜਗਰਾਉਂ',
  pind: 'ਪਿੰਡ',
  mandi: 'ਮੰਡੀ',
};

// In-memory cache for fast lookups
const transliterationCache = new Map<string, string>();

/**
 * Transliterates an English phonetic text to Gurmukhi Punjabi.
 * e.g. "Malkit Singh Bhadaur" -> "ਮਲਕੀਤ ਸਿੰਘ ਭਦੌੜ"
 */
export async function transliterateToPunjabi(text: string): Promise<string> {
  if (!text || !text.trim()) return '';

  const clean = text.trim();
  if (transliterationCache.has(clean.toLowerCase())) {
    return transliterationCache.get(clean.toLowerCase())!;
  }

  // Check word-by-word in dictionary first
  const words = clean.split(/\s+/);
  const matchedWords: (string | null)[] = words.map((w) => {
    const lower = w.toLowerCase().replace(/[^a-z]/g, '');
    return COMMON_DICTIONARY[lower] || null;
  });

  const allMatched = matchedWords.every((w) => w !== null);
  if (allMatched) {
    const result = matchedWords.join(' ');
    transliterationCache.set(clean.toLowerCase(), result);
    return result;
  }

  // Call Google Input Tools for high-accuracy phonetic transliteration
  try {
    const response = await fetch(
      `https://inputtools.google.com/request?text=${encodeURIComponent(
        clean
      )}&itc=pa-t-i0-und&num=1`
    );
    if (response.ok) {
      const data = await response.json();
      if (
        data &&
        data[0] === 'SUCCESS' &&
        data[1] &&
        data[1][0] &&
        data[1][0][1] &&
        data[1][0][1][0]
      ) {
        const transliterated = data[1]
          .map((item: any) => item[1]?.[0] || item[0])
          .join(' ');
        transliterationCache.set(clean.toLowerCase(), transliterated);
        return transliterated;
      }
    }
  } catch (err) {
    console.warn('Network transliteration unavailable, falling back to local:', err);
  }

  // Fallback: use whatever matched in dictionary, or original
  const fallback = words
    .map((w, idx) => matchedWords[idx] || w)
    .join(' ');
  transliterationCache.set(clean.toLowerCase(), fallback);
  return fallback;
}
