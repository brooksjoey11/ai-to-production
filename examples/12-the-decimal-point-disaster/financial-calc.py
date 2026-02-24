#!/usr/bin/env python3
"""
Trading Calculator

This module provides functions to calculate trade values, profits, portfolio values,
and trading fees using precise decimal arithmetic. It is designed for educational
and prototyping purposes, not for production financial systems.

Usage:
    python ai-version.py [--holdings_file HOLDINGS_FILE]

If --holdings_file is provided, the portfolio is loaded from a JSON file with the
structure: {"symbol": [price, quantity]}. Otherwise, a default example portfolio is used.

Limitations:
    - All monetary values are represented as Decimal to avoid floating-point errors.
    - Input validation is performed; invalid inputs raise ValueError.
    - The fee percentage is hardcoded as a constant (can be changed in the source).
"""

import argparse
import json
import sys
from decimal import Decimal, InvalidOperation

# ----------------------------------------------------------------------
# Constants
# ----------------------------------------------------------------------
DEFAULT_FEE_PERCENT = Decimal('0.1')  # 0.1% trading fee

# ----------------------------------------------------------------------
# Default example portfolio (used if no file is provided)
# ----------------------------------------------------------------------
def default_holdings():
    """Return a dictionary of example holdings with Decimal values."""
    return {
        'AAPL': (Decimal('175.32'), Decimal('1000')),
        'GOOGL': (Decimal('140.50'), Decimal('500')),
        'TSLA': (Decimal('245.78'), Decimal('200'))
    }

# ----------------------------------------------------------------------
# Portfolio loader from JSON file
# ----------------------------------------------------------------------
def load_holdings_from_json(filepath):
    """
    Load holdings from a JSON file.

    Expected JSON format:
        {
            "symbol": [price, quantity],
            ...
        }
    Both price and quantity are converted to Decimal.

    Args:
        filepath (str): Path to the JSON file.

    Returns:
        dict: {symbol: (Decimal(price), Decimal(quantity))}

    Raises:
        FileNotFoundError: If the file does not exist.
        json.JSONDecodeError: If the file contains invalid JSON.
        ValueError: If the structure is invalid or values cannot be converted.
    """
    with open(filepath, 'r') as f:
        data = json.load(f)

    holdings = {}
    for symbol, values in data.items():
        if not isinstance(values, (list, tuple)) or len(values) != 2:
            raise ValueError(f"Entry for '{symbol}' must be a list/tuple of two numbers")
        try:
            price = Decimal(str(values[0]))
            quantity = Decimal(str(values[1]))
        except (InvalidOperation, TypeError) as e:
            raise ValueError(f"Invalid numeric value for '{symbol}': {e}")
        # Basic sanity check (optional)
        if quantity < 0:
            raise ValueError(f"Quantity for '{symbol}' cannot be negative")
        holdings[symbol] = (price, quantity)
    return holdings

# ----------------------------------------------------------------------
# Core calculation functions
# ----------------------------------------------------------------------
def calculate_trade_value(price, quantity):
    """
    Calculate total trade value.

    Args:
        price (str, int, float, Decimal): Price per unit.
        quantity (str, int, float, Decimal): Number of units.

    Returns:
        Decimal: price * quantity.

    Raises:
        ValueError: If inputs cannot be converted to Decimal.
    """
    try:
        p = Decimal(str(price))
        q = Decimal(str(quantity))
    except (InvalidOperation, TypeError) as e:
        raise ValueError(f"Invalid price or quantity: {e}")
    return p * q


def calculate_profit(buy_price, sell_price, quantity):
    """
    Calculate profit from a trade.

    Args:
        buy_price (str, int, float, Decimal): Purchase price per unit.
        sell_price (str, int, float, Decimal): Selling price per unit.
        quantity (str, int, float, Decimal): Number of units.

    Returns:
        Decimal: (sell_price - buy_price) * quantity.

    Raises:
        ValueError: If inputs cannot be converted to Decimal.
    """
    try:
        bp = Decimal(str(buy_price))
        sp = Decimal(str(sell_price))
        q = Decimal(str(quantity))
    except (InvalidOperation, TypeError) as e:
        raise ValueError(f"Invalid price or quantity: {e}")
    return (sp - bp) * q


def calculate_portfolio_value(holdings):
    """
    Calculate total portfolio value.

    Args:
        holdings (dict): Dictionary mapping symbol to (price, quantity) tuple.
                         Both price and quantity must be convertible to Decimal.

    Returns:
        Decimal: Sum of price * quantity over all holdings.

    Raises:
        ValueError: If holdings structure is invalid or values cannot be converted.
    """
    total = Decimal('0')
    for symbol, (price, quantity) in holdings.items():
        try:
            p = Decimal(str(price))
            q = Decimal(str(quantity))
        except (InvalidOperation, TypeError) as e:
            raise ValueError(f"Invalid value for {symbol}: {e}")
        if q < 0:
            raise ValueError(f"Quantity for {symbol} cannot be negative")
        total += p * q
    return total


def calculate_fee(amount, fee_percent):
    """
    Calculate trading fee.

    Args:
        amount (str, int, float, Decimal): Monetary amount to apply fee to.
        fee_percent (str, int, float, Decimal): Fee percentage (e.g., 0.1 for 0.1%).

    Returns:
        Decimal: amount * (fee_percent / 100).

    Raises:
        ValueError: If inputs cannot be converted to Decimal or fee_percent is negative.
    """
    try:
        amt = Decimal(str(amount))
        fp = Decimal(str(fee_percent))
    except (InvalidOperation, TypeError) as e:
        raise ValueError(f"Invalid amount or fee percent: {e}")
    if fp < 0:
        raise ValueError("Fee percent cannot be negative")
    return amt * (fp / Decimal('100'))


# ----------------------------------------------------------------------
# Command-line interface
# ----------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Trading portfolio calculator.")
    parser.add_argument('--holdings_file', '-f', type=str,
                        help='JSON file containing holdings (default: use built-in example)')
    args = parser.parse_args()

    # Load holdings
    if args.holdings_file:
        try:
            holdings = load_holdings_from_json(args.holdings_file)
        except (FileNotFoundError, json.JSONDecodeError, ValueError) as e:
            print(f"Error loading holdings file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        holdings = default_holdings()
        print("Using default example holdings. Provide --holdings_file to load custom data.")

    # Perform calculations
    try:
        portfolio = calculate_portfolio_value(holdings)
        fee = calculate_fee(portfolio, DEFAULT_FEE_PERCENT)
        net = portfolio - fee
    except ValueError as e:
        print(f"Calculation error: {e}", file=sys.stderr)
        sys.exit(1)

    # Output results
    print(f"Portfolio value: ${portfolio:.2f}")
    print(f"Trading fee (at {DEFAULT_FEE_PERCENT}%): ${fee:.2f}")
    print(f"Net after fee: ${net:.2f}")


if __name__ == "__main__":
    main()