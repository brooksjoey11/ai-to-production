#!/usr/bin/env python3
"""
Sales Data Processor - Production Version
Processes sales CSV files and generates category summaries.

Usage:
    python sales_processor.py [--input FILE] [--output FILE]

Examples:
    python sales_processor.py
    python sales_processor.py --input sales_2024.csv --output summary.csv
    python sales_processor.py --input large_file.csv --chunksize 10000

Requirements:
    pandas >= 1.3.0
    Python >= 3.8
"""

import argparse
import os
import sys
import logging
from typing import Optional, Tuple

import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Required columns for validation
REQUIRED_COLUMNS = ['category', 'quantity', 'price']
NUMERIC_COLUMNS = ['quantity', 'price']


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments with defaults."""
    parser = argparse.ArgumentParser(
        description='Process sales data from CSV and generate category summary.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        '--input',
        default='sales_2024.csv',
        help='Input CSV file path (default: sales_2024.csv)'
    )
    parser.add_argument(
        '--output',
        default='sales_summary.csv',
        help='Output CSV file path (default: sales_summary.csv)'
    )
    parser.add_argument(
        '--chunksize',
        type=int,
        default=None,
        help='Process file in chunks of N rows (recommended for large files)'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable detailed logging'
    )
    return parser.parse_args()


def validate_file_exists(filepath: str) -> None:
    """Check if input file exists and is readable."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Input file not found: {filepath}")
    if not os.access(filepath, os.R_OK):
        raise PermissionError(f"Cannot read input file: {filepath} (permission denied)")


def validate_output_directory(filepath: str) -> None:
    """Ensure output directory exists and is writable."""
    directory = os.path.dirname(filepath) or '.'
    if not os.path.exists(directory):
        try:
            os.makedirs(directory)
        except OSError as e:
            raise PermissionError(f"Cannot create output directory {directory}: {e}")
    if not os.access(directory, os.W_OK):
        raise PermissionError(f"Cannot write to output directory: {directory}")


def validate_dataframe_columns(df: pd.DataFrame) -> None:
    """Verify required columns exist in dataframe."""
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")


def convert_to_numeric(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """
    Safely convert quantity and price to numeric.
    Returns (cleaned_df, rows_dropped_count)
    """
    df_clean = df.copy()
    initial_rows = len(df_clean)
    
    for col in NUMERIC_COLUMNS:
        if col in df_clean.columns:
            # Convert to numeric, coercing errors to NaN
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
    
    # Drop rows with NaN in numeric columns
    rows_before = len(df_clean)
    df_clean = df_clean.dropna(subset=NUMERIC_COLUMNS)
    rows_dropped_numeric = rows_before - len(df_clean)
    
    # Drop rows with NaN in category (if any)
    df_clean = df_clean.dropna(subset=['category'])
    rows_dropped_category = rows_before - rows_dropped_numeric - len(df_clean)
    
    total_dropped = initial_rows - len(df_clean)
    if total_dropped > 0:
        logger.warning(
            f"Dropped {total_dropped} rows: "
            f"{rows_dropped_numeric} with invalid numeric values, "
            f"{rows_dropped_category} with missing category"
        )
    
    return df_clean, total_dropped


def process_chunked(filepath: str, chunksize: int) -> pd.DataFrame:
    """
    Process large CSV file in chunks to avoid memory issues.
    Returns aggregated results from all chunks.
    """
    logger.info(f"Processing file in chunks of {chunksize} rows")
    
    # Initialize aggregators
    total_by_category = {}
    count_by_category = {}
    
    chunk_iter = pd.read_csv(
        filepath,
        chunksize=chunksize,
        dtype={'category': str},
        keep_default_na=False
    )
    
    chunk_num = 0
    for chunk in chunk_iter:
        chunk_num += 1
        logger.debug(f"Processing chunk {chunk_num}")
        
        try:
            # Validate columns
            validate_dataframe_columns(chunk)
            
            # Convert to numeric
            chunk_clean, dropped = convert_to_numeric(chunk)
            
            if len(chunk_clean) == 0:
                logger.warning(f"Chunk {chunk_num} had no valid rows after cleaning")
                continue
            
            # Calculate totals for this chunk
            chunk_clean['total'] = chunk_clean['quantity'] * chunk_clean['price']
            
            # Aggregate chunk results
            chunk_summary = chunk_clean.groupby('category').agg({
                'total': 'sum',
                'quantity': 'count'
            }).reset_index()
            
            # Merge into overall totals
            for _, row in chunk_summary.iterrows():
                cat = row['category']
                total_by_category[cat] = total_by_category.get(cat, 0) + row['total']
                count_by_category[cat] = count_by_category.get(cat, 0) + row['quantity']
                
        except Exception as e:
            logger.error(f"Error processing chunk {chunk_num}: {e}")
            raise
    
    # Build final dataframe from accumulated results
    categories = list(total_by_category.keys())
    results = pd.DataFrame({
        'category': categories,
        'total': [total_by_category[cat] for cat in categories],
        'quantity': [count_by_category[cat] for cat in categories]
    })
    
    logger.info(f"Processed {chunk_num} chunks")
    return results


def process_sales_data(input_file: str, output_file: str, chunksize: Optional[int] = None) -> int:
    """
    Core processing function with comprehensive error handling.
    Returns number of processed records.
    """
    logger.info(f"Starting sales data processing: {input_file} -> {output_file}")
    
    # Validate file existence
    validate_file_exists(input_file)
    
    # Validate output directory
    validate_output_directory(output_file)
    
    # Process based on file size strategy
    if chunksize:
        # Chunked processing for large files
        results = process_chunked(input_file, chunksize)
        processed_count = results['quantity'].sum() if not results.empty else 0
    else:
        # Standard processing for smaller files
        try:
            # Read with explicit dtypes to avoid warnings
            df = pd.read_csv(
                input_file,
                dtype={'category': str},
                keep_default_na=False
            )
            
            # Validate required columns exist
            validate_dataframe_columns(df)
            
            # Convert numeric columns safely
            df_clean, dropped_count = convert_to_numeric(df)
            
            if len(df_clean) == 0:
                raise ValueError("No valid rows remaining after data cleaning")
            
            # Calculate totals
            df_clean['total'] = df_clean['quantity'] * df_clean['price']
            
            # Aggregate by category
            results = df_clean.groupby('category', as_index=False).agg({
                'total': 'sum',
                'quantity': 'count'
            })
            
            processed_count = len(df_clean)
            
        except pd.errors.EmptyDataError:
            raise ValueError(f"Input file is empty: {input_file}")
        except pd.errors.ParserError as e:
            raise ValueError(f"CSV parsing error in {input_file}: {e}")
    
    # Sort results for consistency
    results = results.sort_values('category').reset_index(drop=True)
    
    # Write output
    try:
        results.to_csv(output_file, index=False)
        logger.info(f"Successfully wrote {len(results)} categories to {output_file}")
    except OSError as e:
        raise OSError(f"Failed to write output file {output_file}: {e}")
    
    return processed_count


def main() -> int:
    """Main entry point with error handling and user feedback."""
    args = parse_arguments()
    
    # Set logging level
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    try:
        # Execute core processing
        record_count = process_sales_data(
            args.input,
            args.output,
            args.chunksize
        )
        
        # Success message
        print(f"✓ Successfully processed {record_count} records")
        print(f"✓ Summary saved to: {args.output}")
        return 0
        
    except FileNotFoundError as e:
        logger.error(f"File error: {e}")
        print(f"\n❌ ERROR: {e}", file=sys.stderr)
        print("Please check that the input file exists and try again.", file=sys.stderr)
        return 1
        
    except PermissionError as e:
        logger.error(f"Permission error: {e}")
        print(f"\n❌ ERROR: {e}", file=sys.stderr)
        print("Please check file/directory permissions.", file=sys.stderr)
        return 1
        
    except ValueError as e:
        logger.error(f"Data validation error: {e}")
        print(f"\n❌ ERROR: {e}", file=sys.stderr)
        print("Please check the CSV format and data quality.", file=sys.stderr)
        return 1
        
    except MemoryError:
        logger.error("Out of memory error")
        print("\n❌ ERROR: File too large to process in memory", file=sys.stderr)
        print("Try using --chunksize N to process in smaller batches.", file=sys.stderr)
        return 1
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        print(f"\n❌ Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
```

```text
# requirements.txt
pandas>=1.3.0
```

```text
# .env.example (if using environment variables for configuration)
# No environment variables required for basic operation
# Input/output paths are set via command line arguments
```

Changes Made:

Finding Implementation
P0: Missing file existence check validate_file_exists() with clear error
P0: Missing column validation validate_dataframe_columns() checks required cols
P0: No error handling Comprehensive try/except with specific error types
P1: Memory risk for large files Chunked processing with --chunksize option
P2: Hardcoded paths Command-line arguments with defaults
P3: Silent data loss Logging warns about dropped rows
No dependency spec requirements.txt added
No version constraints Python 3.8+ required, pandas>=1.3.0
No validation for numeric data convert_to_numeric() with coercion
No user guidance Help text, examples, clear error messages
Crashes on malformed CSV Try/catch with specific error types
No logging Full logging implementation
No permission checks Validate output directory writable
No empty file handling Check for EmptyDataError
