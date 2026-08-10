// controllers/drakonController.js
const axios = require('axios');
const Provider = require('../../database/models/Providers'); // Sağlayıcı modelini bağlayın
const Game = require('../../database/models/Game'); // Sağlayıcı modelini bağlayın
const User = require('../../database/models/User'); // Sağlayıcı modelini bağlayın
const { drakonAuthentication } = require('./authController'); // drakonAuthentication'ı authController'dan alıyoruz.

const apiUriDrakon = process.env.DRAKON_API_URL;

const agentCode = process.env.DRAKON_AGENT_CODE;
const agentToken = process.env.DRAKON_AGENT_TOKEN;

async function getDrakonProvider(req, res) {
    try {
        const token = await drakonAuthentication();
        if (!token) {
            return res.status(401).json({ status: 'error', message: 'Authentication failed' });
        }

        const response = await axios.get(`${apiUriDrakon}games/provider`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200 && response.data.status) {
            const providers = response.data.providers;
            for (const [index, provider] of providers.entries()) {
                if (provider.code && provider.name) {
                    const data = {
                        id: index + 1,  // Belgeye özel bir ID veriyoruz
                        code: provider.code,
                        name: provider.name,
                        rtp: provider.rtp || 95,
                        status: 1,
                        created_at: new Date(),
                        updated_at: new Date()
                    };

                    const providerExists = await Provider.findOne({ code: provider.code });
                    if (!providerExists) {
                        await Provider.create(data);
                        console.log(`Provider successfully saved: ${provider.name} (${provider.code})`);
                    } else {
                        console.log(`Provider already exists: ${provider.name} (${provider.code})`);
                    }
                }
            }
            return res.status(200).json({ status: 'success', message: 'Providers processed successfully' });
        } else {
            return res.status(500).json({ status: 'error', message: 'Failed to fetch providers' });
        }
    } catch (error) {
        console.error('Error fetching providers:', error.message);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}


async function fetchDrakonGames(req, res) {
    try {
        const token = await drakonAuthentication();
        if (!token) {
            return res.status(401).json({ status: 'error', message: 'Authentication failed' });
        }

        const response = await axios.get(`${apiUriDrakon}games/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200 && response.data.status) {
            const games = response.data.games;

            for (const [index, game] of games.entries()) {
                const gameData = {
                    id: index + 1,
                    provider_id: game.provider_id || 3,
                    game_server_url: game.game_server_url || null,
                    game_id: game.game_id,
                    game_name: game.game_name,
                    game_code: game.game_code,
                    game_type: game.game_type || null,
                    description: game.description || null,
                    cover: game.cover || null,
                    technology: 'html5',
                    has_lobby: game.has_lobby || 0,
                    is_mobile: game.is_mobile || 0,
                    has_freespins: game.has_freespins || 0,
                    has_tables: game.has_tables || 0,
                    only_demo: game.only_demo || 0,
                    distribution: 'drakon',
                    status: 1,
                    created_at: new Date(),
                    updated_at: new Date(),
                    lobby_id: game.lobby_id || null,
                    rtp: game.rtp || 90,
                    views: game.views || 0,
                    featured: game.featured || 0,
                    like: game.like || 0,
                    provider_game: game.provider_game || 'unknown',
                    banner: game.banner || null
                };

                // Oyun veritabanında mevcutsa güncelle, yoksa ekle
                await Game.updateOne(
                    { game_id: game.game_id }, // oyun ID'sine göre güncelleme yapıyoruz
                    { $set: gameData },
                    { upsert: true }
                );

                console.log(`Game processed: ${game.game_name} (${game.game_code})`);
            }

            return res.status(200).json({ status: 'success', message: 'Games processed and saved to database' });
        } else {
            return res.status(500).json({ status: 'error', message: 'Failed to fetch games' });
        }
    } catch (error) {
        console.error('Error fetching games:', error.message);

        if (error.response) {
            console.error('Error Response Data:', error.response.data);
            console.error('Error Response Status:', error.response.status);
            return res.status(error.response.status).json({
                status: 'error',
                message: error.response.data.message || 'Failed to fetch games'
            });
        }

        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}

async function getAccountDetails(req, res) {
    try {
        const { user_id } = req.body;

        const user = await User.findById(user_id);
        if (user) {
            return res.status(200).json({
                status: 'success',
                email: user.local.email,
                name: user.name,
                createdAt: user.createdAt
            });
        } else {
            return res.status(404).json({ status: 'error', message: 'Invalid user' });
        }
    } catch (error) {
        console.error('Error fetching account details:', error.message);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}

async function getUserBalance(req, res) {
    try {
        const { user_id } = req.body;

        // Kullanıcıyı user_id ile buluyoruz
        const user = await User.findById(user_id);

        if (user) {
            return res.status(200).json({ status: 'success', balance: user.balance });
        } else {
            return res.status(404).json({ status: 'error', message: 'Invalid user' });
        }
    } catch (error) {
        console.error('Error fetching user balance:', error.message);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}
async function launchGame(req, res) {
    try {
        const token = await drakonAuthentication();
        if (!token) {
            return res.status(401).json({ status: 'error', message: 'Authentication failed' });
        }

        const { game_id, user_id, session_id } = req.body;

        // Kullanıcıyı `user_id` ile buluyoruz
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        // API'ye oyun başlatma isteği gönder
        const response = await axios.get(`${apiUriDrakon}games/game_launch`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                agent_code: agentCode,
                agent_token: agentToken,
                game_id: game_id,
                type: 'CHARGED',
                currency: 'BRL',
                lang: 'pt_BR',
                user_id: user._id,
                user_name: user.username,
                session_id: session_id || `session-${Date.now()}`, // Varsayılan session_id ekleyin
            }
        });

        if (response.status === 200 && response.data.game_url) {
            return res.status(200).json({ status: 'success', game_url: response.data.game_url });
        } else {
            console.error('Drakon API Error:', response.data.message || 'Unknown error');
            return res.status(500).json({ status: 'error', message: 'Failed to launch game' });
        }
    } catch (error) {
        console.error('Error launching game:', error.message);

        if (error.response) {
            console.error('Error Response Data:', error.response.data);
            console.error('Error Response Status:', error.response.status);
            return res.status(error.response.status).json({
                status: 'error',
                message: error.response.data.message || 'Failed to launch game'
            });
        }

        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}


module.exports = { getDrakonProvider, fetchDrakonGames, launchGame, getUserBalance, getAccountDetails  };
