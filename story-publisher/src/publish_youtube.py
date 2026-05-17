import os
import json
import time
from pathlib import Path
import requests


TOKEN_URL = "https://oauth2.googleapis.com/token"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
API_URL = "https://www.googleapis.com/youtube/v3"


def get_access_token() -> str:
    resp = requests.post(TOKEN_URL, data={
        "client_id": os.environ["YOUTUBE_CLIENT_ID"],
        "client_secret": os.environ["YOUTUBE_CLIENT_SECRET"],
        "refresh_token": os.environ["YOUTUBE_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }, timeout=30)
    resp.raise_for_status()
    return resp.json()["access_token"]


def build_description(episode_data: dict) -> str:
    ep_num = episode_data["episode_number"]
    title = episode_data["title"]
    logline = episode_data["logline"]
    cliffhanger_hint = "Watch until the end — something changes everything."

    return f"""Episode {ep_num}: {title}

{logline}

{cliffhanger_hint}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARION WORLD is an epic animated story series set in a universe where time is broken and every truth is a lie waiting to be remembered.

New episodes every Monday.

Subscribe and hit the bell — the clues are in the details.

#ArionWorld #AnimeStory #EpicFantasy #Storytime
━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""


def upload_to_youtube(video_path: Path, episode_data: dict) -> str:
    token = get_access_token()
    ep_num = episode_data["episode_number"]
    title = episode_data["title"]

    metadata = {
        "snippet": {
            "title": f"Arion World — Episode {ep_num}: {title}",
            "description": build_description(episode_data),
            "tags": ["ArionWorld", "anime", "fantasy", "story", "epic", "animated story"],
            "categoryId": "24",  # Entertainment
            "defaultLanguage": "en",
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False,
        }
    }

    headers = {"Authorization": f"Bearer {token}"}
    file_size = video_path.stat().st_size

    # Initiate resumable upload
    init_resp = requests.post(
        f"{UPLOAD_URL}?uploadType=resumable&part=snippet,status",
        headers={**headers, "Content-Type": "application/json", "X-Upload-Content-Type": "video/mp4",
                 "X-Upload-Content-Length": str(file_size)},
        json=metadata,
        timeout=30
    )
    init_resp.raise_for_status()
    upload_uri = init_resp.headers["Location"]

    # Upload in chunks
    chunk_size = 10 * 1024 * 1024  # 10MB
    uploaded = 0

    with open(video_path, "rb") as f:
        while uploaded < file_size:
            chunk = f.read(chunk_size)
            end = uploaded + len(chunk) - 1
            upload_resp = requests.put(
                upload_uri,
                headers={
                    **headers,
                    "Content-Range": f"bytes {uploaded}-{end}/{file_size}",
                    "Content-Type": "video/mp4",
                },
                data=chunk,
                timeout=300
            )

            if upload_resp.status_code in (200, 201):
                video_id = upload_resp.json()["id"]
                print(f"YouTube upload complete: https://youtube.com/watch?v={video_id}")
                return video_id

            if upload_resp.status_code == 308:
                uploaded = int(upload_resp.headers["Range"].split("-")[1]) + 1
                print(f"YouTube upload progress: {uploaded / file_size * 100:.1f}%")
            else:
                upload_resp.raise_for_status()

    raise RuntimeError("YouTube upload ended without completion")
