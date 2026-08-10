const validator = require('validator');

// Affiliate kodu gönderim verilerini doğrular
const generalCheckSendAffiliateCodeData = (data) => {
    if (!data || typeof data.code !== 'string' || data.code.trim().length < 2 || data.code.trim().length > 20) {
        throw new Error('Invalid affiliate code.');
    }
};


// Affiliate kodunun mevcut olup olmadığını kontrol eder
const generalCheckSendAffiliateCodeCode = (checkCode) => {
    if (checkCode) {
        throw new Error('Affiliate code already exists.');
    }
};


// Affiliate kodu talebi için gelen verileri doğrular (CAPTCHA kaldırıldı)
const generalCheckSendAffiliateClaimCodeData = (data) => {
    if (data === undefined || data === null) {
        throw new Error('Something went wrong! Please try again in a few seconds.');
    } else if (data.code === undefined || data.code === null || typeof data.code !== 'string' || data.code.trim() === '' || data.code.length < 2 || data.code.length > 20 || validator.isAlphanumeric(data.code, 'en-US', { ignore: '-_' }) !== true) {
        throw new Error('Your entered affiliate code is invalid.');
    }
}

// Kullanıcının affiliate kodu talep edip edemeyeceğini kontrol eder
const generalCheckSendAffiliateClaimCodeUser = (user) => {
    if (user === undefined || user === null) {
        throw new Error('Something went wrong. Please try again in a few seconds.');
    } else if (user.affiliates.pid) {
        throw new Error('You have already redeemed an affiliate code and cannot change it.');
    }
};



// Affiliate kodunun geçerliliğini kontrol eder
const generalCheckSendAffiliateClaimCodeCode = (user, codeDatabase) => {
    if (codeDatabase === null) {
        throw new Error('Your provided affiliate code is invalid.');
    } else if (user._id.toString() === codeDatabase._id.toString()) {
        throw new Error('You are not allowed to redeem your own affiliate code.');
    }
}

// Kullanıcının kazanç talebi için uygun olup olmadığını kontrol eder
const generalCheckSendAffiliateClaimEarningsUser = (user) => {
    if (user === undefined) {
        throw new Error('Something went wrong. Please try again in a few seconds.');
    } else if (user.affiliates.available < process.env.AFFILIATE_MIN_CLAIM) { // * 1000 kaldırıldı
        throw new Error(`You’ll need a minimum of ${process.env.AFFILIATE_MIN_CLAIM} robux in earnings to claim.`);
    }
};


module.exports = {
    generalCheckSendAffiliateCodeData,
    generalCheckSendAffiliateCodeCode,
    generalCheckSendAffiliateClaimCodeData,
    generalCheckSendAffiliateClaimCodeUser,
    generalCheckSendAffiliateClaimCodeCode,
    generalCheckSendAffiliateClaimEarningsUser
}
