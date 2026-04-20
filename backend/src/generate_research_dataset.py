"""
Generate realistic dementia speech dataset using hybrid approach:
- CSV datasets (existing patterns)
- Gemini API (AI-generated realistic variations)
Based on patterns from:
- ADReSSo Challenge Dataset (INTERSPEECH 2020)
- DementiaBank Pitt Corpus
- Clinical research on dementia speech patterns
"""
import os
import pandas as pd
import numpy as np
import random
import json
import logging
import google.generativeai as genai
from preprocess_text import compute_features_for_text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT = os.path.dirname(os.path.dirname(__file__))
PROCESSED_CSV = os.path.join(ROOT, "transcripts", "processed_data.csv")
TRANSCRIPTS_CSV = os.path.join(ROOT, "transcripts", "transcripts.csv")

# Gemini API configuration
GEMINI_API_KEYS = os.getenv("GEMINI_API_KEYS", "").split(",")
GEMINI_API_KEYS = [key.strip() for key in GEMINI_API_KEYS if key.strip()]
GEMINI_ENABLED = len(GEMINI_API_KEYS) > 0

if GEMINI_ENABLED:
    genai.configure(api_key=GEMINI_API_KEYS[0])
    logger.info(f"Gemini API enabled with {len(GEMINI_API_KEYS)} key(s)")
else:
    logger.warning("Gemini API keys not found - will use CSV datasets only")

# Research-based speech patterns from ADReSSo, Pitt Corpus, and clinical studies
# Healthy patterns - clear, coherent, good vocabulary diversity
HEALTHY_PATTERNS = [
    "I completed my morning exercise routine which includes stretching and a brisk walk. Afterward I prepared breakfast and read the morning newspaper. I find this routine helps me start the day with energy and focus.",
    "When I was a child, I spent every summer at my grandmother's house in a small coastal town. We would visit the beach daily to build elaborate sandcastles and search for seashells. In the evenings she would read classic stories to me before bedtime.",
    "I attended a community meeting about improving local parks and recreation facilities. Many residents shared creative ideas during the discussion. We voted on several proposals and the meeting was both productive and engaging.",
    "I remember my wedding day clearly as if it happened yesterday. It was a beautiful spring afternoon in May with perfect weather. All of our family members and close friends attended the ceremony in a lovely garden setting with flowers blooming everywhere.",
    "I've been retired for five years now and I spend much of my time volunteering at the local public library. I help organize books, assist visitors with finding materials, and sometimes lead reading groups. It's very rewarding work that I find meaningful.",
    "My favorite hobby is cooking and I enjoy experimenting with recipes from different cultures. Last week I successfully prepared a Thai curry dish that turned out delicious. I love sharing meals with friends and family because food brings people together.",
    "I walk my dog every morning around our neighborhood for exercise. We typically go for about thirty minutes which is beneficial for both of us. During these walks I've met many friendly neighbors and my dog enjoys greeting everyone we encounter.",
    "I spent time in my workshop building a small wooden shelf. I measured carefully, cut the wood precisely, and assembled the pieces with wood glue and screws. The finished product looks professional and will be useful.",
    "I participated in a book club meeting at the library. We discussed a novel we all read last month. The conversation was lively and everyone shared interesting perspectives on the characters and themes.",
    "I met with several friends for coffee yesterday afternoon at our favorite café. We discussed our summer vacation plans and some of us are considering a group trip together. We haven't finalized the destination yet but we're leaning toward a coastal area.",
    "I visited the local museum to see a new art exhibition. The paintings were beautiful and the curator gave an informative tour. I learned about different artistic techniques and historical periods represented in the collection.",
    "I went shopping for groceries and household items. I made a list beforehand and checked items off as I found them. I also compared prices and found some good deals on produce and meat.",
    "I spent the afternoon organizing my home office. I sorted through old documents, filed important papers, and created a better filing system. I also cleaned my desk and organized my bookshelf by topic and author.",
    "I attended a gardening workshop at the botanical garden. The instructor taught us about soil preparation, plant selection, and seasonal care. I took detailed notes and bought some new tools recommended by the expert.",
    "I cooked a special dinner for my family last night. I prepared roasted chicken with vegetables and homemade bread. Everyone enjoyed the meal and we had pleasant conversation throughout dinner.",
    "I enjoy reading mystery novels in the evening before bedtime. It's a relaxing activity that helps me unwind after a busy day. I usually read for about an hour each night, which allows me to finish approximately one book per week.",
    "Last weekend I visited my grandchildren at their home. We spent the afternoon at the local park where the children played on the swings and slides. We also enjoyed a picnic lunch with sandwiches, fresh fruit, and homemade cookies.",
    "I watched an interesting documentary about African wildlife on television last night. The program focused on elephant migration patterns and featured stunning photography. The narration was informative and the cinematography was truly impressive.",
    "I helped my neighbor with their computer problem yesterday. They were having trouble connecting to the internet. I checked their router settings and helped them reset their password. The problem was resolved quickly.",
    "I've been working diligently in my garden this spring season. I planted various flowers including roses and daisies, along with vegetables like tomatoes and peppers. I water the plants every morning and regularly check for any signs of pests or disease.",
]

# MCI patterns based on ADReSSo and Pitt Corpus research
# Characteristics: Increased fillers, word-finding difficulties, slight repetition
MCI_PATTERNS = [
    "I went to the, um, grocery store yesterday and, um, bought some vegetables. Tomatoes, um, lettuce, and, um, carrots I think. The weather was, um, nice so I walked there. When I got home, um, I made a salad for, um, dinner.",
    "I like reading, um, books in the evening. My favorite, um, type is mysteries. I read, um, before I go to bed. It helps me, um, relax. I usually read for, um, about an hour each night.",
    "I watched a, um, show about animals last night. It was about, uh, elephants I think. The pictures were, um, very nice. The story was, uh, interesting too.",
    "I've been, um, working in my garden. I planted, uh, some flowers and vegetables. The tomatoes, um, are growing well. I water them, uh, every morning. I check for, um, problems regularly.",
    "My neighbor helped me, um, fix my fence. We worked, um, all afternoon. The weather was, um, perfect. Now the fence looks, um, much better.",
    "I visited, um, my grandchildren last weekend. We went, uh, to the park. The children, um, played on the swings. They had, um, a lot of fun. We also, uh, had lunch together.",
    "I enjoy, um, reading in the evening. I like, uh, mystery books. They help me, um, relax before bed. I usually read, um, for about an hour each night.",
    "I went shopping, um, for groceries yesterday. I bought, uh, vegetables and fruit. I also got, um, some bread and milk. The store was, um, very busy.",
    "I spent the afternoon, um, working in my garden. I planted, uh, some new flowers. I also, um, watered all the plants. The garden looks, um, much better now.",
    "I met with friends, um, for coffee yesterday. We talked, uh, about our plans. Some of us, um, want to take a trip. We haven't, uh, decided where yet.",
    "I attended, um, a meeting at the library. We discussed, uh, books we read. The conversation was, um, interesting. Everyone shared, uh, their thoughts.",
    "I cooked dinner, um, for my family. I made, uh, chicken and vegetables. Everyone, um, enjoyed the meal. We talked, uh, about our day.",
    "I walked my dog, um, this morning. We went, uh, around the neighborhood. I met, um, some neighbors. The weather was, uh, very nice.",
    "I read a book, um, last night. It was, uh, a mystery novel. The story was, um, very interesting. I finished it, uh, before bed.",
    "I visited the museum, um, yesterday. I saw, uh, some beautiful paintings. The tour guide, um, was very helpful. I learned, uh, a lot about art.",
]

# Moderate dementia patterns (based on clinical research)
MODERATE_PATTERNS = [
    "I work... in my garden. I planted... flowers. Tomatoes... are growing. I water... every morning. I check... for problems.",
    "Last weekend... I visited... my grandchildren. We went... to the park. We played... on swings. The children... had fun. We had... lunch too.",
    "I like... reading... books. Mysteries... are my favorite. I read... before bed. It helps... me relax. I read... for an hour... each night.",
    "I met... friends... for coffee. We talked... about... summer. Some want... a trip. We haven't... decided... where.",
    "I went... shopping... yesterday. I bought... vegetables... and fruit. The store... was busy. I came... home... after that.",
    "I spent time... in my garden. I planted... some flowers. They are... growing well. I water them... every day.",
    "I visited... my family... last week. We had... a nice time. The children... played games. We ate... dinner together.",
    "I like... to read... in the evening. Books help... me relax. I read... for about... an hour. Then I... go to bed.",
    "I went... to the store. I bought... some things. I came... home. I put... everything away.",
    "I worked... in my garden. I planted... flowers. I watered... the plants. The garden... looks nice.",
]

# Severe dementia patterns (based on clinical research)
SEVERE_PATTERNS = [
    "Meeting... parks. Ideas. Talked. Voted.",
    "Learning... computer. Hard. Practice... day. Better.",
    "Garden... flowers... water... morning.",
    "Store... bought... things... home.",
    "Family... visited... nice... time.",
    "Books... read... evening... relax.",
    "Coffee... friends... talked... plans.",
    "Park... children... played... fun.",
    "Food... cooked... dinner... family.",
    "Walk... dog... morning... exercise.",
]

def generate_with_gemini(base_patterns, num_samples, label, label_name):
    """Generate samples using Gemini API based on base patterns."""
    if not GEMINI_ENABLED:
        return []
    
    samples = []
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Create prompt based on label
    label_descriptions = {
        0: "healthy elderly person with clear, coherent speech, good vocabulary, and no cognitive issues",
        1: "person with Mild Cognitive Impairment (MCI) showing increased fillers (um, uh), word-finding difficulties, slight hesitations, and occasional repetition",
        2: "person with moderate dementia showing frequent pauses, fragmented speech, increased repetition, and difficulty forming complete sentences",
        3: "person with severe dementia showing very fragmented speech, only key words, frequent pauses, and minimal coherent sentences"
    }
    
    description = label_descriptions[label]
    
    # Sample a few base patterns to give context
    sample_patterns = random.sample(base_patterns, min(3, len(base_patterns)))
    
    prompt = f"""Generate {num_samples} realistic speech transcript samples from a {description}.

Base examples:
{chr(10).join(f'- {p}' for p in sample_patterns[:3])}

Requirements:
- Each sample should be 1-3 sentences
- Make them realistic and natural
- For label {label_name}: {description}
- Return ONLY the transcript text, one per line
- Do not include labels, numbers, or explanations
- Each line should be a complete speech sample

Generate exactly {num_samples} samples:"""
    
    try:
        response = model.generate_content(prompt)
        if response.text:
            # Parse response - split by lines and clean
            generated_samples = [
                line.strip() 
                for line in response.text.split('\n') 
                if line.strip() and not line.strip().startswith(('#', '-', '*', '1.', '2.', '3.'))
            ]
            # Filter out any that look like explanations
            generated_samples = [
                s for s in generated_samples 
                if len(s) > 10 and not s.lower().startswith(('generate', 'sample', 'example', 'requirement'))
            ]
            samples.extend(generated_samples[:num_samples])
            logger.info(f"Generated {len(samples)} samples using Gemini for {label_name}")
    except Exception as e:
        logger.warning(f"Gemini generation failed for {label_name}: {e}")
    
    return samples


def generate_variations(base_patterns, num_samples, label):
    """Generate variations of base patterns with realistic modifications."""
    samples = []
    
    # Hybrid approach: Use Gemini for 60% of samples, CSV patterns for 40%
    gemini_count = int(num_samples * 0.6)
    csv_count = num_samples - gemini_count
    
    label_names = {0: "Healthy", 1: "MCI", 2: "Moderate", 3: "Severe"}
    
    # Generate with Gemini if enabled
    if GEMINI_ENABLED and gemini_count > 0:
        gemini_samples = generate_with_gemini(base_patterns, gemini_count, label, label_names[label])
        samples.extend(gemini_samples)
    
    # Generate remaining samples from CSV patterns
    for _ in range(csv_count):
        base = random.choice(base_patterns)
        
        # Apply label-specific modifications
        if label == 0:  # Healthy - minimal modifications
            modified = base
            # Occasional minor variations
            if random.random() < 0.3:
                words = base.split()
                if len(words) > 10:
                    # Minor word substitution
                    idx = random.randint(0, len(words) - 1)
                    words[idx] = random.choice(["also", "then", "after", "before"])
                    modified = " ".join(words)
        
        elif label == 1:  # MCI - add fillers and hesitations
            words = base.split()
            modified_words = []
            for word in words:
                modified_words.append(word)
                # Add fillers with probability
                if random.random() < 0.15 and word not in ["um", "uh", "erm"]:
                    modified_words.append(random.choice(["um", "uh"]))
            modified = " ".join(modified_words)
            # Add some repetition
            if random.random() < 0.2:
                modified = modified + " " + " ".join(words[:3])
        
        elif label == 2:  # Moderate - add pauses and fragmentation
            words = base.split()
            modified_words = []
            for i, word in enumerate(words):
                modified_words.append(word)
                # Add pauses (ellipses) more frequently
                if random.random() < 0.25:
                    modified_words.append("...")
            modified = " ".join(modified_words)
            # Increase repetition
            if random.random() < 0.3:
                modified = modified + " " + " ".join(words[:5])
        
        else:  # Severe - heavy fragmentation
            words = base.split()
            # Keep only key words, add pauses
            key_words = [w for w in words if len(w) > 3][:8]
            modified_words = []
            for word in key_words:
                modified_words.append(word)
                if random.random() < 0.4:
                    modified_words.append("...")
            modified = " ".join(modified_words)
        
        samples.append(modified)
    
    return samples

def load_existing_csv_data():
    """Load existing CSV data if available."""
    csv_data = []
    csv_labels = []
    
    # Try to load from transcripts.csv
    if os.path.exists(TRANSCRIPTS_CSV):
        try:
            df = pd.read_csv(TRANSCRIPTS_CSV)
            if 'transcript' in df.columns and 'label' in df.columns:
                csv_data = df['transcript'].tolist()
                csv_labels = df['label'].tolist()
                logger.info(f"Loaded {len(csv_data)} samples from {TRANSCRIPTS_CSV}")
        except Exception as e:
            logger.warning(f"Failed to load CSV data: {e}")
    
    # Try to load from processed_data.csv
    if os.path.exists(PROCESSED_CSV) and len(csv_data) == 0:
        try:
            df = pd.read_csv(PROCESSED_CSV)
            if 'transcript' in df.columns and 'label' in df.columns:
                csv_data = df['transcript'].tolist()
                csv_labels = df['label'].tolist()
                logger.info(f"Loaded {len(csv_data)} samples from {PROCESSED_CSV}")
        except Exception as e:
            logger.warning(f"Failed to load processed CSV data: {e}")
    
    return csv_data, csv_labels


def create_dataset():
    """Create comprehensive dataset using hybrid approach (CSV + Gemini)."""
    print("Generating hybrid dementia speech dataset (CSV + Gemini)...")
    
    all_transcripts = []
    all_labels = []
    
    # Load existing CSV data
    csv_transcripts, csv_labels = load_existing_csv_data()
    if csv_transcripts:
        all_transcripts.extend(csv_transcripts)
        all_labels.extend(csv_labels)
        print(f"✓ Loaded {len(csv_transcripts)} samples from CSV")
    
    # Generate new samples for each class
    # Based on typical distribution in research datasets (ADReSSo, Pitt Corpus)
    # Hybrid: 60% Gemini-generated, 40% CSV patterns
    print("\nGenerating new samples...")
    
    healthy_samples = generate_variations(HEALTHY_PATTERNS, 150, 0)
    mci_samples = generate_variations(MCI_PATTERNS, 80, 1)
    moderate_samples = generate_variations(MODERATE_PATTERNS, 50, 2)
    severe_samples = generate_variations(SEVERE_PATTERNS, 30, 3)
    
    print(f"✓ Generated {len(healthy_samples)} healthy samples")
    print(f"✓ Generated {len(mci_samples)} MCI samples")
    print(f"✓ Generated {len(moderate_samples)} moderate samples")
    print(f"✓ Generated {len(severe_samples)} severe samples")
    
    all_transcripts.extend(healthy_samples)
    all_labels.extend([0] * len(healthy_samples))
    
    all_transcripts.extend(mci_samples)
    all_labels.extend([1] * len(mci_samples))
    
    all_transcripts.extend(moderate_samples)
    all_labels.extend([2] * len(moderate_samples))
    
    all_transcripts.extend(severe_samples)
    all_labels.extend([3] * len(severe_samples))
    
    # Remove duplicates while preserving order
    seen = set()
    unique_transcripts = []
    unique_labels = []
    for transcript, label in zip(all_transcripts, all_labels):
        transcript_lower = transcript.lower().strip()
        if transcript_lower not in seen:
            seen.add(transcript_lower)
            unique_transcripts.append(transcript)
            unique_labels.append(label)
    
    print(f"\n✓ Total unique samples: {len(unique_transcripts)}")
    print(f"  - From CSV: {len(csv_transcripts) if csv_transcripts else 0}")
    print(f"  - Generated: {len(unique_transcripts) - (len(csv_transcripts) if csv_transcripts else 0)}")
    
    # Create DataFrame
    df = pd.DataFrame({
        'transcript': unique_transcripts,
        'label': unique_labels
    })
    
    # Compute features for each transcript
    print("\nComputing features for all transcripts...")
    features_list = []
    for i, transcript in enumerate(df['transcript']):
        if (i + 1) % 50 == 0:
            print(f"  Processing {i + 1}/{len(df)}...")
        features = compute_features_for_text(transcript)
        features_list.append(features)
    
    # Convert features to DataFrame
    features_df = pd.DataFrame(features_list)
    
    # Combine transcript, label, and features
    result_df = pd.concat([df[['transcript', 'label']], features_df], axis=1)
    
    # Select only the columns that match the expected format
    expected_columns = [
        'transcript', 'label', 'num_words', 'uniq_word_ratio', 'avg_word_length',
        'filler_count', 'pronoun_count', 'stopword_ratio', 'sentences_count',
        'repetition_ratio', 'speech_rate', 'article_ratio', 'self_correction_count'
    ]
    
    # Ensure all expected columns exist
    for col in expected_columns:
        if col not in result_df.columns:
            if col == 'transcript' or col == 'label':
                continue
            result_df[col] = 0.0
    
    # Select and reorder columns
    result_df = result_df[expected_columns]
    
    # Shuffle the dataset
    result_df = result_df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Save to CSV
    result_df.to_csv(PROCESSED_CSV, index=False, encoding='utf-8')
    
    print(f"\n✅ Hybrid dataset generated successfully!")
    print(f"📊 Total samples: {len(result_df)}")
    print(f"📈 Label distribution:")
    print(result_df['label'].value_counts().sort_index())
    if GEMINI_ENABLED:
        print(f"🤖 Gemini API: Enabled (used for ~60% of new samples)")
    else:
        print(f"📝 CSV patterns only (Gemini API not configured)")
    print(f"\n💾 Saved to: {PROCESSED_CSV}")
    
    return result_df

if __name__ == "__main__":
    dataset = create_dataset()
    print("\n📋 Sample data:")
    print(dataset.head(10))

