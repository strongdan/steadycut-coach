import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { VertexAI } from "@google-cloud/vertexai";

export type CoachingInput = {
  userName: string;
  tone: string;
  adherenceScore: number;
  weight?: number | null;
  mood?: number | null;
  energy?: number | null;
  notes?: string | null;
};

export async function generateCoachFeedback(input: CoachingInput): Promise<string> {
  if (env.AI_PROVIDER !== "vertex") {
    return buildFallbackResponse(input);
  }

  const prompt = `
    You are a professional fat-loss coach for a program called SteadyCut. 
    Your goal is to provide brief, actionable, and supportive feedback on a client's daily check-in.
    
    Client Name: ${input.userName}
    Coaching Tone: ${input.tone} (nurturing, standard, or aggressive)
    Adherence Score: ${input.adherenceScore}/10 (higher is better)
    Current Weight: ${input.weight || "Not recorded"}
    Mood: ${input.mood || "Not recorded"}/5
    Energy: ${input.energy || "Not recorded"}/5
    User Notes: ${input.notes || "None"}
    
    Rules for your response:
    1. Keep it under 3 sentences.
    2. Focus on one small win or one simple adjustment for tomorrow.
    3. If adherence is low, be encouraging but firm on the rules (Protein, Fiber, Water, Steps).
    4. Speak directly to ${input.userName}.
    5. Do not give medical advice.
  `;

  try {
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT || "steadycut-coach-prod",
      location: "us-central1",
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.7,
        topP: 0.8,
      },
    });

    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    return text?.trim() || buildFallbackResponse(input);
  } catch (error) {
    logger.error({ error }, "Failed to generate AI coaching feedback.");
    return buildFallbackResponse(input);
  }
}

function buildFallbackResponse(input: CoachingInput): string {
  if (input.adherenceScore >= 7) {
    return `Strong day, ${input.userName}. Repeat the same structure tomorrow and protect the basics.`;
  }

  if ((input.energy ?? 3) <= 2) {
    return `${input.userName}, keep tomorrow simple: walk, protein, water, and recover better.`;
  }

  return `${input.userName}, keep it narrow tomorrow: hit protein, water, and one clean rule.`;
}
