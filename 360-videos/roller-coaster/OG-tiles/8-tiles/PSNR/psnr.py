import json, os, subprocess

# ==== CONFIG ====
TILE_DIR = "tiles"  # folder with subfolders: 144p/, 360p/, 480p/
OUTPUT_DIR = "segments"  # where to save intermediate and final files
LOG_FILE = "quality_log.json"  # your log file
FINAL_VIDEO = "final_output.mp4"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Quality to folder map
QUALITY_PATH = {
    "low": "144p",
    "mid": "360p",
    "high": "480p"
}

# Load log
with open(LOG_FILE) as f:
    log = json.load(f)

# Group log entries per tile
tile_segments = {i: [] for i in range(8)}
for entry in log:
    tile_segments[entry["tileIndex"]].append(entry)

# Step 1: Extract segments
concat_lists = {}

for tile_id, segments in tile_segments.items():
    concat_file = os.path.join(OUTPUT_DIR, f"{tile_id}_concat.txt")
    concat_lists[tile_id] = concat_file
    with open(concat_file, "w") as f:
        for idx, seg in enumerate(segments):
            src = os.path.join(TILE_DIR, QUALITY_PATH[seg["quality"]], f"{tile_id}.mp4")
            rel_out = f"{tile_id}_part{idx}.mp4"
            full_out = os.path.join(OUTPUT_DIR, rel_out)
            f.write(f"file '{rel_out}'\n")

            # Cut segment
            # cmd = [
            #     "ffmpeg", "-y", "-i", src,
            #     "-ss", str(seg["time"]),
            #     "-t", str(seg["duration"]),
            #     "-c", "copy", full_out
            # ]
            cmd = [
              "ffmpeg", "-y",
              "-ss", str(seg["time"]),
              "-t", str(seg["duration"]),
              "-i", src,
              "-vf", "scale=720:480,fps=30",
              "-c:v", "libx264",
              "-preset", "veryfast",
              "-crf", "23",
              full_out
            ]


            print("Running:", " ".join(cmd))
            subprocess.run(cmd, check=True)

# Step 2: Concatenate per tile
tile_outputs = []
for tile_id in range(8):
    concat_file = concat_lists[tile_id]
    output = os.path.join(OUTPUT_DIR, f"{tile_id}_final.mp4")
    tile_outputs.append(output)

    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_file, "-c", "copy", output
    ]
    print("Concatenating:", output)
    subprocess.run(cmd, check=True)

# Step 3: Stack tiles: Top row and Bottom row
def hstack(outname, inputs):
    filters = []
    for idx, path in enumerate(inputs):
        filters.append(f"[{idx}:v]scale=720:480[v{idx}]")
    inputs_map = "".join([f"[v{idx}]" for idx in range(len(inputs))])
    cmd = ["ffmpeg", "-y"]
    for i in inputs:
        cmd += ["-i", i]
    cmd += [
        "-filter_complex", f"{';'.join(filters)};{inputs_map}hstack=inputs={len(inputs)}",
        os.path.join(OUTPUT_DIR, outname)
    ]
    subprocess.run(cmd, check=True)

def vstack(outname, inputs):
    filters = []
    for idx, path in enumerate(inputs):
        filters.append(f"[{idx}:v]scale=1920:480[v{idx}]")  # total width of hstack row = 4×720
    inputs_map = "".join([f"[v{idx}]" for idx in range(len(inputs))])
    cmd = ["ffmpeg", "-y"]
    for i in inputs:
        cmd += ["-i", i]
    cmd += [
        "-filter_complex", f"{';'.join(filters)};{inputs_map}vstack=inputs={len(inputs)}",
        outname
    ]
    subprocess.run(cmd, check=True)

# Correct tile layout
# top_row_files = [os.path.join(OUTPUT_DIR, f"{n}_final.mp4") for n in [1, 0, 2, 3]]
top_row_files = [os.path.join(OUTPUT_DIR, f"{n}_final.mp4") for n in [3, 2, 0, 1]]
# bot_row_files = [os.path.join(OUTPUT_DIR, f"{n}_final.mp4") for n in [5, 4, 6, 7]]
bot_row_files = [os.path.join(OUTPUT_DIR, f"{n}_final.mp4") for n in [7, 6, 4, 5]]


# Output intermediate
top_row_out = os.path.join(OUTPUT_DIR, "top_row.mp4")
bot_row_out = os.path.join(OUTPUT_DIR, "bot_row.mp4")

hstack("top_row.mp4", top_row_files)
hstack("bot_row.mp4", bot_row_files)
vstack(FINAL_VIDEO, [top_row_out, bot_row_out])

print("✅ Reconstruction complete: final_output.mp4")


# command to get the PSNR values
# ffmpeg -i final_output.mp4 -i original_full.mp4 -lavfi psnr="stats_file=psnr_log.txt" -f null -
