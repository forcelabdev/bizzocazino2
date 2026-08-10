const User = require('../../database/models/User')
const mongoose = require('mongoose')
const axios = require('axios')

const getCountryFromIP = async ip => {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/country_name/`)
    return response.data || 'Unknown'
  } catch (error) {
    console.error(`IP API error for ${ip}:`, error.message)
    return 'Unknown'
  }
}



exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      rank,
    } = req.query

    const query = {}

    if (search) {
      query.$or = [
        { 'local.email': { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    if (rank) {
      query.rank = rank
    }

    const usersRaw = await User.find(query)
      .select('username local.email phone rank balance createdAt country')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))

    const users = usersRaw.map(user => {
      return {
        _id: user._id,
        username: user.username,
        phone: user.phone,
        rank: user.rank,
        balance: user.balance,
        local: user.local,
        country: user.country?.name || 'Unknown',
      }
    })

    const total = await User.countDocuments(query)

    res.json({ users, totalUsers: total, totalPage: Math.ceil(total / limit), page: Number(page) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}


