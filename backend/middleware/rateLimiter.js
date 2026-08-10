const { RateLimiterMemory } = require('rate-limiter-flexible');
const { getClientIp } = require('../utils/ip');

const rateLimiter = new RateLimiterMemory({
    points: 120,
    duration: 60
});

const rateLimiterStrict = new RateLimiterMemory({
    points: 8,
    duration: 60
});

const rateLimiterMiddleware = async(req, res, next) => {
    try {
        const userIp = getClientIp(req);
        await rateLimiter.consume(userIp);

        next();
    } catch(err) {
        res.status(429).json({ success: false, error: { type: 'error', message: 'You need to slow down, you have send to many request. Try again in a minute.' } });
    }
};

const rateLimiterStrictMiddleware = async(req, res, next) => {
    try {
        const userIp = getClientIp(req);
        await rateLimiterStrict.consume(userIp);

        next();
    } catch(err) {
        res.status(429).json({ success: false, error: { type: 'error', message: 'You need to slow down, you have send to many request. Try again in a minute.' } });
    }
};

module.exports = {
    rateLimiter,
    rateLimiterStrict,
    rateLimiterMiddleware,
    rateLimiterStrictMiddleware
}
