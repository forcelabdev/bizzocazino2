const validator = require('validator');



const authCheckPostCredentialsData = (data) => {
    if(data === undefined || data === null) {
        throw new Error('Something went wrong. Please try again in a few seconds.');
    } 
    // else if(data.captcha === undefined || data.captcha === null || typeof data.captcha !== 'string') {
    //     throw new Error('Your provided captcha token is invalid.');
    // }

    // Email, phone veya username'den biri olmalı
    if (data.email && typeof data.email === 'string') {
        if (!validator.isEmail(data.email)) {
            throw new Error('Your provided email is invalid.');
        }
    } else if (data.phone && typeof data.phone === 'string') {
        if (!/^\+?[0-9]{10,15}$/.test(data.phone)) {
            throw new Error('Your provided phone number is invalid.');
        }
    } else if (data.username && typeof data.username === 'string') {
        if (data.username.trim() === '') {
            throw new Error('Your provided username is invalid.');
        }
    } else {
        throw new Error('You must provide either an email, phone number, or username.');
    }

    // Şifre doğrulama
    if(data.password === undefined || typeof data.password !== 'string' || data.password.length <= 4) {
        throw new Error('Your provided password is invalid.');
    }
}


const authCheckPostCredentialsUser = (userDatabase, isMatch) => {
    if(userDatabase === null || isMatch !== true) {
        throw new Error('Your provided credentials are invalid.');
    }
}

const supportedFiatCurrencies = [
  "USD","GBP","CAD","AUD","EUR","TRY","BRL","MXN","INR","JPY","KRW","PHP",
  "ZAR","RUB","SEK","NOK","DKK","SGD","MYR","THB","VND","ARS","COP","CLP","CNY"
];

const authCheckPostCredentialsRegisterData = (data) => {
  if (data === undefined || data === null) {
    throw new Error('Something went wrong. Please try again in a few seconds.');
  }

//   if (!data.captcha || typeof data.captcha !== 'string') {
//     throw new Error('Your provided captcha token is invalid.');
//   }

  if (!data.email || typeof data.email !== 'string' || validator.isEmail(data.email) !== true) {
    throw new Error('Your provided email is invalid.');
  }

  if (!data.username || typeof data.username !== 'string' || data.username.trim() === '') {
    throw new Error('Your provided username is invalid.');
  }

  if (!data.phone || typeof data.phone !== 'string' || !/^\+?[0-9]{10,15}$/.test(data.phone)) {
    throw new Error('Your provided phone number is invalid.');
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    throw new Error('Your provided name is invalid.');
  }

  // 🎂 Doğum günü kontrolü
  if (!data.birthday) {
    throw new Error('Your provided birthday is invalid.');
  }
  const birthDate = new Date(data.birthday);
  if (isNaN(birthDate.getTime())) {
    throw new Error('Your provided birthday is invalid.');
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  if (age < 18) {
    throw new Error('You must be at least 18 years old to register.');
  }

  // 🔑 Şifre kontrolü
  if (!data.password || typeof data.password !== 'string') {
    throw new Error('Your provided password is invalid.');
  }
  if (data.password.length < 8 || data.password.length > 128) {
    throw new Error('Password must be between 8 and 128 characters.');
  }
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(data.password)) {
    throw new Error('Password must contain at least 1 uppercase letter and 1 number.');
  }

  // 💱 Fiat Currency kontrolü
  if (!data.fiatCurrency || !supportedFiatCurrencies.includes(data.fiatCurrency)) {
    throw new Error('Your provided fiat currency is invalid.');
  }
};

const authCheckPostCredentialsRegisterUser = (userDatabase) => {
  if (userDatabase.emailExists) {
    throw new Error('Your provided email is already used.');
  } else if (userDatabase.usernameExists) {
    throw new Error('Your provided username is already used.');
  } else if (userDatabase.phoneExists) {
    throw new Error('Your provided phone number is already used.');
  }
};

const authCheckPostCredentialsLinkData = (data) => {
    if (!data.username || typeof data.username !== 'string' || data.username.trim() === '') {
        throw new Error('Your provided username is invalid.');
    }
    if (!data.phone || typeof data.phone !== 'string' || !validator.isMobilePhone(data.phone)) {
        throw new Error('Your provided phone number is invalid.');
    }
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        throw new Error('Your provided name and surname is invalid.');
    }
    if(data === undefined || data === null) {
        throw new Error('Something went wrong. Please try again in a few seconds.');
    } else if(data.email === undefined || typeof data.email !== 'string' || validator.isEmail(data.email) !== true) {
        throw new Error('Your provided email is invalid.');
    } else if(data.password === undefined || typeof data.password !== 'string' || data.password.length <= 4 || data.password.length > 128) {
        throw new Error('Your provided password is invalid.');
    }
    
}

const authCheckPostCredentialsLinkUser = (dataDatabase) => {
    if(dataDatabase[0].local !== undefined) {
        throw new Error('Your account has already linked an email.');
    } else if(dataDatabase[1] !== null) {
        throw new Error('Your provided email is already used.');
    }
}

const authCheckPostCredentialsRequestData = (data) => {
    if(data === undefined || data === null) {
        throw new Error('Something went wrong. Please try again in a few seconds.');
    } else if(data.type === undefined || typeof data.type !== 'string' || ['verify', 'reset'].includes(data.type) !== true) {
        throw new Error('Your provided type is invalid.');
    } else if(data.email === undefined || typeof data.email !== 'string' || validator.isEmail(data.email) !== true) {
        throw new Error('Your provided email is invalid.');
    }
}

const authCheckPostCredentialsRequestUser = (userDatabase, data) => {
    if(userDatabase === null) {
        throw new Error('Your provided email is invalid.');
    } else if(data.type === 'verify' && userDatabase.local.emailVerified === true) {
        throw new Error('Your provided user is already verified.');
    }
}

const authCheckPostCredentialsRequestToken = (tokenDatabase) => {
    if(tokenDatabase !== null && (new Date().getTime() - new Date(tokenDatabase.updatedAt).getTime()) < 1000 * 60 * 5) {
        throw new Error('You need to wait at least 5 minutes before you can request a new email.');
    }
}

const authCheckPostCredentialsVerifyData = (data) => {
    if(data === undefined || data === null) {
        throw new Error('Something went wrong. Please try again in a few seconds.');
    } else if(data.userId === undefined || typeof data.userId !== 'string' || validator.isMongoId(data.userId) !== true) {
        throw new Error('Your provided user id is invalid.');
    } else if(data.token === undefined || typeof data.token !== 'string' || data.token.length > 50) {
        throw new Error('Your provided token is invalid.');
    }
}

const authCheckPostCredentialsVerifyToken = (tokenDatabase) => {
    if(tokenDatabase === null) {
        throw new Error('Your provided token is invalid.');
    } else if((new Date().getTime() - new Date().getTime()) >= 1000 * 60 * 30) {
        throw new Error('Your provided token is expired. Please request a new email.');
    }
}

const authCheckPostCredentialsResetData = (data) => {
    if(data === undefined || data === null) {
        throw new Error('Something went wrong. Please try again in a few seconds.');
    } else if(data.captcha === undefined || data.captcha === null || typeof data.captcha !== 'string') {
        throw new Error('Your provided captcha token is invalid.');
    } else if(data.userId === undefined || typeof data.userId !== 'string' || validator.isMongoId(data.userId) !== true) {
        throw new Error('Your provided user id is invalid.');
    } else if(data.token === undefined || typeof data.token !== 'string' || data.token.length > 50) {
        throw new Error('Your provided token is invalid.');
    } else if(data.password === undefined || typeof data.password !== 'string' || data.password.length <= 4 || data.password.length > 128) {
        throw new Error('Your provided password is invalid.');
    }
}

const authCheckPostCredentialsResetToken = (tokenDatabase) => {
    if(tokenDatabase === null) {
        throw new Error('Your provided token is invalid.');
    } else if((new Date().getTime() - new Date().getTime()) >= 1000 * 60 * 30) {
        throw new Error('Your provided token is expired. Please request a new email.');
    }
}

module.exports = {
    authCheckPostCredentialsData,
    authCheckPostCredentialsUser,
    authCheckPostCredentialsRegisterData,
    authCheckPostCredentialsRegisterUser,
    authCheckPostCredentialsLinkData,
    authCheckPostCredentialsLinkUser,
    authCheckPostCredentialsRequestData,
    authCheckPostCredentialsRequestUser,
    authCheckPostCredentialsRequestToken,
    authCheckPostCredentialsVerifyData,
    authCheckPostCredentialsVerifyToken,
    authCheckPostCredentialsResetData,
    authCheckPostCredentialsResetToken
}