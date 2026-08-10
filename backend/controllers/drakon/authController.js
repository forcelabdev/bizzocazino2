// controllers/authController.js
const axios = require('axios');

const apiUriDrakon = process.env.DRAKON_API_URL;
const agentToken = process.env.DRAKON_AGENT_TOKEN;
const agentSecret = process.env.DRAKON_AGENT_SECRET;

async function drakonAuthentication() {
    try {
        const basicToken = Buffer.from(`${agentToken}:${agentSecret}`).toString('base64');
        
        const response = await axios.post(`${apiUriDrakon}auth/authentication`, {}, {
            headers: {
                Authorization: `Bearer ${basicToken}`,
            },
        });

        if (response.status === 200 && response.data.access_token) {
            return response.data.access_token;
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        console.error('Drakon Authentication Error:', error.message);
        return null;
    }
}

module.exports = { drakonAuthentication };
