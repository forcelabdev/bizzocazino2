const axios = require('axios');
const Provider = require('../database/models/Providers'); // Sağlayıcı modeli
const Game = require('../database/models/Game'); // Oyun modeli
const User = require('../database/models/User'); // Kullanıcı modeli

const agentCode = 'rivobit_brl';
const agentToken = 'dc17594b2357db085b80df91fe08ca5c';
const apiEndpoint = 'https://api.telo.to/api/v2';

// Sağlayıcıları API’den getir ve MongoDB’ye kaydet
async function getProviderWorldSlot(gameType) {
    try {
        const response = await axios.post(`${apiEndpoint}/provider_list`, {
            agent_code: agentCode,
            agent_token: agentToken,
            game_type: gameType || 'slot'
        });

        if (response.data.status === 1) {
            const providers = response.data.providers;

            for (const provider of providers) {
                let existingProvider = await Provider.findOne({ code: provider.code, distribution: 'worldslot' });
                if (!existingProvider) {
                    await Provider.create({
                        code: provider.code,
                        name: provider.name,
                        rtp: 90,
                        status: 1,
                        distribution: 'worldslot'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error fetching providers:', error.message);
    }
}

// Sağlayıcıya göre oyunları getir ve MongoDB’ye kaydet
async function getGamesWorldSlot() {
    try {
        const providers = await Provider.find({ distribution: 'worldslot' });

        for (const provider of providers) {
            const response = await axios.post(`${apiEndpoint}/game_list`, {
                agent_code: agentCode,
                agent_token: agentToken,
                provider_code: provider.code
            });

            if (response.data.status === 1) {
                const games = response.data.games;

                for (const game of games) {
                    let existingGame = await Game.findOne({ provider_id: provider._id, game_code: game.game_code });

                    if (!existingGame) {
                        await Game.create({
                            provider_id: provider._id,
                            game_code: game.game_code,
                            game_name: game.game_name,
                            technology: 'html5',
                            distribution: 'worldslot',
                            rtp: 90,
                            cover: game.banner || null,
                            status: game.status,
                            like: 0,
                            views: 0,
                            featured: false
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error fetching games:', error.message);
    }
}

// Kullanıcı bakiyesini getir
async function getWorldSlotBalance() {
    try {
        const response = await axios.post(`${apiEndpoint}/info`, {
            agent_code: agentCode,
            agent_token: agentToken
        });

        if (response.data.status === 1) {
            return response.data.agent_balance || 0;
        } else {
            return 0;
        }
    } catch (error) {
        console.error('Error fetching balance:', error.message);
        return 0;
    }
}

// Oyun başlatma işlemi
async function GameLaunchWorldSlot(providerCode, gameCode, lang, username) {
    try {
        const user = await User.findOne({ username: username });

        if (!user) {
            throw new Error('User not found');
        }

        // Kullanıcı bakiyesini açıkça tam sayı olarak tanımlayın
        const userBalance = parseInt(user.balance, 10);
        
        console.log(`Launching game for user: ${username}, Balance: ${userBalance}`);

        const response = await axios.post(`${apiEndpoint}/game_launch`, {
            agent_code: agentCode,
            agent_token: agentToken,
            user_code: username,
            provider_code: providerCode,
            game_code: gameCode,
            user_balance: '100', // Açıkça bir tam sayı olarak gönderiliyor
            game_type: 'slot',
            lang: 'tr'
        });

        console.log('Response Data:', response.data);

        if (response.data.status === 1) {
            return response.data;
        } else if (response.data.msg === 'Invalid User') {
            await createUserWorldSlot(username); // Yeni kullanıcı oluştur
            return GameLaunchWorldSlot(providerCode, gameCode, lang, username); // Tekrar başlat
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error launching game:', error.message);
        return null;
    }
}



// Yeni kullanıcı oluşturma
async function createUserWorldSlot(username) {
    try {
        const response = await axios.post(`${apiEndpoint}`, {
            method: 'user_create',
            agent_code: agentCode,
            agent_token: agentToken,
            user_code: username
        });

        return response.data.status === 1;
    } catch (error) {
        console.error('Error creating user:', error.message);
        return false;
    }
}

// Agent ve Kullanıcı Bilgilerini Getir
async function getAgentAndUserInfo(username) {
    try {
        const requestData = {
            agent_code: agentCode,
            agent_token: agentToken
        };

        // Eğer username varsa isteğe ekleyin
        if (username) {
            requestData.user_code = username;
        }

        const response = await axios.post(`${apiEndpoint}/info`, requestData);

        if (response.data.status === 1) {
            return response.data;
        } else {
            throw new Error(response.data.msg || 'Failed to fetch agent and user information');
        }
    } catch (error) {
        console.error('Error fetching agent and user information:', error.message);
        throw error;
    }
}

// İşlevi diğer modüllere açmak için exports'a ekleyin
module.exports = {
    getProviderWorldSlot,
    getGamesWorldSlot,
    getWorldSlotBalance,
    GameLaunchWorldSlot,
    createUserWorldSlot,
    getAgentAndUserInfo
};

