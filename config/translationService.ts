/**
 * Lightweight translation service using the public Google Translate API.
 * No API key required – uses the `client=gtx` endpoint.
 */

export const translateText = async (
  text: string,
  targetLang: 'pl' | 'en'
): Promise<string> => {
  if (!text || text.trim() === '') return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data[0]) {
      return data[0]
        .map((segment: any) => segment[0])
        .filter(Boolean)
        .join('');
    }
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text on error
  }
};
