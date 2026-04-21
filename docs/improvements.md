# Proposed Platform Improvements

While the baseline platform successfully encapsulates the multi-modal MERN + Python flow, a production clinical rollout warrants several structural upgrades.

## 1. Algorithmic Optimizations
- **Deep Learning Upgrade:** Migrate the `RandomForestClassifier` to a Multi-Layer Perceptron (MLP) or early-fusion Transformer model when sample sets grow.
- **Continuous STT Alignment:** Synchronize Whisper transcriptions with video timestamps to detect hesitation directly alongside micro-expressions of confusion.

## 2. Platform Scalability
- **Docker Orchestration:** While a `docker-compose.yml` was conceptually outlined, containerizing the heavy DeepFace and PyTorch dependencies is vital for standard cloud deployment without dependency collisions.
- **WebRTC Implementation:** Currently mock audio processing requires physical file transfer. A real-time STT streaming API over WebSockets is recommended for immediate feedback latency.

## 3. UI/UX Enhancements
- **Accessibility Requirements:** Font scaling, high contrast toggle, and localized screen-reader accessibility tags for patients.
- **Reporting Generator:** Generate one-click PDF documents of the Dashboard View outlining clinical metrics for standard EHR uploads.
