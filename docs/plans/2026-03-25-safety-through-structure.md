# Safety Through Structure

**Date:** 2026-03-25
**Status:** Proposed
**Type:** Design plan

---

## The Problem - Human Intent and Privacy

SoulSync cannot reliably detect a creep during twin-to-twin conversations. The twin is an AI and it won't do anything explicitly harmful regardless of who built it. A creep who crafts a warm, charming persona at onboarding will produce a twin that behaves appropriately throughout the entire conversation.

By the time a compatibility score comes back high, there is no signal from the conversation itself that tells you whether the human behind it is safe or not.

**The score is not a safety signal.** It measures personality compatibility, not whether the person behind the twin is trustworthy. A high score only means the two personas got along, but says nothing about the overall intent.

The twin is built from the onboarding interview, which contains sensitive personal details: where the user lives, their daily routine, their workplace, their schedule. By default, a twin with access to all of that would answer questions about it if asked

A persistent twin on the other side could extract location, schedule, or contact details through seemingly innocent conversation. The user would never know it was happening

---

## The Insight

Both problems share the same root: **the app gives out too much by default.**

The fix is not better detection. Detection is unreliable because the twin doesn't misbehave and the human is hidden behind it. The fix should potentially involve limiting what the app gives out in the first place, and make every step of access deliberate and bilateral.

For example: a match shouldn't hand over someone's name and photo the moment a score comes back high. Instead, the score unlocks a personality card: a description of who they are, how they communicate, what they value. Only if both people independently say they're interested does a name and photo appear. The creep had to earn that, and the other person had full control over whether to grant it. And this will come from repeated trial and testing with reputation.

On Tinder or Hinge, a stranger can message you directly the moment you match. On SoulSync, a stranger can never reach you directly because the twin always mediates.

The goal is to make sure that if a creep gets through, they cannot easily cause harm

---

## How the Problem Gets Solved

### The twin knows traits, not facts

The profile extraction step — the Claude call that turns interview answers into a personality profile — produces *traits*, not *facts*.

The twin knows:
- "values stability and routine" — not "leaves for work at 7:30am"
- "career-driven and ambitious" — not "works at Google downtown"
- "physically active" — not "goes to the gym on Oak Street at 6am"

Location, employer, daily schedule, and contact information never enter the system prompt. The twin can still feel authentic and represent the user genuinely without any of this.

The twin's system prompt also includes an explicit instruction: never share specifics about where I live, work, or my daily routine. If asked, redirect warmly. This closes the gap between what the twin doesn't know and what it's been told not to say.

### The twin only just mediates

No human ever talks directly to another human through SoulSync. All communication, before and after a match, goes through the twins. This is the most powerful safety property the app has, and it should be treated as non-negotiable.

### The match reveal happens in stages, not all at once

A high compatibility score unlocks the *next stage*, not full access. The score is not a safety clearance.

- **Stage 1:** You see their twin's personality card and the conversation your twins had. No name, no photo, no contact info.
- **Stage 2:** If you tap "I'm interested" *and* they do too, independently, you see their name and photo.
- **Stage 3:** If both of you want to continue, your twins keep talking. Still no direct contact.
- **Stage 4:** If the twins discuss meeting in person, the app wraps that moment with lightweight safety features

Each stage requires both people to actively move forward. Either person can quietly exit at any point with no awkwardness — the match just stops progressing

### The path to meeting in person is scaffolded

When twins start discussing a real meeting, the app:
- Suggests meeting in a public place
- Offers to share meeting details with a trusted contact
- Sends a quiet check-in afterward

None of this requires the user to do anything they wouldn't naturally do. It lives around the flow, not in the way of it

---

## Why This Works

A creep whose twin scores well still has to get through every stage of the reveal. At every stage, the other person has a natural exit and the creep has gained nothing they can act on

There is nothing to steal. The app structurally does not give out the information that makes someone vulnerable, no contact details, no location, no schedule, and the twin itself doesn't hold that information to begin with.

The harm that matters, an unsafe in-person meeting, is the last step in a long chain. This plan makes every link in that chain slower, more deliberate, and easier to exit