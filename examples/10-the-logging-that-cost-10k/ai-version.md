import logging
import sys
import json
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,  # Everything!
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def process_order(order):
    """Process an order with detailed logging."""
    logger.debug(f"Starting order processing: {order['id']}")
    
    # Log every step
    logger.debug(f"Validating order {order['id']}")
    if validate_order(order):
        logger.debug(f"Order {order['id']} validated")
        
        logger.debug(f"Calculating total for {order['id']}")
        total = calculate_total(order)
        logger.debug(f"Total for {order['id']}: {total}")
        
        logger.debug(f"Updating inventory for {order['id']}")
        update_inventory(order)
        
        logger.debug(f"Charging customer for {order['id']}")
        charge_customer(order, total)
        
        logger.debug(f"Sending email for {order['id']}")
        send_confirmation(order)
        
        logger.info(f"Order {order['id']} completed")
    else:
        logger.warning(f"Order {order['id']} validation failed")
    
    logger.debug(f"Finished order processing: {order['id']}")

# Process millions of orders
for order in get_all_orders():  # 10M orders
    process_order(order)
    logger.debug(f"Processed {order['id']}, continuing...")