const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.6-flash"]
const MAX_UNAVAILABLE_RETRIES = 1

export class GeminiServiceError extends Error {
    constructor(model, status, message) {
        super(`Gemini model ${model} failed (${status}): ${message}`)
        this.name = "GeminiServiceError"
        this.model = model
        this.status = status
    }
}

export const generateGeminiResponse = async (prompt) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured on the backend")
    }

    for (const [modelIndex, model] of GEMINI_MODELS.entries()) {
        const maxRetries = modelIndex === 0 ? MAX_UNAVAILABLE_RETRIES : 0
        for (let attempt = 0; ; attempt += 1) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt
                                    }
                                ]
                            }
                        ],
                        generationConfig: {
                            responseMimeType: "application/json"
                        }
                    })
                }
            )

            const data = await response.json()
            if (response.status === 503 && attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
                continue
            }

            if (!response.ok) {
                const error = new GeminiServiceError(
                    model,
                    response.status,
                    data.error?.message || "Unknown provider error"
                )
                if (response.status === 503 && modelIndex < GEMINI_MODELS.length - 1) {
                    console.warn(`${error.message}; trying ${GEMINI_MODELS[modelIndex + 1]}`)
                    break
                }
                throw error
            }

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!text) {
                throw new Error(`Gemini model ${model} returned no generated text`)
            }

            const cleanText = text
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim()

            try {
                return JSON.parse(cleanText)
            } catch {
                throw new Error(`Gemini model ${model} returned invalid JSON`)
            }
        }
    }
}