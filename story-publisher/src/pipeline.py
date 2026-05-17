"""
Arion World — Weekly Episode Publishing Pipeline

Run manually:   python src/pipeline.py
Run via CI:     triggered by GitHub Actions every Monday 9am UTC

Steps:
  1. Generate episode script (Claude)
  2. Generate narration audio (ElevenLabs)
  3. Generate scene images (Replicate SDXL)
  4. Assemble 30-min video (FFmpeg)
  5. Create 90-sec portrait trailer (FFmpeg)
  6. Publish to YouTube, Facebook, Instagram, TikTok
  7. Update story bible and commit
"""

import json
import os
import sys
import traceback
from pathlib import Path

# Ensure src/ is on path when running from repo root
sys.path.insert(0, str(Path(__file__).parent))

from generate_story import generate_episode
from generate_voice import generate_narration
from generate_images import generate_all_images
from assemble_video import assemble_video
from create_trailer import create_portrait_trailer
from publish_youtube import upload_to_youtube
from publish_facebook import upload_to_facebook
from publish_instagram import upload_reel_to_instagram
from publish_tiktok import upload_to_tiktok
from story_bible import get_episode_number, increment_episode_number, save_episode


BASE_DIR = Path(__file__).parent.parent
WORK_DIR = BASE_DIR / "output"
MUSIC_DIR = BASE_DIR / "assets" / "music"


def find_background_music() -> Path | None:
    music_files = list(MUSIC_DIR.glob("*.mp3")) + list(MUSIC_DIR.glob("*.wav"))
    return music_files[0] if music_files else None


def run_pipeline():
    episode_number = get_episode_number()
    print(f"\n{'='*60}")
    print(f"  ARION WORLD — Episode {episode_number} Pipeline Starting")
    print(f"{'='*60}\n")

    episode_dir = WORK_DIR / f"ep{episode_number:03d}"
    audio_dir = episode_dir / "audio"
    images_dir = episode_dir / "images"
    video_path = episode_dir / f"arion_world_ep{episode_number:03d}.mp4"
    trailer_path = episode_dir / f"arion_world_ep{episode_number:03d}_trailer.mp4"

    # ── Step 1: Generate story ────────────────────────────────
    print("Step 1/6 — Generating episode script with Claude...")
    episode_data = generate_episode(episode_number)
    (episode_dir / "episode_data.json").parent.mkdir(parents=True, exist_ok=True)
    (episode_dir / "episode_data.json").write_text(json.dumps(episode_data, indent=2))
    print(f"Episode '{episode_data['title']}' generated. {len(episode_data['scenes'])} scenes.")

    # ── Step 2: Generate voice narration ─────────────────────
    print("\nStep 2/6 — Generating narration audio with ElevenLabs...")
    audio_files = generate_narration(episode_data, audio_dir)
    print(f"{len(audio_files)} audio files generated.")

    # ── Step 3: Generate images ───────────────────────────────
    print("\nStep 3/6 — Generating scene images with Replicate SDXL...")
    image_files = generate_all_images(episode_data, images_dir)
    print(f"{len(image_files)} images generated.")

    # ── Step 4: Assemble video ────────────────────────────────
    print("\nStep 4/6 — Assembling 30-minute video with FFmpeg...")
    music = find_background_music()
    if music:
        print(f"  Using background music: {music.name}")
    assemble_video(episode_data, image_files, audio_files, video_path, music)

    # ── Step 5: Create trailer ────────────────────────────────
    print("\nStep 5/6 — Creating 90-second portrait trailer...")
    create_portrait_trailer(video_path, trailer_path)

    # ── Step 6: Publish to all platforms ─────────────────────
    print("\nStep 6/6 — Publishing to platforms...")
    results = {}

    try:
        print("  → YouTube (full 30-min video)...")
        results["youtube"] = upload_to_youtube(video_path, episode_data)
    except Exception as e:
        print(f"  ✗ YouTube failed: {e}")
        results["youtube"] = f"FAILED: {e}"

    try:
        print("  → Facebook (full video)...")
        results["facebook"] = upload_to_facebook(video_path, episode_data)
    except Exception as e:
        print(f"  ✗ Facebook failed: {e}")
        results["facebook"] = f"FAILED: {e}"

    try:
        print("  → Instagram Reels (90-sec trailer)...")
        results["instagram"] = upload_reel_to_instagram(trailer_path, episode_data)
    except Exception as e:
        print(f"  ✗ Instagram failed: {e}")
        results["instagram"] = f"FAILED: {e}"

    try:
        print("  → TikTok (90-sec trailer)...")
        results["tiktok"] = upload_to_tiktok(trailer_path, episode_data)
    except Exception as e:
        print(f"  ✗ TikTok failed: {e}")
        results["tiktok"] = f"FAILED: {e}"

    # ── Save episode to bible ─────────────────────────────────
    save_episode(episode_number, {
        "episode_number": episode_number,
        "title": episode_data["title"],
        "logline": episode_data["logline"],
        "summary": episode_data["episode_summary"],
        "cliffhanger": episode_data["cliffhanger"],
        "character_updates": episode_data.get("character_state_updates", {}),
        "hooks_planted": [h["id"] for h in episode_data.get("new_hooks_planted", [])],
        "hooks_paid_off": episode_data.get("hooks_paid_off", []),
        "publish_results": results,
    })

    increment_episode_number()

    print(f"\n{'='*60}")
    print(f"  Episode {episode_number} Complete!")
    print(f"  Title: {episode_data['title']}")
    print(f"  Cliffhanger: {episode_data['cliffhanger']}")
    print(f"\n  Platform results:")
    for platform, result in results.items():
        status = "✓" if not str(result).startswith("FAILED") else "✗"
        print(f"    {status} {platform}: {result}")
    print(f"{'='*60}\n")

    failed = [p for p, r in results.items() if str(r).startswith("FAILED")]
    if failed:
        print(f"WARNING: {len(failed)} platform(s) failed: {', '.join(failed)}")
        sys.exit(1)


if __name__ == "__main__":
    run_pipeline()
