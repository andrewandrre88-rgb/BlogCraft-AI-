import { GoogleGenAI } from "@google/genai";

export async function generateOutline(niche: string, audience: string, keyword: string) {
  try {
    const response = await fetch("/api/ai/outline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niche, audience, keyword }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to generate outline");
    return data.text;
  } catch (error: any) {
    console.error("Gemini Outline Error:", error);
    throw error;
  }
}

export async function generateDraft(niche: string, audience: string, keyword: string, length: string, outline: string) {
  try {
    const response = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niche, audience, keyword, length, outline }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to generate draft");
    return data.text;
  } catch (error: any) {
    console.error("Gemini Draft Error:", error);
    throw error;
  }
}
