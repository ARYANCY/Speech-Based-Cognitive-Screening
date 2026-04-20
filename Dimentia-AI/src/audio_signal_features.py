import os
import numpy as np
import soundfile as sf
import tempfile
import subprocess
import shutil
try:
    import miniaudio  # lightweight decoder (supports webm/opus, mp3, wav, flac)
except ImportError:
    miniaudio = None
try:
    from pydub import AudioSegment
    pydub_available = True
except ImportError:
    pydub_available = False


def _frame_signal(signal, frame_size, hop_size):
    num_frames = 1 + max(0, (len(signal) - frame_size) // hop_size)
    frames = np.lib.stride_tricks.as_strided(
        signal,
        shape=(num_frames, frame_size),
        strides=(signal.strides[0] * hop_size, signal.strides[0]),
        writeable=False,
    )
    return frames


def _decode_with_miniaudio(audio_path, target_sr=16000):
    if miniaudio is None:
        raise RuntimeError("miniaudio not installed")
    
    # Try different miniaudio APIs for better compatibility
    try:
        # Method 1: Try decode with file path directly (some versions support this)
        try:
            decoded = miniaudio.decode_file(audio_path, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1, sample_rate=target_sr)
            samples = np.array(decoded.samples, dtype=np.float32)
            return samples, decoded.sample_rate
        except (AttributeError, TypeError):
            # Method 2: Read file and decode bytes
            with open(audio_path, "rb") as f:
                data = f.read()
            
            # Try without forcing sample rate conversion first
            try:
                decoded = miniaudio.decode(data, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1)
                samples = np.array(decoded.samples, dtype=np.float32)
                sr = decoded.sample_rate
                
                # Resample if needed
                if sr != target_sr:
                    from scipy import signal
                    num_samples = int(len(samples) * target_sr / sr)
                    samples = signal.resample(samples, num_samples)
                    sr = target_sr
                
                return samples, sr
            except Exception:
                # Method 3: Try with sample rate conversion
                decoded = miniaudio.decode(data, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1, sample_rate=target_sr)
                samples = np.array(decoded.samples, dtype=np.float32)
                return samples, decoded.sample_rate
    except Exception as e:
        raise RuntimeError(f"miniaudio decode failed: {e}")


def _load_audio_with_fallback(audio_path, target_sr=16000):
    """
    Load audio. Try soundfile; if it fails, try miniaudio; finally ffmpeg if available.
    """
    last_error = None
    try:
        return sf.read(audio_path)
    except Exception as e:
        last_error = str(e)
        pass

    # Try miniaudio (lightweight, supports webm/opus)
    if miniaudio is not None:
        try:
            return _decode_with_miniaudio(audio_path, target_sr=target_sr)
        except Exception as e:
            last_error = str(e)
            pass
    else:
        last_error = "miniaudio not installed"
    
    # Try pydub (requires ffmpeg but handles webm well)
    if pydub_available:
        try:
            audio = AudioSegment.from_file(audio_path)
            # Convert to mono and target sample rate
            audio = audio.set_channels(1).set_frame_rate(target_sr)
            # Export to numpy array
            samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
            # Normalize to [-1, 1]
            if audio.sample_width == 1:
                samples = (samples - 128) / 128.0
            elif audio.sample_width == 2:
                samples = samples / 32768.0
            elif audio.sample_width == 4:
                samples = samples / 2147483648.0
            return samples, target_sr
        except Exception as e:
            if last_error:
                last_error += f"; pydub failed: {str(e)}"
            else:
                last_error = f"pydub failed: {str(e)}"
            pass

    # Last resort: ffmpeg if installed
    # Check if ffmpeg is available using shutil.which (cleaner than subprocess)
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path is None:
        # ffmpeg not available, raise helpful error
        error_msg = (
            f"Could not load audio file '{audio_path}'. "
            f"soundfile failed: {last_error or 'unknown error'}. "
            f"miniaudio: {'not installed' if miniaudio is None else 'failed'}. "
            "ffmpeg: not found in PATH. "
            "Please install miniaudio: pip install miniaudio "
            "or install ffmpeg and ensure it's in your PATH."
        )
        raise RuntimeError(error_msg)
    
    # ffmpeg is available, try to use it
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            audio_path,
            "-ac",
            "1",
            "-ar",
            str(target_sr),
            tmp.name,
        ]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg decode failed: {proc.stderr.decode(errors='ignore')[:400]}")
        return sf.read(tmp.name)


def extract_audio_features(audio_path, frame_ms=30, hop_ms=10):
    """Compute pause / prosody features directly from raw audio."""
    if not os.path.exists(audio_path):
        raise FileNotFoundError(audio_path)

    signal, sr = _load_audio_with_fallback(audio_path)
    if signal.ndim > 1:  # stereo -> mono
        signal = np.mean(signal, axis=1)

    # normalize to avoid scale issues
    if np.max(np.abs(signal)) > 0:
        signal = signal / np.max(np.abs(signal))

    duration_sec = len(signal) / sr if sr > 0 else 0.0
    if duration_sec == 0:
        raise ValueError("Empty audio")

    frame_size = int(frame_ms * sr / 1000)
    hop_size = int(hop_ms * sr / 1000)
    if frame_size <= 0 or hop_size <= 0:
        raise ValueError("Invalid frame or hop size")

    frames = _frame_signal(signal, frame_size, hop_size)
    if len(frames) == 0:
        raise ValueError("Audio too short for framing")

    # RMS energy per frame
    rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-9)
    rms_mean = float(np.mean(rms))
    rms_std = float(np.std(rms))

    # Zero crossing rate per frame
    zcr = np.mean(
        np.abs(np.diff(np.sign(frames), axis=1)) > 0,
        axis=1,
    )
    zcr_mean = float(np.mean(zcr))
    zcr_std = float(np.std(zcr))

    # Voice activity detection via energy threshold
    # Threshold: adaptive based on median energy
    energy_threshold = np.median(rms) + 0.5 * np.std(rms)
    speech_frames = rms >= energy_threshold

    speech_ratio = float(np.mean(speech_frames))
    pause_ratio = 1.0 - speech_ratio

    # Pause stats
    # identify contiguous silent runs
    silent_runs = []
    current = 0
    for val in speech_frames:
        if not val:
            current += 1
        elif current > 0:
            silent_runs.append(current)
            current = 0
    if current > 0:
        silent_runs.append(current)

    if len(silent_runs) > 0:
        pause_durations_sec = [run * hop_size / sr for run in silent_runs]
        pause_count = len(pause_durations_sec)
        pause_mean = float(np.mean(pause_durations_sec))
        pause_max = float(np.max(pause_durations_sec))
    else:
        pause_count = 0
        pause_mean = 0.0
        pause_max = 0.0

    pause_rate_per_sec = pause_count / duration_sec if duration_sec > 0 else 0.0

    # Speaking activity per second (proxy for speech rate without transcript)
    speech_activity_per_sec = (np.sum(speech_frames) * hop_size / sr) / duration_sec

    # Spectral centroid (rough brightness cue)
    # Use FFT magnitude; operate on frames
    freqs = np.fft.rfftfreq(frame_size, d=1.0 / sr)
    mag = np.abs(np.fft.rfft(frames, axis=1))
    mag_sum = np.sum(mag, axis=1) + 1e-9
    centroid = np.sum(freqs * mag, axis=1) / mag_sum
    centroid_mean = float(np.mean(centroid))
    centroid_std = float(np.std(centroid))

    return {
        "duration_sec": duration_sec,
        "rms_mean": rms_mean,
        "rms_std": rms_std,
        "zcr_mean": zcr_mean,
        "zcr_std": zcr_std,
        "speech_ratio": speech_ratio,
        "pause_ratio": pause_ratio,
        "pause_count": float(pause_count),
        "pause_rate_per_sec": pause_rate_per_sec,
        "pause_mean_sec": pause_mean,
        "pause_max_sec": pause_max,
        "speech_activity_per_sec": speech_activity_per_sec,
        "centroid_mean": centroid_mean,
        "centroid_std": centroid_std,
    }


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 src/audio_signal_features.py <audio_path>")
        sys.exit(1)

    feats = extract_audio_features(sys.argv[1])
    print(json.dumps(feats, indent=2))

