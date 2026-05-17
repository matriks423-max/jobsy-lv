import os
import time
from pathlib import Path
import requests


GRAPH_API = "https://graph.facebook.com/v21.0"


def upload_reel_to_instagram(trailer_path: Path, episode_data: dict) -> str:
    """Upload a portrait-format video as an Instagram Reel."""
    account_id = os.environ["INSTAGRAM_ACCOUNT_ID"]
    token = os.environ["FACEBOOK_ACCESS_TOKEN"]
    ep_num = episode_data["episode_number"]

    caption = (
        f"⚔️ Arion World — Episode {ep_num}: {episode_data['title']}\n\n"
        f"{episode_data['logline']}\n\n"
        f"Full 30-minute episode on YouTube — link in bio.\n\n"
        f"New episode every Monday. The clues are hidden in plain sight. 👁️\n\n"
        f"#ArionWorld #AnimeStory #EpicFantasy #NewEpisode #Anime #Fantasy"
    )

    # Step 1: Create media container
    container_resp = requests.post(
        f"{GRAPH_API}/{account_id}/media",
        data={
            "media_type": "REELS",
            "video_url": _get_public_video_url(trailer_path),
            "caption": caption,
            "share_to_feed": "true",
            "access_token": token,
        },
        timeout=60
    )
    container_resp.raise_for_status()
    container_id = container_resp.json()["id"]

    # Step 2: Wait for processing
    for attempt in range(20):
        time.sleep(15)
        status_resp = requests.get(
            f"{GRAPH_API}/{container_id}",
            params={"fields": "status_code,status", "access_token": token},
            timeout=30
        )
        status_resp.raise_for_status()
        status = status_resp.json().get("status_code")
        print(f"Instagram container status: {status}")

        if status == "FINISHED":
            break
        if status == "ERROR":
            raise RuntimeError(f"Instagram media processing failed: {status_resp.json()}")

    # Step 3: Publish
    publish_resp = requests.post(
        f"{GRAPH_API}/{account_id}/media_publish",
        data={"creation_id": container_id, "access_token": token},
        timeout=60
    )
    publish_resp.raise_for_status()
    media_id = publish_resp.json()["id"]
    print(f"Instagram Reel published: {media_id}")
    return media_id


def _get_public_video_url(video_path: Path) -> str:
    # Instagram requires a publicly accessible URL to pull the video from.
    # In the GitHub Actions pipeline, the video is uploaded to a temporary
    # public URL. For now this reads from the TRAILER_PUBLIC_URL env var
    # set by the pipeline after uploading to a CDN or GitHub Releases asset.
    url = os.environ.get("TRAILER_PUBLIC_URL")
    if not url:
        raise RuntimeError(
            "TRAILER_PUBLIC_URL env var must be set before calling Instagram upload. "
            "Upload the trailer to a public URL (GitHub Releases, R2, S3) first."
        )
    return url
