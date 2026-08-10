const express = require('express')
const router = express.Router()
const { getUsers, getUserById } = require('../../controllers/admin/userController')

// Kullanıcıları listele
router.get('/', getUsers)

// Kullanıcı detay
router.get('/:id', getUserById)

module.exports = router
