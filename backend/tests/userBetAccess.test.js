const test = require("node:test");
const assert = require("node:assert/strict");

const {
	BET_ACCESS_BLOCKED_CODE,
	BET_ACCESS_BLOCKED_MESSAGE,
	getProviderVisibleBalance,
	isUserBetAccessBlocked,
} = require("../utils/userBetAccess");

test("bet erişimi yalnız açıkça engellenen kullanıcıda kapalıdır", () => {
	assert.equal(isUserBetAccessBlocked(), false);
	assert.equal(isUserBetAccessBlocked({}), false);
	assert.equal(isUserBetAccessBlocked({ betAccess: { blocked: false } }), false);
	assert.equal(isUserBetAccessBlocked({ betAccess: { blocked: true } }), true);
});

test("engelli kullanıcının sağlayıcıya görünen bakiyesi sıfırdır", () => {
	assert.equal(getProviderVisibleBalance({ betAccess: { blocked: true } }, 125), 0);
	assert.equal(getProviderVisibleBalance({ betAccess: { blocked: false } }, 125), 125);
});

test("bet engeli sabit ve kullanıcıya gösterilebilir bir hata sözleşmesine sahiptir", () => {
	assert.equal(BET_ACCESS_BLOCKED_CODE, "BET_ACCESS_BLOCKED");
	assert.match(BET_ACCESS_BLOCKED_MESSAGE, /destek ekibimizle iletişime geçin/);
});
