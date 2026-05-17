import os
import time
import requests
from pathlib import Path


REPLICATE_API = "https://api.replicate.com/v1"


def generate_scene_image(prompt: str, scene_num: int, output_dir: Path) -> Path:
    api_token = os.environ["REPLICATE_API_TOKEN"]

    headers = {
        "Authorization": f"Token {api_token}",
        "Content-Type": "application/json",
    }

    # Use SDXL with anime-optimised settings
    payload = {
        "version": "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
        "input": {
            "prompt": f"anime style, {prompt}, highly detailed, cinematic, vivid colors, sharp focus, professional illustration",
            "negative_prompt": "blurry, low quality, watermark, text, deformed, ugly, bad anatomy, western cartoon style",
            "width": 1920,
            "height": 1080,
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
            "scheduler": "DPMSolverMultistep",
        }
    }

    resp = requests.post(f"{REPLICATE_API}/predictions", json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    prediction_id = resp.json()["id"]

    # Poll for completion
    for _ in range(60):
        time.sleep(3)
        status_resp = requests.get(
            f"{REPLICATE_API}/predictions/{prediction_id}",
            headers=headers,
            timeout=30
        )
        status_resp.raise_for_status()
        result = status_resp.json()

        if result["status"] == "succeeded":
            image_url = result["output"][0]
            img_resp = requests.get(image_url, timeout=60)
            img_resp.raise_for_status()
            output_path = output_dir / f"scene_{scene_num:02d}.png"
            output_path.write_bytes(img_resp.content)
            print(f"Generated image for scene {scene_num}")
            return output_path

        if result["status"] == "failed":
            raise RuntimeError(f"Image generation failed for scene {scene_num}: {result.get('error')}")

    raise TimeoutError(f"Image generation timed out for scene {scene_num}")


def generate_all_images(episode_data: dict, output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    image_files = []

    for scene in episode_data["scenes"]:
        scene_num = scene["scene_number"]
        prompt = scene["image_prompt"]
        img_path = generate_scene_image(prompt, scene_num, output_dir)
        image_files.append(img_path)
        time.sleep(1)  # Avoid hammering the API

    return image_files
