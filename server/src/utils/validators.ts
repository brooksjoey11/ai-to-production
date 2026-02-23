import { z } from 'zod';

// Example validation schemas

// User schema
export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

// Product schema
export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().positive(),
});

// Order schema
export const orderSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  products: z.array(productSchema),
});
