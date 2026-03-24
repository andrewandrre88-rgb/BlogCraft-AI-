import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateOutline(niche: string, audience: string, keyword: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a detailed blog post outline for a blog in the ${niche} niche, targeting ${audience}. The main keyword is "${keyword}". Use Markdown format.`,
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Outline Error:", error);
    throw error;
  }
}

export async function generateDraft(niche: string, audience: string, keyword: string, length: string, outline: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a full blog post based on the following outline:
      
      Outline:
      ${outline}
      
      Niche: ${niche}
      Audience: ${audience}
      Keyword: ${keyword}
      Target Length: ${length}
      
      Format the output in Markdown. Ensure it is engaging and SEO-friendly.`,
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Draft Error:", error);
    throw error;
  }
}
