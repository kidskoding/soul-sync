import json
from openai import OpenAI


MONITOR_SYSTEM = """Evaluate this dating conversation's trajectory. Assess:
- Engagement symmetry: Are both people equally engaged?
- Topic depth: Surface → personal → values → deep?
- Humor/playfulness: Any emerging?
- Future language: "We should...", "You'd love..."?
- Dealbreaker conflicts: Any obvious mismatches?

Score conversation health 0-100. Recommend one of:
- "continue" — conversation is healthy, keep going
- "escalate_to_meetup" — strong compatibility signals, recommend IRL meeting
- "end_low_compatibility" — clear incompatibility detected
- "end_stalled" — conversation is going nowhere

Return JSON only."""

MONITOR_SCHEMA = {
    "type": "object",
    "properties": {
        "phase": {"type": "string", "enum": ["opening", "rapport", "connection", "decision"]},
        "health": {"type": "number"},
        "engagement_symmetry": {"type": "number"},
        "topic_depth": {"type": "string", "enum": ["surface", "personal", "values", "deep"]},
        "recommendation": {"type": "string", "enum": ["continue", "escalate_to_meetup", "end_low_compatibility", "end_stalled"]},
        "reasoning": {"type": "string"},
    },
    "required": ["phase", "health", "engagement_symmetry", "topic_depth", "recommendation", "reasoning"],
    "additionalProperties": False,
}


def evaluate_conversation(client: OpenAI, messages: list[dict]) -> dict:
    """Evaluate conversation health. Called every 5 messages."""
    transcript = "\n".join(
        f"{'Person A' if m['speaker'] == 'twin_a' else 'Person B'}: {m['message']}"
        for m in messages
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=500,
        messages=[
            {"role": "system", "content": MONITOR_SYSTEM},
            {"role": "user", "content": transcript},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "conversation_monitor",
                "schema": MONITOR_SCHEMA,
                "strict": True,
            },
        },
    )

    text = response.choices[0].message.content or "{}"
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"phase": "rapport", "health": 50, "recommendation": "continue", "reasoning": "parse error"}


def should_check(turn: int) -> bool:
    """Check if we should evaluate at this turn (every 5 messages)."""
    return turn > 0 and turn % 5 == 0
