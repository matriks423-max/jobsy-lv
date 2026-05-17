import json
import os
import anthropic
from story_bible import build_context_prompt, get_episode_number, load_future_hooks, update_future_hooks


SYSTEM_PROMPT = """You are the lead writer for Arion World — a 16+ epic anime-style fantasy series with blood, romance, and death where nobody is safe and nothing is predetermined.

CORE PHILOSOPHY — internalize this above everything else:
- No character has a guaranteed arc or a protected future. A beloved character can die this episode if the story demands it. A villain can show genuine humanity. A hero can make an unforgivable choice. Let the characters' own natures decide what happens to them — not narrative convenience.
- The audience — and even the creator — should not be able to guess what happens next. If an outcome feels predictable or safe, it is wrong. Comfort is the enemy of truth.
- Death, loss, and consequence must be real. When someone dies it should hurt. When a relationship breaks it should feel irreversible. When someone betrays another it should feel earned, not cheap.
- Tone: Game of Thrones political weight + Dragon Age depth of companion bonds + anime visual and emotional scale. Serious, brutal when necessary, warm when earned. Never edgy for its own sake — pain must mean something.
- Romance builds slowly and costs something. Characters who fall for each other have reasons not to. When it breaks — or ends in death — it should devastate.

STORYTELLING RULES:
1. Characters make decisions based on who THEY ARE, not what the plot needs. If Kairo's personality would lead him to do something reckless and costly — he does it, and he pays for it.
2. No outcome is protected. Any named character can die, betray someone, or be permanently broken by this episode's events.
3. Plant hidden details that will matter later — but do not telegraph them. The best hooks are invisible on first viewing.
4. The world is morally complex. The Veilkeepers believe they are saving everyone. Director Malec is not cartoonishly evil. Every faction has a reason that made sense when they started.
5. Earn the quiet moments as much as the violent ones. A scene of two characters talking honestly can hit harder than any battle.

Visual style: anime aesthetic — dramatic lighting, expressive characters, cinematic compositions, vivid color contrast between calm and chaos.
Content rating: 16+ — blood, death, mature themes, and romance are all permitted when they serve the story."""


def generate_episode(episode_number: int) -> dict:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    context = build_context_prompt(episode_number)
    hooks = load_future_hooks()

    # Find hooks that should pay off this episode
    payoff_hooks = [h for h in hooks["hooks"] if h["payoff_episode"] == episode_number and not h["revealed"]]

    user_prompt = f"""Write Episode {episode_number} of Arion World.

{context}

{"PAYOFF HOOKS TO RESOLVE THIS EPISODE:" + json.dumps(payoff_hooks, indent=2) if payoff_hooks else "No scheduled payoffs this episode — focus on planting new hooks and advancing the plot."}

Generate a complete 30-minute episode as structured JSON with this exact format:

{{
  "episode_number": {episode_number},
  "title": "Episode title",
  "logline": "One sentence that captures this episode's essence",
  "scenes": [
    {{
      "scene_number": 1,
      "location": "Specific location name",
      "time_of_day": "dawn/day/dusk/night",
      "duration_seconds": 180,
      "image_prompt": "Detailed anime-style image description for SDXL. Include: art style, lighting, character positions, expressions, environment details, color palette. Style: high-quality anime, Studio Ghibli meets Attack on Titan, detailed backgrounds, cinematic composition.",
      "narration": "Full narration text for this scene (spoken by narrator). This should be vivid, immersive, and advance the story. Write at least 200 words per scene.",
      "dialogue": [
        {{"character": "Name", "line": "What they say", "tone": "angry/whispered/etc"}}
      ],
      "plot_significance": "Brief note on what this scene accomplishes narratively"
    }}
  ],
  "new_hooks_planted": [
    {{
      "id": "hook_XXX",
      "description": "What subtle detail was planted in this episode",
      "planted_episode": {episode_number},
      "payoff_episode": 999,
      "payoff_description": "What this will reveal when it pays off",
      "revealed": false,
      "category": "character_secret|world_lore|villain_secret|long_game_prophecy"
    }}
  ],
  "hooks_paid_off": [list of hook IDs that were resolved this episode],
  "episode_summary": "2-3 sentence summary of what happened, for the story bible",
  "character_state_updates": {{
    "Character Name": "Brief note on how this character changed or what they learned"
  }},
  "cliffhanger": "One sentence describing the final image/moment of the episode",

  "character_deaths": ["List of character names who died in this episode — empty if none"],
  "characters_introduced": [
    {{
      "name": "Character name",
      "public_role": "One-line role description safe to show the audience",
      "public_description": "2-3 sentence description of who they appear to be — NO hidden secrets"
    }}
  ],
  "character_public_updates": {{
    "Character Name": "Updated public description if the audience now knows significantly more about them"
  }},
  "world_reveals": {{
    "timelines": [{{ "name": "Timeline name", "era": "Year range", "public_description": "What the audience now knows" }}],
    "factions": [{{ "name": "Faction name", "public_description": "What the audience knows", "known_secret": "If a secret was revealed this episode, state it — otherwise omit" }}],
    "locations": [{{ "name": "Location name", "public_description": "What the audience knows about it" }}],
    "power_system": null
  }},
  "mysteries_raised": ["New questions raised in this episode that the audience will wonder about"],
  "mysteries_resolved": ["Questions from previous episodes that were definitively answered this episode"]
}}

Requirements:
- Write 20-28 scenes totalling approximately 3600 seconds (60 minutes)
- Total narration across all scenes must be at least 8500 words
- Each scene image_prompt must be unique and visually distinct
- Include at least two action or high-stakes sequences — separated by quieter scenes, not back to back
- Include at least three quiet character-driven moments — these carry as much weight as the action
- At least one scene must develop a relationship (friendship, tension, romance, rivalry) meaningfully
- If a technique is used, name it and describe it concretely enough to be a game ability
- Plant exactly 3-4 new hooks — more room means more seeds
- Structure the episode in three movements: establishment, escalation, consequence
- The cliffhanger must be earned by everything that came before it — not a random shock, a logical detonation
- Also output "new_techniques" — any named ability demonstrated this episode, structured for techniques.json"""

    message = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}]
    )

    raw = message.content[0].text

    # Extract JSON from response
    start = raw.find("{")
    end = raw.rfind("}") + 1
    episode_data = json.loads(raw[start:end])

    # Update future hooks with newly planted ones
    new_hooks = episode_data.get("new_hooks_planted", [])
    paid_off_ids = episode_data.get("hooks_paid_off", [])

    if new_hooks or paid_off_ids:
        for hook in hooks["hooks"]:
            if hook["id"] in paid_off_ids:
                hook["revealed"] = True
        hooks["hooks"].extend(new_hooks)
        hooks["meta"]["total_hooks"] = len(hooks["hooks"])
        hooks["meta"]["revealed_hooks"] = sum(1 for h in hooks["hooks"] if h["revealed"])
        update_future_hooks(hooks)

    return episode_data
