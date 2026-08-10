const mongoose = require("mongoose");
const express = require('express');
const router = express.Router();

// MongoDB Modelleri
const Transaction = require("../../database/models/Transaction");
const User = require("../../database/models/User");
const Game = require("../../database/models/Game");

// Recent Big Wins API
router.get("/recent-big-wins", async (req, res) => {
    try {
        // Büyük kazançları çeken sorgu
        const transactions = await Transaction.find({ win_money: { $gt: 0 } })
            .sort({ createdAt: -1 }) // En yeni işlemleri getir
            .limit(20); // Maksimum 20 kayıt getir

        // Kullanıcı, oyun ve kazanç verilerini toplama
        const recentWins = await Promise.all(
            transactions.map(async (transaction) => {
                const user = await User.findOne({ user_code: transaction.user_code });
                const game = await Game.findOne({ game_code: transaction.game_code });

                return {
                    username: user ? user.username : "Unknown",
                    gameBanner: game ? game.banner : null,
                    winAmount: transaction.win_money,
                };
            })
        );

        res.json(recentWins);
    } catch (error) {
        console.error("Error fetching recent big wins:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
