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


def load_races() -> dict:
    path = BIBLE_DIR / "races.json"
    return json.loads(path.read_text()) if path.exists() else {}


def load_continents() -> dict:
    path = BIBLE_DIR / "continents.json"
    return json.loads(path.read_text()) if path.exists() else {}


def load_techniques() -> dict:
    path = BIBLE_DIR / "techniques.json"
    return json.loads(path.read_text()) if path.exists() else {"techniques": []}


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
    races = load_races()
    continents = load_continents()
    techniques = load_techniques()
    hooks = load_future_hooks()
    recent_episodes = load_recent_episodes(3)

    relevant_hooks = [
        h for h in hooks["hooks"]
        if not h["revealed"] and (
            h["planted_episode"] >= episode_number - 50
            or h["payoff_episode"] <= episode_number + 5
        )
    ]

    # Only include races/continents relevant to current story scope
    # Early episodes: only Known Continent + races present there
    # Expand as episode count grows
    if episode_number < 20:
        relevant_races = {k: v for k, v in races.get("races", {}).items()
                         if k in ("Humans", "Keth", "Valdri", "Seren", "Fael", "Resonborn")}
        relevant_continents = {k: v for k, v in continents.get("continents", {}).items()
                               if v.get("status") in ("primary_season_1_location",)}
    else:
        relevant_races = races.get("races", {})
        relevant_continents = continents.get("continents", {})

    context = f"""
ARION WORLD — STORY BIBLE CONTEXT FOR EPISODE {episode_number}

=== WORLD OVERVIEW ===
{universe['overview']}

=== WORLD SETTING ===
{json.dumps(universe.get('world_setting', {}), indent=2)}

=== SKILL SYSTEM (THE OPEN PATH) ===
{json.dumps(universe.get('skill_system', {}), indent=2)}

=== ACTIVE TIMELINES ===
{json.dumps(universe['timelines'], indent=2)}

=== POWER SYSTEM ===
{json.dumps(universe['power_system'], indent=2)}

=== RACES (in story scope for this episode) ===
{json.dumps(relevant_races, indent=2)}

=== KNOWN GEOGRAPHY ===
{json.dumps(relevant_continents, indent=2)}

=== KNOWN TECHNIQUES (game-compatible skill log) ===
{json.dumps(techniques.get('techniques', []), indent=2)}

=== FACTIONS ===
{json.dumps(universe.get('factions', {}), indent=2)}

=== ACTIVE MYSTERIES ===
{json.dumps(universe['active_mysteries'], indent=2)}

=== MAIN CHARACTERS ===
{json.dumps(characters['main_cast'], indent=2)}

=== RELEVANT FUTURE HOOKS ===
{json.dumps(relevant_hooks, indent=2)}

=== RECENT EPISODE SUMMARIES ===
{json.dumps(recent_episodes, indent=2) if recent_episodes else "This is Episode 1 — no prior episodes."}
""".strip()

    return context
