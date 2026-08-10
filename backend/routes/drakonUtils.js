const axios = require('axios');

// Drakon API Kimlik Bilgileri
const DRAKON_BASE_URL = process.env.DRAKON_API_URL;
const AGENT_TOKEN = process.env.DRAKON_AGENT_TOKEN;
const AGENT_SECRET_KEY = process.env.DRAKON_AGENT_SECRET;
const AGENT_CODE = process.env.DRAKON_AGENT_CODE;

let drakonAccessToken = null; // Token burada saklanacak

// Base64 ile kimlik doğrulama token oluşturma
const generateAuthToken = () => {
    return Buffer.from(`${AGENT_TOKEN}:${AGENT_SECRET_KEY}`).toString('base64');
};

// Drakon Kimlik Doğrulama İşlemi
const authenticateDrakon = async () => {
    const token = generateAuthToken();
    try {
        const response = await axios.post(`${DRAKON_BASE_URL}/auth/authentication`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data && response.data.access_token) {
            drakonAccessToken = response.data.access_token;
            return drakonAccessToken;
        } else {
            throw new Error('Authentication failed. No access_token received.');
        }
    } catch (error) {
        throw error;
    }
};

// Middleware: Token Kontrolü ve Yenileme
const ensureDrakonToken = async () => {
    if (!drakonAccessToken) {
        await authenticateDrakon();
    }
    return drakonAccessToken;
};

module.exports = {
    DRAKON_BASE_URL,
    AGENT_TOKEN,
    AGENT_SECRET_KEY,
    AGENT_CODE,
    ensureDrakonToken,
};
