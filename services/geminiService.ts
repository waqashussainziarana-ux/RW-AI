import { GoogleGenAI, Type } from "@google/genai";
import { Lead, AuditResult, DiscoveryResult } from "../types.ts";

// Helper to get a fresh AI client instance using the current environment key
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing in the environment.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

/**
 * Lead Discovery Agent (Intent-Based Search)
 */
export const discoverLeads = async (query: string): Promise<DiscoveryResult[]> => {
  const ai = getAIClient();
  const prompt = `
    Find 5 individuals or business owners who have recently (last 30 days) expressed interest online in: "${query}".
    Focus specifically on finding posts, comments, or public profile updates on LinkedIn, Facebook, X (Twitter), or business forums.
    
    CRITICAL RULES:
    1. EXCLUDE all results from freelance marketplaces: Freelancer.com, Upwork, Fiverr, Toptal, or Guru.
    2. LOOK FOR intent signals: Posts asking for recommendations, complaints about current slow websites, or mentions of starting a new business venture.
    3. TARGET: US, UK, or EU markets.
    
    Return the results as a structured JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              full_name: { type: Type.STRING },
              title: { type: Type.STRING },
              company: { type: Type.STRING },
              linkedin_url: { type: Type.STRING },
              website: { type: Type.STRING },
              industry: { type: Type.STRING },
              country: { type: Type.STRING },
              intent_signal: { type: Type.STRING },
              source_platform: { type: Type.STRING },
            },
            required: ["full_name", "title", "company", "linkedin_url", "website", "industry", "country", "intent_signal", "source_platform"]
          }
        }
      }
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error("Discovery error:", e);
    throw e;
  }
};

/**
 * Site Auditor Agent
 */
export const analyzeWebsite = async (lead: Lead): Promise<AuditResult> => {
  const ai = getAIClient();
  const prompt = `
    Analyze the following lead's business context and website:
    URL: ${lead.website}
    Company: ${lead.company}
    Industry: ${lead.industry}
    Role: ${lead.title}

    As a Web Dev & SEO Expert identify 3-4 specific business pain points related to speed, mobile UX, SEO, and conversion.
    Avoid technical jargon. Focus on business impact.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pain_points: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            severity: {
              type: Type.STRING,
              enum: ['low', 'medium', 'high'],
            }
          },
          required: ["pain_points", "recommendations", "severity"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (e) {
    console.error("Analysis error:", e);
    throw e;
  }
};

/**
 * Sales Agent
 */
export const generateSalesMessage = async (lead: Lead, audit: AuditResult): Promise<string> => {
  const ai = getAIClient();
  const systemInstruction = `
    You are writing on behalf of Rana Waqas, a high-end Web Development & SEO Consultant.
    Tone: Professional, empathetic, helpful. 
    Goal: Mention the prospect's specific intent, reference their website's mobile/SEO flaw, and offer a free 2-minute audit video.
  `;

  const prompt = `
    Generate outreach message to ${lead.full_name} (${lead.title} @ ${lead.company}).
    Pain points identified: ${audit.pain_points.join(', ')}.
    Consultative recommendation: ${audit.recommendations[0]}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "I was unable to draft a message at this time.";
  } catch (e) {
    console.error("Messaging error:", e);
    return "Error generating sales message.";
  }
};