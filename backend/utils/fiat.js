const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 }); // 60 saniye cache süresi

/**
 * Seçilen fiatCurrency için dönüşüm oranını getirir.
 * Örneğin: getRateFromCacheOrAPI('TRY') => 30.5 (1 BTC = 30.5 TRY)
 */
async function getRateFromCacheOrAPI(fiatCurrency = 'USD') {
    fiatCurrency = fiatCurrency.toUpperCase();

    const cacheKey = `fiatRate:${fiatCurrency}`;
    const cachedRate = cache.get(cacheKey);

    if (cachedRate) {
        return cachedRate;
    }

    try {
        // 🔁 Burayı kendi API servisinin endpointi ile değiştir
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
            params: {
                ids: 'bitcoin',
                vs_currencies: fiatCurrency
            }
        });

        const rate = response.data?.bitcoin?.[fiatCurrency.toLowerCase()];

        if (typeof rate !== 'number') {
            throw new Error(`Invalid rate for ${fiatCurrency}`);
        }

        cache.set(cacheKey, rate);
        return rate;
    } catch (error) {
        console.error(`Failed to fetch fiat rate for ${fiatCurrency}:`, error.message);
        throw new Error('Unable to retrieve fiat exchange rate.');
    }
}

module.exports = {
    getRateFromCacheOrAPI
};
