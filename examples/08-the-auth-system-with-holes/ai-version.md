import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib

# Load data
print("Loading data...")
data = pd.read_csv('training_data.csv')
X = data.drop('target', axis=1)
y = data['target']

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
print("Training model...")
model = RandomForestClassifier(
    n_estimators=1000,
    max_depth=50,
    min_samples_split=2,
    n_jobs=-1
)
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f"Accuracy: {accuracy:.4f}")

# Save model
joblib.dump(model, 'model.pkl')
print("Model saved as model.pkl")