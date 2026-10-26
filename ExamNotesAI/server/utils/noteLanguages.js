export const NOTE_LANGUAGES = ["English", "Hindi", "Hinglish"]
export const DEFAULT_NOTE_LANGUAGE = "English"

export const normalizeNoteLanguage = (value) =>
  NOTE_LANGUAGES.includes(value) ? value : DEFAULT_NOTE_LANGUAGE

export const getOutputLanguagePrompt = (language) => {
  const selectedLanguage = normalizeNoteLanguage(language)
  const languageInstructions = {
    English: `- Write in clear, simple English.`,
    Hindi: `- Write in Devanagari using simple textbook-style Hindi a school or college student would use in an exam.
- Avoid rare or heavily Sanskritised words.
- Keep common technical terms, acronyms, formulas, units, and code in English; optionally include the English term in brackets the first time.
- For Hindi text values, escape line breaks as \\n and never include literal line breaks inside a JSON text value.
- Use only straight double quotes as JSON delimiters; avoid double quotes inside text values and use single quotes instead.`,
    Hinglish: `- Write Hindi in Roman/English letters with Hindi grammar and common English technical terms, as students naturally speak.
- Never use any Devanagari character anywhere in the output.
- Keep formulas and acronyms in normal English.
- Style example: "Kisi bhi topic ko samajhne ke liye pehle uske main steps clear karo."`
  }

  return `
    OUTPUT LANGUAGE:
    OUTPUT LANGUAGE: ${selectedLanguage}. Write ALL string VALUES (notes, subTopics, revisionPoints, questions, chart titles) in this language.
    This applies to notes, all sub-topic lists, revision points, short questions, long questions, the diagram question text, and chart titles.
    Keep every JSON KEY exactly as specified (including the star keys); never translate keys.
    The importance value must stay as stars. Diagram type and chart type must stay in English.
    Diagram node labels and chart data "name" fields must be short and use English/Roman letters only so Mermaid and Recharts render correctly.
    Keep the diagram text valid Mermaid and follow the existing diagram syntax rules. Chart values must remain numeric.
    ${languageInstructions[selectedLanguage]}
  `
}
