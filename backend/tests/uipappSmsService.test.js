const test = require("node:test");
const assert = require("node:assert/strict");

const axiosPath = require.resolve("axios");
const configPath = require.resolve("../services/smsOtpConfigService");
const servicePath = require.resolve("../services/uipappSmsService");
const mockedPaths = [axiosPath, configPath, servicePath];
const originalCache = new Map(
	mockedPaths.map((modulePath) => [modulePath, require.cache[modulePath]])
);

const requests = [];
let responseData;
const config = {
	apiKey: "secret-api-key",
	baseUrl: "https://sms.uipapp.com/api/v1/hub/index.php",
};

require.cache[axiosPath] = {
	id: axiosPath,
	filename: axiosPath,
	loaded: true,
	exports: {
		post: async (...args) => {
			requests.push(args);
			return { data: responseData };
		},
	},
};
require.cache[configPath] = {
	id: configPath,
	filename: configPath,
	loaded: true,
	exports: {
		DEFAULT_UIPAPP_BASE_URL: config.baseUrl,
		getSmsOtpConfig: async () => config,
	},
};
delete require.cache[servicePath];

const {
	getSmsBalance,
	getSmsReport,
	sendSms,
} = require(servicePath);

test.beforeEach(() => {
	requests.length = 0;
});

test.after(() => {
	for (const modulePath of mockedPaths) {
		const original = originalCache.get(modulePath);
		if (original) require.cache[modulePath] = original;
		else delete require.cache[modulePath];
	}
});

test("OTP kodunu yeni hub endpointine Bearer auth ile gönderir", async () => {
	responseData = {
		status: "success",
		batch_id: 145,
		message: "Mesaj başarıyla işleme alındı.",
	};

	const result = await sendSms({
		phoneNumbers: [" +905551112233 "],
		message: "758574",
	});

	assert.equal(result.reportId, "145");
	assert.equal(requests.length, 1);
	assert.equal(requests[0][0], config.baseUrl);
	assert.deepEqual(requests[0][1], {
		action: "send",
		message: "758574",
		numbers: ["+905551112233"],
	});
	assert.equal(
		requests[0][2].headers.Authorization,
		"Bearer secret-api-key"
	);
});

test("OTP öncelikli rotasını korumak için rakam dışı mesajı reddeder", async () => {
	await assert.rejects(
		() =>
			sendSms({
				phoneNumbers: ["905551112233"],
				message: "Kodunuz: 123456",
			}),
		(error) => error.code === "SMS_OTP_CODE_INVALID" && error.status === 400
	);
	assert.equal(requests.length, 0);
});

test("bakiye ve rapor isteklerini yeni action sözleşmesiyle gönderir", async () => {
	responseData = {
		status: "success",
		balance: "8291",
		balance_usd: "140.29",
		billing_mode: "adet",
	};
	const balance = await getSmsBalance();
	assert.deepEqual(
		{
			balance: balance.balance,
			balanceUsd: balance.balanceUsd,
			billingMode: balance.billingMode,
		},
		{ balance: "8291", balanceUsd: "140.29", billingMode: "adet" }
	);
	assert.deepEqual(requests[0][1], { action: "balance" });

	responseData = {
		status: "success",
		campaign_id: 145,
		general_status: "İletildi",
		date: "22-06-2026 15:30",
		details: [{ number: "905551112233", status: "İletildi" }],
	};
	const report = await getSmsReport({ reportId: 145 });
	assert.equal(report.campaignId, 145);
	assert.equal(report.status, "İletildi");
	assert.deepEqual(requests[1][1], {
		action: "reports",
		campaign_id: 145,
	});
});

test("yeni API'nin success dışındaki durumlarını provider reddi sayar", async () => {
	responseData = { status: "error", message: "Bakiye yetersiz" };

	await assert.rejects(
		() =>
			sendSms({
				phoneNumbers: ["905551112233"],
				message: "123456",
			}),
		(error) =>
			error.code === "SMS_PROVIDER_REJECTED" &&
			error.message === "Bakiye yetersiz"
	);
});
