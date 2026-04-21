import os
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from preprocessing.fusion_pipeline import formulate_fusion_vector

# Dummy data generator for training example
def generate_mock_data(n_samples=100):
    X = []
    y = []
    for i in range(n_samples):
        # Mocking inputs representing completed sessions
        transcript_len_base = np.random.randint(10, 100)
        transcript = "word " * transcript_len_base
        
        emotion_data = {
            'dominant_emotions': ['neutral', 'sad'] if np.random.rand() > 0.5 else ['happy', 'neutral'],
            'confusion_index': np.random.rand(),
            'stability_score': np.random.rand()
        }
        
        game_scores = {
            "accuracy": np.random.rand(),
            "reaction_time": np.random.rand() * 2.0
        }
        
        # Formulate feature vector using pipeline
        features = formulate_fusion_vector(transcript, emotion_data, game_scores)
        X.append(features)
        
        # Mock label: 1 (Higher dementia risk) if accuracy < 0.5 and reaction_time > 1.0, else 0
        label = 1 if (game_scores["accuracy"] < 0.5 and game_scores["reaction_time"] > 1.0) else 0
        y.append(label)
        
    return np.array(X), np.array(y)

def train_model():
    print("Generating mock data from stored sessions...")
    X, y = generate_mock_data(n_samples=500)
    
    print(f"Dataset Shape: X={X.shape}, y={y.shape}")
    print("Training RandomForest Classifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    accuracy = model.score(X, y)
    print(f"Training Accuracy: {accuracy * 100:.2f}%")
    
    # Save the model
    os.makedirs('models', exist_ok=True)
    model_path = os.path.join('models', 'rf_dementia_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
        
    print(f"Model saved successfully to {model_path}")

if __name__ == "__main__":
    train_model()
