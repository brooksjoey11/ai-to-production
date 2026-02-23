import rateLimit from 'express-rate-limit';

// Create a rate limiter instance
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Apply the rate limiting middleware to all requests
export const applyRateLimit = (app) => {
    app.use(limiter);
};
