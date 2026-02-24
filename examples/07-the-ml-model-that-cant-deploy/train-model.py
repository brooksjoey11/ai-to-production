#!/usr/bin/env python3
"""
Train a Random Forest classifier on a CSV file with configurable parameters.
"""

import argparse
import logging
import os
import sys
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split


def setup_logging(log_file: str, verbose: bool) -> None:
    """Configure logging to file and console."""
    log_format = "%(asctime)s - %(levelname)s - %(message)s"
    handlers = [logging.FileHandler(log_file)]
    if verbose:
        handlers.append(logging.StreamHandler(sys.stdout))
    logging.basicConfig(level=logging.INFO, format=log_format, handlers=handlers)


def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Train a Random Forest classifier on a CSV file."
    )
    parser.add_argument(
        "--input",
        type=str,
        default="training_data.csv",
        help="Path to input CSV file (default: training_data.csv)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="model.pkl",
        help="Path to save the trained model (default: model.pkl)",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Fraction of data to use as test set (default: 0.2)",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--n-estimators",
        type=int,
        default=100,
        help="Number of trees in the forest (default: 100)",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=10,
        help="Maximum depth of each tree (default: 10)",
    )
    parser.add_argument(
        "--min-samples-split",
        type=int,
        default=2,
        help="Minimum samples required to split a node (default: 2)",
    )
    parser.add_argument(
        "--n-jobs",
        type=int,
        default=-1,
        help="Number of parallel jobs (-1 uses all cores) (default: -1)",
    )
    parser.add_argument(
        "--log-file",
        type=str,
        default="training.log",
        help="Path to log file (default: training.log)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print logs to console in addition to log file",
    )
    return parser.parse_args()


def check_file_exists(filepath: str) -> None:
    """Raise FileNotFoundError if file does not exist."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Input file not found: {filepath}")


def check_output_writable(filepath: str) -> None:
    """Check if the output directory is writable."""
    output_dir = os.path.dirname(filepath) or "."
    if not os.access(output_dir, os.W_OK):
        raise PermissionError(f"Output directory is not writable: {output_dir}")


def validate_data(df: pd.DataFrame, target_col: str) -> tuple[pd.DataFrame, pd.Series]:
    """
    Validate and separate features and target.
    Raises ValueError for missing column, empty data, missing values, or non-numeric features.
    """
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in CSV.")

    X = df.drop(columns=[target_col])
    y = df[target_col]

    if X.empty:
        raise ValueError("Feature matrix is empty after dropping target column.")

    # Check for missing values
    if X.isnull().any().any():
        missing_cols = X.columns[X.isnull().any()].tolist()
        raise ValueError(f"Missing values found in columns: {missing_cols}")

    # Check that all features are numeric
    non_numeric = X.select_dtypes(exclude=[np.number]).columns.tolist()
    if non_numeric:
        raise ValueError(
            f"Non-numeric feature columns found: {non_numeric}. "
            "Please encode categorical variables before training."
        )

    # Ensure dataset has enough samples
    if len(X) < 10:
        raise ValueError(
            f"Dataset too small: {len(X)} samples. At least 10 required."
        )

    return X, y


def main():
    args = parse_arguments()
    setup_logging(args.log_file, args.verbose)

    logging.info("Starting Random Forest training script")
    logging.info(f"Arguments: {args}")

    try:
        # --- Input validation ---
        check_file_exists(args.input)
        check_output_writable(args.output)

        # --- Load data ---
        logging.info(f"Loading data from {args.input}")
        data = pd.read_csv(args.input)
        logging.info(f"Data loaded: {data.shape[0]} rows, {data.shape[1]} columns")

        # --- Separate features and target ---
        X, y = validate_data(data, "target")
        logging.info(f"Features shape: {X.shape}, target shape: {y.shape}")

        # --- Train/test split ---
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=args.test_size, random_state=args.random_state
        )
        logging.info(
            f"Split: training={len(X_train)} samples, test={len(X_test)} samples"
        )

        # --- Model training ---
        logging.info("Training Random Forest model...")
        model = RandomForestClassifier(
            n_estimators=args.n_estimators,
            max_depth=args.max_depth,
            min_samples_split=args.min_samples_split,
            n_jobs=args.n_jobs,
            random_state=args.random_state,
        )
        model.fit(X_train, y_train)
        logging.info("Training completed")

        # --- Evaluation ---
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average="weighted"
        )

        logging.info(f"Accuracy: {accuracy:.4f}")
        logging.info(f"Precision (weighted): {precision:.4f}")
        logging.info(f"Recall (weighted): {recall:.4f}")
        logging.info(f"F1-score (weighted): {f1:.4f}")

        # Detailed classification report
        report = classification_report(y_test, y_pred)
        logging.info(f"Classification report:\n{report}")

        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        logging.info(f"Confusion matrix:\n{cm}")

        # --- Save model ---
        logging.info(f"Saving model to {args.output}")
        joblib.dump(model, args.output)
        logging.info("Model saved successfully")

    except FileNotFoundError as e:
        logging.error(f"File error: {e}")
        sys.exit(1)
    except PermissionError as e:
        logging.error(f"Permission error: {e}")
        sys.exit(1)
    except pd.errors.EmptyDataError:
        logging.error("Input CSV file is empty.")
        sys.exit(1)
    except pd.errors.ParserError as e:
        logging.error(f"CSV parsing error: {e}")
        sys.exit(1)
    except ValueError as e:
        logging.error(f"Data validation error: {e}")
        sys.exit(1)
    except Exception as e:
        logging.exception(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()