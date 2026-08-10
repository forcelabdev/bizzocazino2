const generalCheckSendRakebackClaimUser = (user) => {
    if(user.rakeback.available < 1) {
        throw new Error(`You’ll need a minimum of 0.01 TRY in rakeback earnings to claim.`);
    }
}

module.exports = {
    generalCheckSendRakebackClaimUser

}