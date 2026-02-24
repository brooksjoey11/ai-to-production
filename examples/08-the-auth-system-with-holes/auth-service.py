#!/usr/bin/env python3
"""
Train a Random Forest classifier on a CSV dataset.
Usage: python script.py [--input INPUT] [--output OUTPUT] [--test-size TEST_SIZE]
       [--random-state RANDOM_STATE] [--n-estimators N_ESTIMATORS]
       [--max-depth MAX_DEPTH] [--min-samples-split MIN_SAMPLES_SPLIT]
       [--n-jobs N_JOBS] [--log-level LOG_LEVEL]
"""

import argparse
import logging
import os
import sys

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score


def setup_logging(level):
    """Configure logging to console."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def main():
    parser = argparse.ArgumentParser(description="Train a Random Forest model.")
    parser.add_argument("--input", default="training_data.csv",
                        help="Path to input CSV file (default: training_data.csv)")
    parser.add_argument("--output", default="model.pkl",
                        help="Path to save the trained model (default: model.pkl)")
    parser.add_argument("--test-size", type=float, default=0.2,
                        help="Fraction of data to use as test set (default: 0.2)")
    parser.add_argument("--random-state", type=int, default=42,
                        help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--n-estimators", type=int, default=1000,
                        help="Number of trees in the forest (default: 1000)")
    parser.add_argument("--max-depth", type=int, default=50,
                        help="Maximum depth of each tree (default: 50)")
    parser.add_argument("--min-samples-split", type=int, default=2,
                        help="Minimum samples required to split a node (default: 2)")
    parser.add_argument("--n-jobs", type=int, default=-1,
                        help="Number of parallel jobs (-1 uses all cores, default: -1)")
    parser.add_argument("--log-level", default="INFO",
                        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
                        help="Set the logging level (default: INFO)")
    args = parser.parse_args()

    setup_logging(args.log_level)

    # -------------------------------------------------------------------------
    # Data loading with validation
    # -------------------------------------------------------------------------
    logging.info("Loading data from %s", args.input)
    if not os.path.isfile(args.input):
        logging.error("Input file '%s' does not exist.", args.input)
        sys.exit(1)

    try:
        data = pd.read_csv(args.input)
    except Exception as e:
        logging.error("Failed to read CSV: %s", e)
        sys.exit(1)

    if 'target' not in data.columns:
        logging.error("CSV file must contain a column named 'target'.")
        sys.exit(1)

    # Check for missing values
    if data.isnull().any().any():
        logging.error("Data contains missing values. Please clean the data before training.")
        sys.exit(1)

    # Ensure at least some data
    if len(data) < 2:
        logging.error("Not enough samples (need at least 2).")
        sys.exit(1)

    # Check that test split will produce at least one sample
    min_test_samples = int(len(data) * args.test_size)
    if min_test_samples < 1:
        logging.error("Test size %.2f yields zero test samples. Increase test size or provide more data.",
                      args.test_size)
        sys.exit(1)

    X = data.drop('target', axis=1)
    y = data['target']

    # -------------------------------------------------------------------------
    # Train / test split
    # -------------------------------------------------------------------------
    logging.info("Splitting data (test_size=%.2f, random_state=%d)",
                 args.test_size, args.random_state)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=args.random_state
    )

    # -------------------------------------------------------------------------
    # Model training
    # -------------------------------------------------------------------------
    logging.info("Training Random Forest with %d trees, max_depth=%d, min_samples_split=%d, n_jobs=%d",
                 args.n_estimators, args.max_depth, args.min_samples_split, args.n_jobs)
    model = RandomForestClassifier(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        min_samples_split=args.min_samples_split,
        n_jobs=args.n_jobs,
        random_state=args.random_state
    )

    try:
        model.fit(X_train, y_train)
    except Exception as e:
        logging.error("Training failed: %s", e)
        sys.exit(1)

    # -------------------------------------------------------------------------
    # Evaluation
    # -------------------------------------------------------------------------
    logging.info("Evaluating model on test set")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    logging.info("Accuracy: %.4f", accuracy)

    # Additional metrics
    report = classification_report(y_test, y_pred, zero_division=0)
    logging.info("Classification report:\n%s", report)

    # -------------------------------------------------------------------------
    # Save model
    # -------------------------------------------------------------------------
    logging.info("Saving model to %s", args.output)
    try:
        joblib.dump(model, args.output)
    except Exception as e:
        logging.error("Failed to save model: %s", e)
        sys.exit(1)

    logging.info("Model saved successfully.")


if __name__ == "__main__":
    main()