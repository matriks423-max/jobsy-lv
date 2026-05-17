import subprocess
import json
import random
from pathlib import Path


def get_audio_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True
    )
    return float(result.stdout.strip())


def _ken_burns_filter(duration: float, index: int, width: int = 1920, height: int = 1080) -> str:
    directions = [
        f"zoompan=z='min(zoom+0.0008,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
        f"zoompan=z='if(lte(zoom,1.0),1.3,max(1.001,zoom-0.0008))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
        f"zoompan=z='min(zoom+0.0008,1.3)':x='0':y='0'",
        f"zoompan=z='min(zoom+0.0008,1.3)':x='iw-iw/zoom':y='ih-ih/zoom'",
    ]
    d = directions[index % len(directions)]
    fps = 25
    frames = int(duration * fps)
    return f"{d}:d={frames}:s={width}x{height}:fps={fps}"


def assemble_video(
    episode_data: dict,
    image_files: list[Path],
    audio_files: list[Path],
    output_path: Path,
    background_music: Path | None = None,
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    work_dir = output_path.parent / "work"
    work_dir.mkdir(exist_ok=True)

    scene_videos = []

    for i, (img, audio) in enumerate(zip(image_files, audio_files)):
        duration = get_audio_duration(audio)
        kb = _ken_burns_filter(duration, i)
        scene_out = work_dir / f"scene_{i:02d}.mp4"

        subprocess.run([
            "ffmpeg", "-y",
            "-loop", "1", "-i", str(img),
            "-i", str(audio),
            "-vf", kb,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            "-pix_fmt", "yuv420p",
            str(scene_out)
        ], check=True, capture_output=True)

        scene_videos.append(scene_out)
        print(f"Assembled scene {i + 1}/{len(image_files)}")

    # Crossfade transition between scenes using concat with xfade
    concat_list = work_dir / "concat.txt"
    with open(concat_list, "w") as f:
        for v in scene_videos:
            f.write(f"file '{v.resolve()}'\n")

    merged = work_dir / "merged.mp4"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_list),
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-c:a", "aac", "-b:a", "192k",
        str(merged)
    ], check=True, capture_output=True)

    copyright_meta = [
        "-metadata", "copyright=© Arion World. All rights reserved.",
        "-metadata", "artist=Arion World",
        "-metadata", "comment=Original intellectual property. Unauthorised reproduction prohibited.",
    ]

    if background_music and background_music.exists():
        subprocess.run([
            "ffmpeg", "-y",
            "-i", str(merged),
            "-stream_loop", "-1", "-i", str(background_music),
            "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.2[aout]",
            "-map", "0:v", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            *copyright_meta,
            str(output_path)
        ], check=True, capture_output=True)
    else:
        subprocess.run([
            "ffmpeg", "-y",
            "-i", str(merged),
            "-c", "copy",
            *copyright_meta,
            str(output_path)
        ], check=True, capture_output=True)
        merged.unlink(missing_ok=True)

    print(f"Full episode assembled: {output_path}")
    return output_path


def generate_title_card(episode_data: dict, output_dir: Path) -> Path:
    title = episode_data["title"]
    ep_num = episode_data["episode_number"]
    out = output_dir / "title_card.png"

    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c=0x0a0a1a:size=1920x1080:duration=1",
        "-vf", (
            f"drawtext=text='ARION WORLD':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=h/3,"
            f"drawtext=text='Episode {ep_num}\\: {title}':fontcolor=gold:fontsize=40:x=(w-text_w)/2:y=h/2"
        ),
        "-frames:v", "1",
        str(out)
    ], check=True, capture_output=True)

    return out
