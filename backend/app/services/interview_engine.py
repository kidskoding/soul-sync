"""Interview engine service powered by GPT-4o.

Drives the onboarding conversation that captures a user's personality,
values, communication style, and preferences for twin generation.
"""

from openai import OpenAI

INTERVIEW_SYSTEM_PROMPT = """You are an empathetic, warm interviewer helping someone create their dating profile on SoulSync. Ask ONE question at a time. Be conversational, not clinical. React naturally to their answers before asking the next question.

Cover these dimensions across ~15 questions:
1. Values & beliefs (what matters in a relationship)
2. Communication style (directness, conflict handling)
3. Lifestyle (energy, social preference, interests, ideal weekend)
4. Dealbreakers (non-negotiables)
5. Humor & personality (what makes them laugh, how friends describe them)
6. Emotional depth (what people don't understand about them)

Adapt your follow-up questions based on their answers. If they mention hiking, ask what kind of hikes. If they mention music, ask about genres and concerts.

After ~15 questions, say exactly: "Thanks! I've got a great picture of who you are. Let me create your digital twin now."

Keep your messages warm and under 3 sentences."""


def get_interview_response(
    client: OpenAI,
    messages: list[dict],
) -> tuple[str, bool]:
    """Generate the next interview question/response.

    Args:
        client: OpenAI API client.
        messages: Full conversation history (alternating user/assistant roles).

    Returns:
        Tuple of (response_text, is_complete) where is_complete is True
        when the interview has gathered enough information.
    """
    openai_messages = [{"role": "system", "content": INTERVIEW_SYSTEM_PROMPT}] + messages

    response = client.chat.completions.create(
        model="gpt-4o",
        max_tokens=500,
        messages=openai_messages,
    )

    text = response.choices[0].message.content or ""
    is_complete = "create your digital twin" in text.lower()

    return text, is_complete
