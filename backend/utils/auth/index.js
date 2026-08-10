const jwt = require('jsonwebtoken');
const User = require('../../database/models/User'); // kendi path'ine göre düzenle
const {
  ACCOUNT_SUSPENDED_CODE,
  assertUserNotSuspended
} = require('../userSuspension');

// Token üret
const authGenerateJwtToken = (userId) => {
  return jwt.sign({ _id: userId }, process.env.TOKEN_SECRET, {
    expiresIn: process.env.TOKEN_EXPIRE,
  });
};

// Token'dan kullanıcıyı çöz
const getUserFromToken = async (token) => {
  if (!token) throw new Error('Token eksik');

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) throw new Error('Kullanıcı bulunamadı');
    assertUserNotSuspended(user);
    return user;
  } catch (err) {
    if (err.code === ACCOUNT_SUSPENDED_CODE) throw err;
    throw new Error('Geçersiz token');
  }
};

module.exports = {
  authGenerateJwtToken,
  getUserFromToken
};
