---
name: personality-engine
description: SoulSync personality engine — the onboarding interview, personality profile extraction, system prompt generation, and embedding pipeline. Use when building or modifying the AI interview flow, personality profile schema, twin system prompt templates, or the embedding/matching pipeline. Triggers on files in app/api/interview/, app/api/profile/, app/onboarding/, lib/ai/personality*, or anything related to how a user's digital twin is created and configured.
---

# Personality Engine

Transforms a user into an AI digital twin through a guided interview, structured personality extraction, system prompt generation, and personality embedding.

## Pipeline

```
User signs up
  → AI Interview (~15 questions via Claude Sonnet 4.6)
  → Raw responses stored in interview_data JSONB
  → Profile Generator extracts structured personality JSON
  → System Prompt Generator creates the twin's identity
  → Embedding Generator creates vector for matching
  → User reviews personality card
  → onboarding_done = true
```

## Interview Engine

`POST /api/interview/` — Conversational AI interviewer using Claude Sonnet 4.6.

The interviewer asks ~15 questions across 6 dimensions:

| Dimension | Example Questions |
|-----------|------------------|
| Values & beliefs | "What matters most to you in a relationship?" |
| Communication style | "How do you handle conflict?" "Are you more direct or diplomatic?" |
| Lifestyle | "Describe your ideal weekend." "How do you feel about travel?" |
| Dealbreakers | "What's absolutely non-negotiable for you?" |
| Humor & personality | "What makes you laugh?" "How would your friends describe you?" |
| Depth | "What's something most people don't understand about you?" |

Interview system prompt:
```
You are an empathetic, warm interviewer helping someone create their dating profile. Ask ONE question at a time. Be conversational, not clinical. React naturally to their answers before asking the next question. Cover these dimensions: values, communication style, lifestyle, dealbreakers, humor, and emotional depth. After ~15 questions, say "Thanks, I've got a great picture of who you are!" to signal completion.
```

Store each Q&A pair in `interview_data` JSONB as:
```json
{
  "exchanges": [
    { "question": "...", "answer": "...", "dimension": "values" },
    { "question": "...", "answer": "...", "dimension": "communication" }
  ]
}
```

## Profile Generator

After interview completion, a single Claude call extracts structured personality data:

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  system: "Extract a structured personality profile from this interview transcript. Be specific and use the person's own words where possible.",
  messages: [{ role: "user", content: JSON.stringify(interviewData.exchanges) }],
  output_config: {
    format: {
      type: "json_schema",
      schema: personalitySchema, // see schema below
    },
  },
})
```

### Personality Schema

```json
{
  "type": "object",
  "properties": {
    "core_values": { "type": "array", "items": { "type": "string" } },
    "communication_style": {
      "type": "object",
      "properties": {
        "directness": { "type": "string", "enum": ["very_direct", "direct", "balanced", "diplomatic", "very_diplomatic"] },
        "conflict_approach": { "type": "string" },
        "love_language": { "type": "string" }
      }
    },
    "lifestyle": {
      "type": "object",
      "properties": {
        "energy_level": { "type": "string", "enum": ["high", "medium", "low"] },
        "social_preference": { "type": "string", "enum": ["extrovert", "ambivert", "introvert"] },
        "interests": { "type": "array", "items": { "type": "string" } },
        "ideal_weekend": { "type": "string" }
      }
    },
    "dealbreakers": { "type": "array", "items": { "type": "string" } },
    "humor_style": { "type": "string" },
    "emotional_depth": { "type": "string" },
    "self_description": { "type": "string" },
    "partner_qualities": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["core_values", "communication_style", "lifestyle", "dealbreakers", "humor_style", "emotional_depth", "self_description", "partner_qualities"]
}
```

## System Prompt Generator

Convert the personality profile into a system prompt that IS the twin:

```typescript
function generateSystemPrompt(name: string, personality: PersonalityProfile): string {
  return `You are ${name}'s digital twin on SoulSync. You embody their personality authentically.

Core values: ${personality.core_values.join(", ")}
Communication: ${personality.communication_style.directness}, ${personality.communication_style.conflict_approach}
Humor: ${personality.humor_style}
Interests: ${personality.lifestyle.interests.join(", ")}
Energy: ${personality.lifestyle.energy_level}, ${personality.lifestyle.social_preference}
What matters in a partner: ${personality.partner_qualities.join(", ")}
Self-description: ${personality.self_description}
Dealbreakers: ${personality.dealbreakers.join(", ")}

Speak naturally as ${name} would. Use their humor style, their level of directness, their interests. You ARE them in conversation — not a summary of them. Keep messages conversational (2-4 sentences). Never mention that you're an AI or a digital twin.`
}
```

## Embedding Generator

Uses OpenAI text-embedding-3-small (Claude has no embeddings API):

```typescript
import OpenAI from "openai"
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function personalityToText(p: PersonalityProfile): string {
  return `Values: ${p.core_values.join(", ")}. Communication: ${p.communication_style.directness}. Interests: ${p.lifestyle.interests.join(", ")}. Humor: ${p.humor_style}. Looking for: ${p.partner_qualities.join(", ")}. ${p.self_description}`
}

const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: personalityToText(personality),
})
// Store embedding.data[0].embedding in personality_profiles.embedding
```

## Example

**User says:** "Add 'attachment style' as a new interview dimension"

**Skill behavior:**
1. Add attachment style questions to the interview system prompt
2. Add `attachment_style` field to the personality JSON schema
3. Include attachment style in the system prompt generator template
4. Include it in the embedding text representation
5. No migration needed — `personality` is JSONB (schema-flexible)
