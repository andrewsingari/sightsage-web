import OpenAI from "openai"

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" }
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return { statusCode: 500, body: "Missing OPENAI_API_KEY" }

    const client = new OpenAI({ apiKey })
    const { profile, scores } = JSON.parse(event.body || "{}")
    const messages = [
      { role: "system", content: "You are a helpful health assistant. Keep advice general and non-medical." },
      { role: "user", content: `Based on this data, give one concise, encouraging wellness tip.\nProfile: ${JSON.stringify(profile)}\nScores: ${JSON.stringify(scores)}` }
    ]

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 160
    })

    const tip = resp.choices?.[0]?.message?.content?.trim() || "No tip available."
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ tip }) }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }
  }
}