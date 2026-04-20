# src/transcribr.py
import os
import pandas as pd
from tqdm import tqdm
import whisper

VALID_EXT = (".wav", ".ogg", ".mp3", ".flac", ".m4a", ".aac")

ROOT = os.path.dirname(os.path.dirname(__file__))
DATA_ROOT = os.path.join(ROOT, "data")
TRANSCRIPTS_DIR = os.path.join(ROOT, "transcripts")
# Some datasets use the misspelling "dimentia" – support both to be robust
DEMENTIA_SUBFOLDERS = ["dementia", "dimentia"]
HEALTHY_SUBFOLDER = "healthy"

def find_files(folder):
    """
    Recursively collect audio files under a folder.
    Returns list of (abs_path, speaker_name) tuples.
    Speaker is inferred from the immediate parent directory of the audio file.
    """
    results = []
    if not os.path.exists(folder):
        return results
    for root, _, files in os.walk(folder):
        for f in files:
            if f.lower().endswith(VALID_EXT):
                abs_path = os.path.join(root, f)
                speaker = os.path.basename(os.path.dirname(abs_path))
                results.append((abs_path, speaker))
    return results

def transcribe_all(model_name="base"):
    print(f"Loading Whisper model '{model_name}'...")
    model = whisper.load_model(model_name)

    os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)
    rows = []

    dementia_files = []
    for sub in DEMENTIA_SUBFOLDERS:
        dementia_files.extend(find_files(os.path.join(DATA_ROOT, sub)))
    healthy_files = find_files(os.path.join(DATA_ROOT, HEALTHY_SUBFOLDER))

    all_files = [(*p, 1) for p in dementia_files] + [(*p, 0) for p in healthy_files]
    print(f"Found {len(all_files)} files (dementia={len(dementia_files)}, healthy={len(healthy_files)})")

    for file_path, speaker, label in tqdm(all_files):
        try:
            result = model.transcribe(file_path, language="en")
            text = result.get("text", "").strip()
            base = os.path.basename(file_path)
            name, _ = os.path.splitext(base)
            txt_path = os.path.join(TRANSCRIPTS_DIR, f"{name}.txt")
            with open(txt_path, "w", encoding="utf-8") as fh:
                fh.write(text)
            rows.append({
                "filename": base,
                "file_path": file_path,
                "speaker": speaker,
                "label": label,
                "transcript": text
            })
        except Exception as e:
            print(f"[ERROR] {file_path}: {e}")
            rows.append({
                "filename": os.path.basename(file_path),
                "file_path": file_path,
                "speaker": speaker,
                "label": label,
                "transcript": ""
            })

    df = pd.DataFrame(rows)
    csv_path = os.path.join(TRANSCRIPTS_DIR, "transcripts.csv")
    df.to_csv(csv_path, index=False, encoding="utf-8")
    print("Saved transcripts CSV:", csv_path)
    return csv_path

if __name__ == "__main__":
    transcribe_all(model_name="base")
