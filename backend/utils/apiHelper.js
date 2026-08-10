const axios = require('axios');
const crypto = require('crypto');

const apiEndpoint = process.env.API_ENDPOINT;
const agentToken = process.env.AGENT_TOKEN;
const agentSecret = process.env.AGENT_SECRET;

function generateSignature(payload) {
    return crypto.createHmac('sha256', agentSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
}

async function launchGame(userCode, providerCode, gameCode, lang = 'en') {
    const payload = {
        method: 'game_launch',
        agent_code: process.env.AGENT_CODE,
        agent_token: agentToken,
        user_code: userCode,
        provider_code: providerCode,
        game_code: gameCode,
        lang: lang
    };

    payload.signature = generateSignature(payload);

    try {
        const response = await axios.post(`${apiEndpoint}`, payload);
        return response.data.launch_url;
    } catch (error) {
        console.error('Error launching game:', error);
        throw error;
    }
}

async function getAgentBalance() {
    const payload = {
        method: 'money_info',
        agent_code: process.env.AGENT_CODE,
        agent_token: agentToken
    };

    payload.signature = generateSignature(payload);

    try {
        const response = await axios.post(`${apiEndpoint}`, payload);
        return response.data.agent.balance;
    } catch (error) {
        console.error('Error fetching agent balance:', error);
        throw error;
    }
}

module.exports = {
    launchGame,
    getAgentBalance
};
