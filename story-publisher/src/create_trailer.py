import subprocess
from pathlib import Path


def create_portrait_trailer(full_video: Path, output_path: Path, duration_seconds: int = 90) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Extract first N seconds and crop to 9:16 portrait for TikTok/Instagram
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(full_video),
        "-t", str(duration_seconds),
        "-vf", "crop=607:1080:656:0,scale=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "192k",
        str(output_path)
    ], check=True, capture_output=True)

    print(f"Trailer created: {output_path} ({duration_seconds}s, portrait 9:16)")
    return output_path


def create_landscape_trailer(full_video: Path, output_path: Path, duration_seconds: int = 90) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(full_video),
        "-t", str(duration_seconds),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "192k",
        str(output_path)
    ], check=True, capture_output=True)

    print(f"Landscape trailer created: {output_path} ({duration_seconds}s)")
    return output_path
