# AI-generated trading calculator
# WARNING: Uses floating point for money!

def calculate_trade_value(price, quantity):
    """Calculate total trade value."""
    return price * quantity

def calculate_profit(buy_price, sell_price, quantity):
    """Calculate profit from a trade."""
    return (sell_price - buy_price) * quantity

def calculate_portfolio_value(holdings):
    """Calculate total portfolio value."""
    total = 0
    for symbol, (price, quantity) in holdings.items():
        total += price * quantity
    return total

def calculate_fee(amount, fee_percent):
    """Calculate trading fee."""
    return amount * (fee_percent / 100)

# Example usage
holdings = {
    'AAPL': (175.32, 1000),      # $175.32 * 1000 = $175,320
    'GOOGL': (140.50, 500),       # $140.50 * 500 = $70,250
    'TSLA': (245.78, 200)         # $245.78 * 200 = $49,156
}

portfolio = calculate_portfolio_value(holdings)
fee = calculate_fee(portfolio, 0.1)  # 0.1% fee

print(f"Portfolio value: ${portfolio}")
print(f"Trading fee: ${fee}")
print(f"Net after fee: ${portfolio - fee}")

# Real trades happen here...