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
  basis: z.array(z.string().min(2)).min(1),
  summary: z.string().min(20).max(600),
  hook: z.string().min(5).max(200),
  structure: z.array(z.object({
    section: z.string().min(1),
    purpose: z.string().min(2),
    observation: z.string().min(2),
  })).min(2).max(8),
  emotionalTriggers: z.array(z.string()),
  trustElements: z.array(z.string()),
  interactionDesign: z.array(z.string()),
  cta: z.string(),
  reusablePatterns: z.array(z.string().min(10).max(240)).min(3).max(6),
  risks: z.array(z.string()),
  topicIdeas: z.array(z.string().min(5).max(120)).min(3).max(6),
  missingInformation: z.array(z.string()),
});

export const reviewAnalysisSchema = z.object({
  summary: z.string().min(20).max(300),
  wins: z.array(z.string().min(5).max(140)).min(1).max(3),
  issues: z.array(z.string().min(5).max(140)).min(1).max(3),
  hypotheses: z.array(z.string().min(10).max(180)).min(1).max(3),
  nextActions: z.array(z.string().min(5).max(140)).min(1).max(3),
  nextTopics: z.array(z.string().min(5).max(80)).max(3),
});
