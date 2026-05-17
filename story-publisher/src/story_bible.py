import json
import os
from pathlib import Path

BIBLE_DIR = Path(__file__).parent.parent / "story_bible"
EPISODES_DIR = BIBLE_DIR / "episodes"
COUNTER_FILE = BIBLE_DIR / ".episode_counter"


def get_episode_number() -> int:
    return int(COUNTER_FILE.read_text().strip())


def increment_episode_number() -> int:
    n = get_episode_number() + 1
    COUNTER_FILE.write_text(str(n))
    return n


def load_universe() -> dict:
    return json.loads((BIBLE_DIR / "universe.json").read_text())


def load_characters() -> dict:
    return json.loads((BIBLE_DIR / "characters.json").read_text())


def load_future_hooks() -> dict:
    return json.loads((BIBLE_DIR / "future_hooks.json").read_text())


def load_recent_episodes(count: int = 3) -> list[dict]:
    episodes = sorted(EPISODES_DIR.glob("ep*.json"))
    recent = episodes[-count:] if len(episodes) >= count else episodes
    return [json.loads(p.read_text()) for p in recent]


def save_episode(episode_number: int, data: dict):
    EPISODES_DIR.mkdir(exist_ok=True)
    path = EPISODES_DIR / f"ep{episode_number:03d}.json"
    path.write_text(json.dumps(data, indent=2))


def update_future_hooks(updated_hooks: dict):
    path = BIBLE_DIR / "future_hooks.json"
    path.write_text(json.dumps(updated_hooks, indent=2))


def build_context_prompt(episode_number: int) -> str:
    universe = load_universe()
    characters = load_characters()
    hooks = load_future_hooks()
    recent_episodes = load_recent_episodes(3)

    # Only include hooks relevant to this range (planted within last 50 eps or payoff due)
    relevant_hooks = [
        h for h in hooks["hooks"]
        if not h["revealed"] and (
            h["planted_episode"] >= episode_number - 50
            or h["payoff_episode"] <= episode_number + 5
        )
    ]

    context = f"""
ARION WORLD — STORY BIBLE CONTEXT FOR EPISODE {episode_number}

=== WORLD OVERVIEW ===
{universe['overview']}

=== ACTIVE TIMELINES ===
{json.dumps(universe['timelines'], indent=2)}

=== POWER SYSTEM ===
{json.dumps(universe['power_system'], indent=2)}

=== ACTIVE MYSTERIES (never resolve these without planning) ===
{json.dumps(universe['active_mysteries'], indent=2)}

=== MAIN CHARACTERS ===
{json.dumps(characters['main_cast'], indent=2)}

=== RELEVANT FUTURE HOOKS (planted clues & payoffs) ===
{json.dumps(relevant_hooks, indent=2)}

=== RECENT EPISODE SUMMARIES ===
{json.dumps(recent_episodes, indent=2) if recent_episodes else "This is Episode 1 — no prior episodes."}
""".strip()

    return context
