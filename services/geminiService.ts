
import { GoogleGenAI, Type } from "@google/genai";
import { Lead, AuditResult, DiscoveryResult } from "../types";

// Initialize the Gemini client
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Lead Discovery Agent (Intent-Based Search)
 * Focused on finding people actively asking for Web/SEO help on social platforms.
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
    
    For each discovery, provide:
    - Full Name
    - Job Title
    - Company Name
    - LinkedIn URL
    - Company Website (if mentioned) or likely domain
    - Industry
    - Country
    - intent_signal: A 1-sentence description of the "Interest Signal" (e.g., "Posted in a business group asking for SEO agency recommendations")
    - source_platform: Where the intent was found (e.g., "LinkedIn Post", "Facebook Group")
    
    Return the results as a structured JSON array.
  `;

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

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Discovery results", e);
    return [];
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

    As a Web Dev & SEO Expert working for Rana Waqas, identify 3-4 specific business pain points related to:
    1. Page Load Speed
    2. Mobile UX Optimization
    3. Search Visibility (SEO)
    4. Conversion Rate Optimization (Missing CTAs)

    Avoid technical jargon. Focus on business impact (e.g., "losing customers due to slow mobile experience").
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
            items: { type: Type.STRING },
            description: "List of identified business pain points"
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Suggested high-level improvements"
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
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("AI Analysis failed");
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
    Goal: Mention the prospect's specific intent if available, reference their website's mobile/SEO flaw, and offer a free 2-minute audit video.
  `;

  const prompt = `
    Generate outreach message to ${lead.full_name} (${lead.title} @ ${lead.company}).
    Pain points identified: ${audit.pain_points.join(', ')}.
    Consultative recommendation: ${audit.recommendations[0]}.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.7,
    }
  });

  return response.text || "Drafting error.";
};
