# src/preprocess_text.py
import os
import re
import string
import pandas as pd
import numpy as np

ROOT = os.path.dirname(os.path.dirname(__file__))
TRANSCRIPTS_CSV = os.path.join(ROOT, "transcripts", "transcripts.csv")
PROCESSED_CSV = os.path.join(ROOT, "transcripts", "processed_data.csv")

FILLERS_SINGLE = {"um", "uh", "erm", "ah", "like", "hmm", "huh"}
FILLERS_PHRASES = {"you know", "i mean"}
FILLERS = FILLERS_SINGLE | FILLERS_PHRASES
PRONOUNS = {"i","me","my","mine","we","us","our","ours","you","your","yours","he","him","his","she","her","they","them","their","theirs","it","its"}
STOPWORDS = {"the","a","an","and","or","but","if","while","is","are","was","were","be","been","to","of","in","on","for","with","as","by","that","this","these","those","at","from","it","its","which","who","whom","what","when","where","why","how","can","could","should","would","may","might","will","shall"}

def clean_text(text):
    if not isinstance(text, str):
        return ""
    t = text.replace("\n", " ").lower()
    t = re.sub(r"\[.*?\]|\(.*?\)|<.*?>", " ", t)
    t = re.sub(r"[{}]".format(re.escape(string.punctuation.replace("'", ""))), " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

def get_sentence_count(text):
    if not text:
        return 0
    sentences = re.split(r"[.!?]+", text)
    return sum(1 for s in sentences if s.strip())

def count_fillers(text):
    cnt = 0
    words = text.split()
    
    # Count single-word fillers
    for w in words:
        if w in FILLERS_SINGLE:
            cnt += 1
    
    # Count multi-word phrases using word boundaries to avoid substring matches
    for phrase in FILLERS_PHRASES:
        # Use word boundaries to match whole phrases only
        pattern = r'\b' + re.escape(phrase) + r'\b'
        matches = len(re.findall(pattern, text))
        cnt += matches
    
    return cnt

def count_pronouns(text):
    return sum(1 for w in text.split() if w in PRONOUNS)

def repetition_ratio(text):
    """
    Measure vocabulary repetition - strong dementia indicator.
    Higher ratio = more repetition = more dementia-like speech.
    """
    cleaned = clean_text(text)
    words = cleaned.split()
    
    if len(words) < 5:
        return 0.0
    
    # Count word frequencies, excluding stopwords
    from collections import Counter
    word_freq = Counter(word for word in words if word not in STOPWORDS)
    
    if not word_freq:
        return 0.0
    
    # Sum of frequencies of top 5 repeated words
    most_common_5 = word_freq.most_common(5)
    repeated_count = sum(count for word, count in most_common_5)
    
    return repeated_count / len(words)

def speech_rate(text):
    """
    Calculate average words per sentence.
    Dementia patients often have fragmented or very long rambling sentences.
    """
    cleaned = clean_text(text)
    words = len(cleaned.split())
    sentences = get_sentence_count(text)
    
    return words / sentences if sentences > 0 else 0.0

def article_ratio(text):
    """
    Ratio of articles (a, an, the) - grammar indicator.
    Dementia causes loss of grammatical complexity.
    """
    ARTICLES = {"a", "an", "the"}
    words = clean_text(text).split()
    articles = sum(1 for w in words if w in ARTICLES)
    
    return articles / len(words) if len(words) > 0 else 0.0

def self_correction_count(text):
    """
    Count self-correction phrases indicating speech hesitation.
    Dementia patients struggle with word retrieval.
    """
    CORRECTION_PHRASES = {
        "wait", "no wait", "actually", "i mean", "i think", 
        "well", "like", "you know", "uh", "um"
    }
    
    words = clean_text(text).split()
    # Count how many correction words appear
    return sum(1 for w in words if w in CORRECTION_PHRASES)

def content_word_ratio(text):
    """
    Ratio of content words (nouns, verbs) vs function words.
    Dementia patients use fewer content words.
    """
    words = clean_text(text).split()
    if len(words) == 0:
        return 0.0
    # Simple heuristic: content words are longer and not stopwords
    content_words = [w for w in words if len(w) > 3 and w not in STOPWORDS]
    return len(content_words) / len(words)

def filler_per_sentence(text):
    """
    Average fillers per sentence.
    Dementia patients have more fillers per sentence.
    """
    fillers = count_fillers(clean_text(text))
    sentences = get_sentence_count(text)
    return fillers / sentences if sentences > 0 else 0.0

def pronoun_to_noun_ratio(text):
    """
    Ratio of pronouns to total words.
    Dementia patients use more pronouns due to word-finding difficulties.
    """
    pronouns = count_pronouns(clean_text(text))
    words = clean_text(text).split()
    return pronouns / len(words) if len(words) > 0 else 0.0

def compute_features_for_text(text):
    cleaned = clean_text(text)
    words = cleaned.split()
    num_words = len(words)
    avg_word_length = np.mean([len(w) for w in words]) if num_words>0 else 0.0
    uniq_word_ratio = (len(set(words))/num_words) if num_words>0 else 0.0
    fillers = count_fillers(cleaned)
    pronouns = count_pronouns(cleaned)
    stopwords = sum(1 for w in words if w in STOPWORDS)
    stopword_ratio = (stopwords/num_words) if num_words>0 else 0.0
    sentences = get_sentence_count(text)
    
    # NEW FEATURES - Phase 1 Improvements
    rep_ratio = repetition_ratio(text)
    speech_spd = speech_rate(text)
    articles = article_ratio(text)
    corrections = self_correction_count(text)
    
    # Additional dementia-specific features
    content_ratio = content_word_ratio(text)
    fillers_per_sent = filler_per_sentence(text)
    pronoun_ratio = pronoun_to_noun_ratio(text)
    
    return {
        "num_words": num_words,
        "avg_word_length": avg_word_length,
        "uniq_word_ratio": uniq_word_ratio,
        "filler_count": fillers,
        "pronoun_count": pronouns,
        "stopword_ratio": stopword_ratio,
        "sentences_count": sentences,
        "repetition_ratio": rep_ratio,
        "speech_rate": speech_spd,
        "article_ratio": articles,
        "self_correction_count": corrections,
        "content_word_ratio": content_ratio,
        "filler_per_sentence": fillers_per_sent,
        "pronoun_to_noun_ratio": pronoun_ratio,
    }

def main():
    if not os.path.exists(TRANSCRIPTS_CSV):
        raise FileNotFoundError("Run transcribr.py first to generate transcripts/transcripts.csv")
    df = pd.read_csv(TRANSCRIPTS_CSV, encoding="utf-8")
    df["transcript"] = df["transcript"].fillna("")
    feats = df["transcript"].apply(lambda t: pd.Series(compute_features_for_text(t)))
    out = pd.concat([df, feats], axis=1)
    out.to_csv(PROCESSED_CSV, index=False, encoding="utf-8")
    print("Saved processed CSV:", PROCESSED_CSV)
    print(out.head())

if __name__ == "__main__":
    main()
