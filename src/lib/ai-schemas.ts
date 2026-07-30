import { z } from "zod";

export const scriptResultSchema = z.object({
  content: z.string().min(20),
  changeSummary: z.string().min(1).max(500),
  estimatedDuration: z.number().int().min(10).max(900),
});

export const generatedScriptSchema = z.object({
  title: z.string().min(1).max(160),
  content: z.string().min(20),
  changeSummary: z.string().min(1).max(500),
  estimatedDuration: z.number().int().min(10).max(900),
});

export const benchmarkAnalysisSchema = z.object({
  depth: z.enum(["basic", "full"]),
  basis: z.array(z.string()).min(1),
  summary: z.string(),
  hook: z.string(),
  structure: z.array(z.object({ section: z.string(), purpose: z.string(), observation: z.string() })),
  emotionalTriggers: z.array(z.string()),
  trustElements: z.array(z.string()),
  interactionDesign: z.array(z.string()),
  cta: z.string(),
  reusablePatterns: z.array(z.string()),
  risks: z.array(z.string()),
  topicIdeas: z.array(z.string()),
  missingInformation: z.array(z.string()),
});

export const reviewAnalysisSchema = z.object({
  summary: z.string(),
  wins: z.array(z.string()),
  issues: z.array(z.string()),
  hypotheses: z.array(z.string()),
  nextActions: z.array(z.string()),
  nextTopics: z.array(z.string()),
});
