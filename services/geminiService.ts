import { GoogleGenAI, Type } from "@google/genai";
import { Lead, AuditResult, DiscoveryResult } from "../types.ts";

// Initialize the Gemini client
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Enhanced Intent Scouter Agent
 * Specifically tuned to find high-intent "frustration" posts and comments on LinkedIn.
 */
export const discoverLeads = async (query: string): Promise<DiscoveryResult[]> => {
  const ai = getAIClient();
  const prompt = `
    TASK: Actively search for and identify high-intent sales leads on LinkedIn. 
    QUERY CONTEXT: "${query}"

    TARGET PERSONAS:
    - Founders, Business Owners, CEOs, CMOs, or Marketing Managers.
    - Geography: United States, United Kingdom, and European Union only.

    SEARCH INTENT (Look for Frustration Signals):
    Scour LinkedIn posts, comments, and public threads for users expressing active frustration or complaining about:
    1. "My website is too slow" or "Google PageSpeed is failing".
    2. "Our SEO rankings dropped" or "we aren't showing up on Google anymore".
    3. "The website looks terrible on mobile" or "mobile UX is broken".
    4. "Need a reliable web developer" because the previous one ghosted or failed.
    5. "Wasted money on SEO with no results".

    CRITICAL EXCLUSIONS:
    - ABSOLUTELY EXCLUDE freelance platforms (Upwork, Fiverr, Freelancer, Toptal, etc.).
    - EXCLUDE "Open to Work" posts or job seekers.
    - EXCLUDE automated/bot posts.

    REQUIRED OUTPUT FORMAT:
    Provide a list of 5 real individuals. For each, include:
    - full_name
    - title (e.g., "Founder & CEO")
    - company
    - linkedin_url (Direct link to the post, comment, or profile)
    - website (The company's primary domain if identifiable)
    - industry
    - country
    - intent_signal: Quote or summarize the specific frustration expressed (e.g., "Complained in a comment that their site takes 10 seconds to load on mobile")
    - source_platform: "LinkedIn Post" or "LinkedIn Comment"

    Return the results as a structured JSON array.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // High-reasoning model for complex intent detection
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

  try {
    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error("Failed to parse Discovery results", e);
    return [];
  }
};

/**
 * Site Auditor Agent - Analyzes specific technical debt
 */
export const analyzeWebsite = async (lead: Lead): Promise<AuditResult> => {
  const ai = getAIClient();
  const prompt = `
    Conduct an expert-level SEO and performance audit of: ${lead.website}
    
    Context:
    - Prospect: ${lead.full_name} (${lead.title})
    - Company: ${lead.company}
    - Industry: ${lead.industry}

    Identify 3-4 specific business-killing technical flaws. Translate these flaws into "Revenue Risk":
    - Slow speed -> "Customer Drop-off"
    - Poor SEO -> "Invisible to Market"
    - Weak CTAs -> "Wasted Traffic"
    - Bad Mobile UX -> "Losing 60% of potential buyers"

    Output the analysis in JSON.
  `;

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
            items: { type: Type.STRING }
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
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

  try {
    const text = response.text;
    if (!text) throw new Error("Empty analysis");
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("AI Analysis failed");
  }
};

/**
 * Sales Agent - Drafts the high-converting, empathetic outreach
 */
export const generateSalesMessage = async (lead: Lead, audit: AuditResult): Promise<string> => {
  const ai = getAIClient();
  const systemInstruction = `
    You are writing on behalf of Rana Waqas, an elite SEO & Web Performance Specialist.
    PROMPT ENGINEERING RULES:
    1. NEVER use generic templates or sales speak (e.g., "I hope this finds you well").
    2. START with a specific observation about their LinkedIn frustration if provided.
    3. MENTION one critical flaw found in their site: ${audit.pain_points[0]}.
    4. OFFER a "2-minute Loom audit" specifically for their role as ${lead.title}.
    5. TONE: Result-oriented (US), subtle/consultative (UK), or data-driven (EU) depending on their country: ${lead.country}.
  `;

  const prompt = `
    Prospect: ${lead.full_name}
    Frustration signal: ${lead.pain_points || 'General site optimization'}
    Primary technical flaw: ${audit.pain_points[0]}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.8,
    }
  });

  return response.text || "Failed to generate outreach message.";
};