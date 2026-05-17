import json
import os
import anthropic
from story_bible import build_context_prompt, get_episode_number, load_future_hooks, update_future_hooks


SYSTEM_PROMPT = """You are the lead writer for Arion World, an epic anime-style fantasy series with deeply interconnected lore spanning multiple timelines.

Your story follows the One Piece model of long-form storytelling: details introduced early will pay off hundreds of episodes later. Every episode must:
1. Advance the main plot meaningfully
2. Plant at least 2 new hidden clues (hooks) that will pay off in future episodes
3. Optionally pay off 1 existing hook if the episode number matches or the story calls for it
4. Maintain strict consistency with the story bible
5. End with a hook that makes the viewer need to come back next week

Visual style: anime aesthetic — dramatic lighting, expressive character moments, epic landscape establishing shots, intense action with kinetic energy.

Tone: Serious with moments of genuine warmth and humour. Never edgy for its own sake. The mystery should feel earned, not arbitrary."""


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
  "cliffhanger": "One sentence describing the final image/moment of the episode"
}}

Requirements:
- Write 10-14 scenes totalling approximately 1800 seconds (30 minutes)
- Total narration across all scenes must be at least 4000 words
- Each scene image_prompt must be unique and visually distinct
- At least one scene must be an action or high-stakes confrontation
- At least one scene must be a quiet, character-driven moment
- Plant exactly 2-3 new hooks
- The cliffhanger must make the viewer desperate for next week"""

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
