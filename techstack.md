# Tech Stack & Research Analysis: Speech-Based Cognitive Screening

This document outlines the technical architecture, scientific foundation, and socio-economic impact of the **Dementia-AI** project, with a specific focus on the Indian healthcare landscape.

## 1. Technical Framework (Tech Stack)

The system is built on a modular, high-performance architecture designed to handle real-time audio processing and complex AI inference.

### **Frontend: Interactive Diagnostics Interface**
- **React.js (v18.2.0)**: Main framework for building a responsive, component-based user interface.
- **Chart.js & React-Chartjs-2**: Used for visualizing cognitive profiles, speech patterns, and screening results.
- **Axios**: Modern HTTP client for seamless communication with the backend.
- **React Icons**: Optimized iconography for elderly-friendly UX design.

### **Backend: Robust Logic & API Gateway**
- **Node.js & Express (v4.18.2)**: High-concurrency server handling user sessions and file routing.
- **MongoDB (v6.3.0)**: NoSQL database for flexible storage of patient histories and longitudinal screening data.
- **Multer**: Middleware for managing multi-part/form-data, essential for high-fidelity audio uploads.

### **AI Core: Linguistic & Acoustic Biomarkers**
- **Python (3.x)**: The primary engine for signal processing and machine learning.
- **Librosa & SciPy**: Advanced acoustic analysis (pitch, jitter, shimmer, speech rate).
- **Vosk & NLTK**: Offline Speech-to-Text (STT) and Natural Language Processing (NLP) for linguistic feature extraction.
- **Google Generative AI (Gemini)**: State-of-the-art LLM integration for semantic coherence analysis and clinical report generation.
- **Scikit-learn**: Implementation of classification models for cognitive impairment detection.

---

## 2. Research & Academic Foundation

The project's methodology is grounded in rigorous academic research regarding speech as a "Digital Biomarker" for neurodegeneration.

### **Key Research Links (Real Data & Google Scholar)**

1.  **LASI-DAD (Harmonized Diagnostic Assessment of Dementia for the Longitudinal Aging Study in India)**
    - **Citation:** *Prevalence of DSM-5 mild and major neurocognitive disorder in India: Results from the LASI-DAD* (2024).
    - **Link:** [PLOS ONE, 2024](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0297220)
    - **Insight:** Established a **7.2% prevalence** of major neurocognitive disorders and **17.6%** for mild disorders among Indian adults aged 60+.

2.  **National Estimate of Dementia in India**
    - **Citation:** *Prevalence of dementia in India: National and state estimates from a nationwide study* (2023).
    - **Link:** [Alzheimer's & Dementia, 2023](https://alz-journals.onlinelibrary.wiley.com/doi/full/10.1002/alz.12928)
    - **Insight:** Over **8.8 million elderly Indians** are estimated to be living with dementia, a number projected to rise significantly by 2050.

3.  **Speech Biomarkers for Alzheimer's Discovery**
    - **Citation:** *Machine learning-based speech analysis for Alzheimer's disease detection: A systematic review*.
    - **Research Area:** Focuses on how features like "Pause Duration," "Lexical Richness," and "Acoustic Decay" correlate with early-stage cognitive decline.

---

## 3. Socio-Economic Impact in India

The deployment of this technology in India addresses critical gaps in the existing healthcare infrastructure.

### **A. Accessibility in Rural India**
- **Problem:** India has a severe shortage of neurologists (approx. 1 per 1 million people in some states).
- **Impact:** This tool provides a **low-cost, non-invasive** screening method that can be used via a smartphone, bypassing the need for immediate clinical visits for initial assessment.

### **B. Linguistic Diversity Support**
- **Reality:** Dementia presents differently across languages.
- **Impact:** By utilizing **Vosk** (offline) and **NLTK**, the project aims to support Indian regional languages (Hindi, Bengali, Marathi, etc.), which are often ignored by Western-centric diagnostic tools.

### **C. Early Intervention Benefits**
- **Real Data:** Early detection in the "Mild Cognitive Impairment" (MCI) phase can delay the onset of severe Alzheimer's by 5-10 years through lifestyle interventions and cognitive rehabilitation.
- **Impact:** Potentially saves the Indian economy billions in long-term care costs (currently estimated at ₹1.5 - ₹3 Lakhs per patient/year in urban areas).

---

## 4. Summary Table

| Feature | Technology | Impact Area |
| :--- | :--- | :--- |
| **STT Engine** | Vosk | Regional language support for India |
| **Acoustic Analysis** | Librosa | Objective digital biomarkers |
| **Logic Layer** | Node.js/Express | Scalable healthcare distribution |
| **Data Storage** | MongoDB | Patient longitudinal tracking |
| **Inference** | Gemini AI | Semantic diagnostics |

---
**Note:** This data is based on the latest academic consensus and real-world metrics as of 2024.
