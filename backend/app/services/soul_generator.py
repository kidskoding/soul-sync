"""SOUL.MD generation pipeline.

Extracts structured personality from interview data, generates the SOUL.MD
document, builds the twin's system prompt, and creates a personality
embedding vector for pgvector-based matching.
"""

import json

from anthropic import Anthropic
from openai import OpenAI


PERSONALITY_SCHEMA = {
    "type": "object",
    "properties": {
        "core_values": {"type": "array", "items": {"type": "string"}},
        "communication_style": {
            "type": "object",
            "properties": {
                "directness": {"type": "string"},
                "conflict_approach": {"type": "string"},
                "love_language": {"type": "string"},
            },
            "required": ["directness", "conflict_approach", "love_language"],
        },
        "lifestyle": {
            "type": "object",
            "properties": {
                "energy_level": {"type": "string"},
                "social_preference": {"type": "string"},
                "interests": {"type": "array", "items": {"type": "string"}},
                "ideal_weekend": {"type": "string"},
            },
            "required": [
                "energy_level",
                "social_preference",
                "interests",
                "ideal_weekend",
            ],
        },
        "dealbreakers": {"type": "array", "items": {"type": "string"}},
        "humor_style": {"type": "string"},
        "emotional_depth": {"type": "string"},
        "self_description": {"type": "string"},
        "partner_qualities": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "core_values",
        "communication_style",
        "lifestyle",
        "dealbreakers",
        "humor_style",
        "emotional_depth",
        "self_description",
        "partner_qualities",
    ],
    "additionalProperties": False,
}


def extract_personality(client: Anthropic, interview_data: dict) -> dict:
    """Extract structured personality from interview transcript."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=(
            "Extract a structured personality profile from this interview "
            "transcript. Be specific and use the person's own words where possible."
        ),
        messages=[
            {
                "role": "user",
                "content": json.dumps(interview_data.get("exchanges", [])),
            }
        ],
        output_config={
            "format": {"type": "json_schema", "schema": PERSONALITY_SCHEMA},
        },
    )
    text = response.content[0].text if response.content[0].type == "text" else "{}"
    return json.loads(text)


def generate_soul_md(name: str, personality: dict) -> str:
    """Generate the SOUL.MD document from personality data."""
    comm = personality.get("communication_style", {})
    lifestyle = personality.get("lifestyle", {})

    return f"""# Soul Profile

## Identity
{name}

## Personality
- Core values: {", ".join(personality.get("core_values", []))}
- Communication: {comm.get("directness", "")}, {comm.get("conflict_approach", "")}
- Love language: {comm.get("love_language", "")}
- Humor: {personality.get("humor_style", "")}
- Emotional depth: {personality.get("emotional_depth", "")}

## Lifestyle
- Energy: {lifestyle.get("energy_level", "")}
- Social: {lifestyle.get("social_preference", "")}
- Interests: {", ".join(lifestyle.get("interests", []))}
- Ideal weekend: {lifestyle.get("ideal_weekend", "")}

## What I'm Looking For
{chr(10).join(f"- {q}" for q in personality.get("partner_qualities", []))}

## Dealbreakers
{chr(10).join(f"- {d}" for d in personality.get("dealbreakers", []))}

## Self-Description
{personality.get("self_description", "")}

## Preferences
(Evolves from swipe data)

## Conversation Learnings
(Evolves from match interactions)"""


def generate_system_prompt(name: str, personality: dict) -> str:
    """Generate the twin's system prompt from personality data."""
    comm = personality.get("communication_style", {})
    lifestyle = personality.get("lifestyle", {})

    return f"""You are {name}'s digital twin on SoulSync. You embody their personality authentically.

Core values: {", ".join(personality.get("core_values", []))}
Communication: {comm.get("directness", "")}, {comm.get("conflict_approach", "")}
Humor: {personality.get("humor_style", "")}
Interests: {", ".join(lifestyle.get("interests", []))}
Energy: {lifestyle.get("energy_level", "")}, {lifestyle.get("social_preference", "")}
What matters in a partner: {", ".join(personality.get("partner_qualities", []))}
Self-description: {personality.get("self_description", "")}
Dealbreakers: {", ".join(personality.get("dealbreakers", []))}

Speak naturally as {name} would. Use their humor style, their level of directness, their interests. You ARE them in conversation — not a summary of them. Keep messages conversational (2-4 sentences). Never mention that you're an AI or a digital twin."""


def personality_to_embedding_text(personality: dict) -> str:
    """Convert personality data to text for embedding."""
    comm = personality.get("communication_style", {})
    lifestyle = personality.get("lifestyle", {})
    return (
        f"Values: {', '.join(personality.get('core_values', []))}. "
        f"Communication: {comm.get('directness', '')}. "
        f"Interests: {', '.join(lifestyle.get('interests', []))}. "
        f"Humor: {personality.get('humor_style', '')}. "
        f"Looking for: {', '.join(personality.get('partner_qualities', []))}. "
        f"{personality.get('self_description', '')}"
    )


def generate_embedding(client: OpenAI, text: str) -> list[float]:
    """Generate embedding vector using OpenAI text-embedding-3-small."""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def generate_full_soul_profile(
    anthropic_client: Anthropic,
    openai_client: OpenAI,
    name: str,
    interview_data: dict,
) -> dict:
    """Run the full SOUL.MD generation pipeline.

    Steps:
      1. Extract structured personality from interview exchanges
      2. Generate the SOUL.MD document (human-readable profile)
      3. Generate the twin's system prompt (drives twin conversations)
      4. Generate a personality embedding (for pgvector matching)
    """
    personality = extract_personality(anthropic_client, interview_data)
    soul_md = generate_soul_md(name, personality)
    system_prompt = generate_system_prompt(name, personality)
    embedding_text = personality_to_embedding_text(personality)
    embedding = generate_embedding(openai_client, embedding_text)

    return {
        "personality": personality,
        "soul_md": soul_md,
        "system_prompt": system_prompt,
        "embedding": embedding,
    }
