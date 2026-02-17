# Sales Data Processor

A production-ready Python script that reads sales data from a CSV file, calculates total revenue per category, and generates a summary report.

## Features

- 📊 Reads sales data from CSV files with configurable paths
- 🔍 Validates input data structure and types
- 🛡️ Comprehensive error handling with informative messages
- 📝 Detailed logging for monitoring and debugging
- 🚀 Memory-efficient processing with validation before computation
- 📈 Generates category-wise summary with totals and record counts
- 🔧 Command-line interface for flexible usage

## Requirements

- Python 3.6 or higher
- pandas library (any recent version)

## Installation

1. Clone or download this repository
2. Install the required dependency:

```bash
pip install pandas
```

## Input File Format

The script expects a CSV file with the following columns:

| Column Name | Description | Data Type | Example |
|------------|-------------|-----------|---------|
| `quantity` | Number of items sold | Numeric | 5 |
| `price` | Price per item | Numeric | 19.99 |
| `category` | Product category | String | "Electronics" |

### Sample Input (`sales_2024.csv`):
```csv
quantity,price,category
5,19.99,Electronics
3,9.99,Books
2,499.99,Electronics
10,2.50,Office Supplies
```

## Usage

### Basic Usage

Process the default file (`sales_2024.csv`) and generate default output (`sales_summary.csv`):

```bash
python sales_processor.py
```

### Specify Input File

```bash
python sales_processor.py --input custom_sales_data.csv
```

### Specify Both Input and Output

```bash
python sales_processor.py --input /path/to/sales.csv --output /path/to/summary.csv
```

### Verbose Logging

```bash
python sales_processor.py --input sales.csv --verbose
```

### Full Command-Line Options

```bash
python sales_processor.py --help
```

Output:
```
usage: sales_processor.py [-h] [--input INPUT] [--output OUTPUT] [--verbose]

Process sales data from CSV and generate category summary

options:
  -h, --help            show this help message and exit
  --input INPUT         Input CSV file path (default: sales_2024.csv)
  --output OUTPUT       Output CSV file path (default: sales_summary.csv)
  --verbose, -v         Enable verbose logging

Examples:
  sales_processor.py
  sales_processor.py --input sales_2024.csv --output summary.csv
  sales_processor.py --input /path/to/sales.csv
```

## Output Format

The script generates a CSV file with the following columns:

| Column Name | Description | Example |
|------------|-------------|---------|
| `category` | Product category | "Electronics" |
| `total` | Sum of revenue for the category | 1039.97 |
| `record_count` | Number of transactions in category | 2 |

### Sample Output (`sales_summary.csv`):
```csv
category,total,record_count
Books,29.97,1
Electronics,1039.97,2
Office Supplies,25.00,1
```

## Logging Output

The script provides detailed logging to help monitor execution and troubleshoot issues:

```
2024-01-15 10:30:15 - INFO - Reading input file: sales_2024.csv
2024-01-15 10:30:15 - INFO - Read 5 records from input file
2024-01-15 10:30:15 - INFO - Successfully wrote summary to: sales_summary.csv
2024-01-15 10:30:15 - INFO - Processed 5 records successfully
2024-01-15 10:30:15 - INFO - Found 3 unique categories
```

## Error Handling

The script handles various error conditions gracefully:

- **Missing input file**: Logs error and exits with code 1
- **Invalid CSV format**: Logs parsing error and exits
- **Missing required columns**: Lists missing columns and exits
- **Non-numeric data in quantity/price**: Identifies problematic columns and exits
- **Empty file**: Detects and reports the issue
- **Permission issues**: Checks file accessibility before processing
- **Output directory doesn't exist**: Creates directory automatically

## Exit Codes

- `0`: Successful execution
- `1`: Error occurred during processing

## Integration with Other Tools

### As a Module

You can import and use the processing function in your own code:

```python
from sales_processor import process_sales_data

success = process_sales_data('input.csv', 'output.csv')
if success:
    print("Processing completed successfully")
```

### In Cron Jobs or Scheduled Tasks

```bash
# Daily sales report
0 2 * * * cd /path/to/script && python sales_processor.py --input /data/daily_sales.csv --output /reports/daily_summary.csv >> /var/log/sales_processor.log 2>&1
```

## Performance Considerations

- **Memory Usage**: The script loads the entire CSV into memory. For very large files (>1GB), consider splitting or using chunked processing.
- **File Size**: Typically handles files up to several hundred MB efficiently on standard hardware.
- **Validation Overhead**: Column validation adds minimal overhead compared to data processing.

## Troubleshooting

### "Input file not found"
- Verify the file path is correct
- Check if the file exists in the specified location
- Use absolute paths if running from different directories

### "Missing required columns"
- Ensure your CSV has headers exactly named: 'quantity', 'price', 'category'
- Check for case sensitivity or extra spaces in column names
- Verify the CSV delimiter is a comma

### "Column must contain numeric data"
- Check for non-numeric values in quantity or price columns
- Look for text, special characters, or empty strings
- Ensure numbers use period (.) as decimal separator

## License

This script is provided as-is for internal use. Modify and distribute as needed for your organization.

## Support

For issues or questions:
1. Check the error logs for specific error messages
2. Verify your input file format matches the requirements
3. Ensure pandas is properly installed
4. Run with `--verbose` flag for detailed debug information
