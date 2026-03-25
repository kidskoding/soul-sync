---
name: scoring-engine
description: SoulSync multi-dimensional compatibility scoring engine. Use when building, modifying, or debugging the scoring agent that analyzes twin conversations and produces compatibility scores. Covers the scoring prompt, structured output schema, dimension weights, threshold logic, and match notification triggers. Triggers on files in app/api/scoring/, lib/ai/scoring*, compatibility_scores table changes, or anything related to how matches are evaluated after twin conversations complete.
---

# Scoring Engine

After a twin conversation completes, a single Claude Sonnet 4.6 call analyzes the transcript and produces multi-dimensional compatibility scores.

## Scoring Flow

```
conversation_session status → 'completed'
  → Scoring Agent triggered
  → Loads full conversation transcript
  → Single Claude structured output call
  → Writes scores to compatibility_scores table
  → If overall > threshold → updates match status → 'revealed'
  → Notifies both users
```

## Scoring Prompt

```typescript
const scoringSystemPrompt = `You are a relationship compatibility analyst. Analyze this conversation between two potential partners and score their compatibility across five dimensions.

Score each dimension 0-100 based on evidence from the conversation:
- values_alignment: Do they share core beliefs, priorities, and life goals?
- communication_style: Do their communication patterns mesh? Are they on the same wavelength?
- humor_compatibility: Do they make each other laugh? Is the humor style compatible?
- lifestyle_fit: Do their daily lives, energy levels, and interests align?
- emotional_depth: Is there genuine connection? Do they go beyond surface-level?

Be rigorous. A score of 50 means neutral/insufficient evidence. Only score above 75 if the conversation shows clear, strong compatibility on that dimension. Provide a brief analysis explaining the overall dynamic.`
```

## Structured Output Call

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  system: scoringSystemPrompt,
  messages: [{
    role: "user",
    content: `Twin A system prompt:\n${profileA.system_prompt}\n\nTwin B system prompt:\n${profileB.system_prompt}\n\nConversation transcript:\n${transcript}`
  }],
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          values_alignment:    { type: "number", description: "0-100" },
          communication_style: { type: "number", description: "0-100" },
          humor_compatibility: { type: "number", description: "0-100" },
          lifestyle_fit:       { type: "number", description: "0-100" },
          emotional_depth:     { type: "number", description: "0-100" },
          analysis:            { type: "string", description: "2-3 sentence narrative of the dynamic" },
        },
        required: ["values_alignment", "communication_style", "humor_compatibility", "lifestyle_fit", "emotional_depth", "analysis"],
        additionalProperties: false,
      },
    },
  },
})
```

## Weighted Overall Score

```typescript
const WEIGHTS = {
  values_alignment:    0.30,
  communication_style: 0.25,
  humor_compatibility: 0.15,
  lifestyle_fit:       0.15,
  emotional_depth:     0.15,
}

function computeOverall(scores: DimensionScores): number {
  return Math.round(
    scores.values_alignment    * WEIGHTS.values_alignment +
    scores.communication_style * WEIGHTS.communication_style +
    scores.humor_compatibility * WEIGHTS.humor_compatibility +
    scores.lifestyle_fit       * WEIGHTS.lifestyle_fit +
    scores.emotional_depth     * WEIGHTS.emotional_depth
  )
}
```

Values alignment is weighted highest (0.30) because shared values are the strongest predictor of long-term relationship success. Communication style is next (0.25) because day-to-day interaction quality depends on it.

## Match Threshold

```typescript
const MATCH_THRESHOLD = 72 // overall score to trigger reveal

if (overall >= MATCH_THRESHOLD) {
  await supabaseAdmin
    .from("matches")
    .update({ status: "revealed" })
    .eq("id", matchId)
  // Trigger notification to both users
}
```

Threshold of 72 is deliberately moderate — too high means no matches (bad UX), too low means low-quality matches (bad product). Tune based on real data.

## Transcript Formatting

Format the conversation for the scoring prompt:

```typescript
function formatTranscript(messages: ConversationMessage[]): string {
  return messages
    .map(m => `${m.speaker === "twin_a" ? "Person A" : "Person B"}: ${m.message}`)
    .join("\n")
}
```

Use "Person A" / "Person B" rather than names to avoid bias in scoring.

## Example

**User says:** "Add a 'physical chemistry hints' dimension to scoring"

**Skill behavior:**
1. Add the new dimension to the scoring system prompt
2. Add the field to the structured output schema
3. Add to the weights map (rebalance existing weights to sum to 1.0)
4. Add the column to `compatibility_scores` table via migration
5. Update the frontend radar chart to show 6 dimensions instead of 5
