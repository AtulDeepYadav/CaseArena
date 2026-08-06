import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GenerateInput = z.object({
  category: z.string().min(1).max(60),
  caseType: z.string().min(1).max(60),
  interviewType: z.string().min(1).max(60),
  difficulty: z.enum(["easy", "medium", "hard"]),
  durationMinutes: z.number().int().min(10).max(120),
});

const EvaluateInput = z.object({
  caseTitle: z.string().min(1).max(300),
  caseContent: z.string().min(1).max(20000),
  answer: z.string().min(1).max(20000),
  assumptions: z.string().max(5000).optional().default(""),
  timeTakenSeconds: z.number().int().min(0).max(60 * 60 * 6),
});

export const generateCase = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const { chatJSON } = await import("./ai.server");
    const system =
      "You are an ex-MBB and FAANG PM interviewer writing realistic MBA interview cases. Always answer with strict JSON.";
    const user = `Create a ${data.difficulty} ${data.category} case of type "${data.caseType}" for a ${data.interviewType} interview lasting ${data.durationMinutes} minutes.
Return JSON with keys:
{
 "title": string,
 "company_overview": string,
 "business_context": string,
 "problem_statement": string,
 "supporting_information": string[],
 "exhibits": [{"label": string, "description": string, "rows": [{"name": string, "value": number}]}],
 "clarifying_answers": [{"question": string, "answer": string}],
 "ideal_solution": string,
 "suggested_frameworks": string[]
}
Exhibits must contain 1-3 exhibits with 3-6 numeric rows each so they can be charted. Keep prose tight and interview-realistic.`;
    return (await chatJSON(system, user)) as {
      title: string;
      company_overview: string;
      business_context: string;
      problem_statement: string;
      supporting_information: string[];
      exhibits: { label: string; description: string; rows: { name: string; value: number }[] }[];
      clarifying_answers: { question: string; answer: string }[];
      ideal_solution: string;
      suggested_frameworks: string[];
    };
  });

const ENGINE_CASE_TYPES = [
  "profitability",
  "market_entry",
  "growth",
  "m_and_a_pe_vc",
  "pricing",
  "unconventional",
] as const;

const GenerateEngineInput = z.object({
  caseType: z.enum(ENGINE_CASE_TYPES),
});

/**
 * Starts a real interview session on the CaseArena engine (curated case
 * library, Grok-driven interviewer, reveal_map fact withholding) instead of
 * the one-shot generateCase() above. Returns the URL to redirect the browser
 * to — the engine owns the session from here.
 */
export const generateEngineCase = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateEngineInput.parse(input))
  .handler(async ({ data }) => {
    const engineUrl = process.env.CASEARENA_ENGINE_URL;
    if (!engineUrl) throw new Error("CASEARENA_ENGINE_URL is not configured.");

    const res = await fetch(`${engineUrl}/api/cases/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseType: data.caseType }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Engine returned ${res.status}: ${body.slice(0, 300)}`);
    }
    const generated = (await res.json()) as { sessionId: string; case: { title: string } };
    return {
      sessionId: generated.sessionId,
      title: generated.case.title,
      redirectUrl: `${engineUrl}/interview/${generated.sessionId}`,
    };
  });

export const evaluateAttempt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EvaluateInput.parse(input))
  .handler(async ({ data }) => {
    const { chatJSON } = await import("./ai.server");
    const system =
      "You are a strict but constructive MBA case interview evaluator. Always answer with strict JSON.";
    const user = `Case title: ${data.caseTitle}
Case: ${data.caseContent}
Candidate assumptions: ${data.assumptions}
Candidate answer: ${data.answer}
Time taken: ${Math.round(data.timeTakenSeconds / 60)} minutes.

Score each dimension 0-100 and return JSON:
{
 "scores": {"structure": number, "logic": number, "framework": number, "hypothesis": number, "calculations": number, "business_thinking": number, "communication": number, "recommendation": number, "confidence": number},
 "overall": number,
 "strengths": string[],
 "weaknesses": string[],
 "improvement_tips": string[],
 "suggested_frameworks": string[],
 "ideal_solution": string
}`;
    return (await chatJSON(system, user)) as {
      scores: Record<string, number>;
      overall: number;
      strengths: string[];
      weaknesses: string[];
      improvement_tips: string[];
      suggested_frameworks: string[];
      ideal_solution: string;
    };
  });
