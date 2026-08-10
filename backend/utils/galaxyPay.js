const crypto = require("crypto");
const qs = require("qs");


const METHOD_DEFINITIONS = {

	lobby: {

		method: "lobby",

		type: "deposit",

		name: "GalaxyPay Lobby",

		endpoint: "/payment/deposit/bank-transfer",

	},


	"bank-transfer-deposit": {

		method: "bank-transfer",

		type: "deposit",

		name: "Banka Transferi",

		endpoint: "/payment/deposit/bank-transfer",

	},


	"papara-deposit": {

		method: "papara",

		type: "deposit",

		name: "Papara",

		endpoint: "/payment/deposit/papara",

	},


	"bank-transfer-withdraw": {

		method: "bank-transfer",

		type: "withdraw",

		name: "Banka Transferi",

		endpoint: "/payment/draw/bank-transfer",

	},


	"papara-withdraw": {

		method: "papara",

		type: "withdraw",

		name: "Papara",

		endpoint: "/payment/draw/papara",

	},

};





const DEFAULT_METHOD_FLAGS = {

	depositLobby: true,

	depositBankTransfer: true,

	depositPapara: true,

	withdrawBankTransfer: true,

	withdrawPapara: true,

};






const normalizeGalaxyPayMethod = (method = "") =>

	String(method).trim().toLowerCase();








const getGalaxyPayEndpoint = (type, method) => {


	const normalizedType = String(type || "").trim().toLowerCase();


	const normalizedMethod = normalizeGalaxyPayMethod(method);




	if (
		normalizedType === "deposit" &&
		normalizedMethod === "lobby"
	) {

		return METHOD_DEFINITIONS.lobby.endpoint;

	}




	if (
		normalizedType === "deposit" &&
		normalizedMethod === "bank-transfer"
	) {

		return METHOD_DEFINITIONS["bank-transfer-deposit"].endpoint;

	}





	if (
		normalizedType === "deposit" &&
		normalizedMethod === "papara"
	) {

		return METHOD_DEFINITIONS["papara-deposit"].endpoint;

	}





	if (
		normalizedType === "withdraw" &&
		normalizedMethod === "bank-transfer"
	) {

		return METHOD_DEFINITIONS["bank-transfer-withdraw"].endpoint;

	}





	if (
		normalizedType === "withdraw" &&
		normalizedMethod === "papara"
	) {

		return METHOD_DEFINITIONS["papara-withdraw"].endpoint;

	}



	return null;

};









// ===============================
// GALAXYPAY FORM BODY FIX
// ===============================


const buildGalaxyPayFormBody = (params = {}) => {


	const body = {


		...params,



		first_name:
			params.first_name
				? String(params.first_name).trim()
				: "",




		last_name:
			params.last_name
				? String(params.last_name).trim()
				: "",


	};




	console.log(
		"GALAXY FORM BODY:",
		body
	);




	return qs.stringify(body, {


		encode: true,


		format: "RFC1738",


		arrayFormat: "indices",


		skipNulls: true,


	});


};









const createGalaxyPayHeaders = () => ({

	"Content-Type": "application/x-www-form-urlencoded",

	Accept: "application/json",

});









const generateGalaxyPayTransactionId = (userId, type = "deposit") => {


	const prefix = type === "withdraw" ? "GP-WD" : "GP-DP";


	const ts = Date.now();


	const rand = crypto.randomBytes(4).toString("hex");



	return `${prefix}-${userId}-${ts}-${rand}`;

};




// ===============================
// PHP http_build_query STİLİNDE HASH - GİDEN İSTEK İÇİN
// ===============================

const generateGalaxyPayHash = ({

	apiId,

	apiKey,

	userId,

	username,

	amount,

	type,

	externalTransactionId,

}) => {

	// PHP'deki gibi parametreleri hazırla
	const params = {

		api_id: apiId,

		api_key: apiKey,

		user_id: userId,

		username: username,

		amount: amount,

		type: type, // "deposit" veya "withdraw"

	};




	if (externalTransactionId) {

		params.external_transaction_id = externalTransactionId;

	}




	// http_build_query gibi alfabetik sırala ve URL encode et
	const sortedKeys = Object.keys(params).sort();
	const parts = [];
	
	for (const key of sortedKeys) {
		const value = params[key];
		// URL encode et (PHP'nin urlencode ile aynı)
		const encodedValue = encodeURIComponent(String(value));
		parts.push(`${key}=${encodedValue}`);
	}
	
	const queryString = parts.join('&');
	
	console.log("🔑 HASH QUERY STRING (GİDEN):", queryString);

	return crypto

		.createHash("sha512")

		.update(queryString)

		.digest("hex");


};









const safeTimingEqual = (left, right) => {


	const leftBuffer = Buffer.from(
		String(left || "").toLowerCase(),
		"utf8"
	);


	const rightBuffer = Buffer.from(
		String(right || "").toLowerCase(),
		"utf8"
	);




	if (leftBuffer.length !== rightBuffer.length)

		return false;



	return crypto.timingSafeEqual(
		leftBuffer,
		rightBuffer
	);

};









const verifyGalaxyPayHash = ({

	apiId,

	apiKey,

	userId,

	username,

	amount,

	type,

	externalTransactionId,

	receivedHash,

}) => {


	if (
		!apiId ||
		!apiKey ||
		!userId ||
		!username ||
		!type ||
		!receivedHash
	) {

		return false;

	}




	const amountCandidates = [
		
		...new Set([

			amount,

			Number.isFinite(Number(amount))
				? String(Number(amount))
				: null,


			Number.isFinite(Number(amount))
				? Number(amount).toFixed(2)
				: null,

		])

	].filter(

		(value) =>
			value !== null &&
			value !== undefined &&
			value !== ""

	);





	return amountCandidates.some(

		(amountCandidate) =>


			safeTimingEqual(

				receivedHash,


				generateGalaxyPayHash({

					apiId,

					apiKey,

					userId,

					username,

					amount: amountCandidate,

					type,

					externalTransactionId,

				})

			)

	);

};









const normalizeGalaxyPayCallback = (body = {}) => ({

	apiId: body.apiId ?? body.api_id,

	apiKey: body.apiKey ?? body.api_key,

	paymentId: body.paymentId ?? body.payment_id,

	userId: body.userId ?? body.user_id,

	username: body.username,

	type: body.type,

	amount: body.amount,

	externalTransactionId:
		body.externalTransactionId ??
		body.external_transaction_id,


	status: body.status,

	message: body.message,

	hash: body.hash,

});









const mapGalaxyPayCallbackStatus = (status) => {


	if (
		status === true ||
		status === "true" ||
		status === 1 ||
		status === "1"
	) {

		return "approved";

	}




	if (
		status === false ||
		status === "false" ||
		status === 0 ||
		status === "0"
	) {

		return "rejected";

	}




	return "pending";

};









const normalizeGalaxyPayUrl = (url, apiUrl = "https://galaxypay.dev") => {


	if (!url)

		return "";



	const value = String(url);



	if (value.startsWith("//"))

		return `https:${value}`;



	if (value.startsWith("/"))

		return `${String(apiUrl).replace(/\/$/, "")}${value}`;



	return value;

};









const getEnabledGalaxyPayMethods = (settings = {}) => {


	const flags = {


		...DEFAULT_METHOD_FLAGS,


		...(settings.methods || {})


	};




	const deposits = [];

	const withdrawals = [];




	if(flags.depositLobby)

		deposits.push(METHOD_DEFINITIONS.lobby);



	if(flags.depositBankTransfer)

		deposits.push(
			METHOD_DEFINITIONS["bank-transfer-deposit"]
		);



	if(flags.depositPapara)

		deposits.push(
			METHOD_DEFINITIONS["papara-deposit"]
		);




	if(flags.withdrawBankTransfer)

		withdrawals.push(
			METHOD_DEFINITIONS["bank-transfer-withdraw"]
		);



	if(flags.withdrawPapara)

		withdrawals.push(
			METHOD_DEFINITIONS["papara-withdraw"]
		);




	return {

		deposits,

		withdrawals

	};

};




// ===============================
// CALLBACK HASH - PHP STİLİ
// ===============================

const generateGalaxyPayCallbackHash = ({
    status,
    message,
    apiKey,
}) => {
    const params = {
        api_key: apiKey,
        message: message,
        status: status,
    };
    
    const sortedKeys = Object.keys(params).sort();
    const parts = [];
    
    for (const key of sortedKeys) {
        const encodedValue = encodeURIComponent(String(params[key]));
        parts.push(`${key}=${encodedValue}`);
    }
    
    const queryString = parts.join('&');
    
    console.log("🔑 CALLBACK HASH QUERY STRING:", queryString);
    
    return crypto
        .createHash("sha512")
        .update(queryString)
        .digest("hex");
};








module.exports = {


	DEFAULT_METHOD_FLAGS,


	METHOD_DEFINITIONS,


	buildGalaxyPayFormBody,


	createGalaxyPayHeaders,


	generateGalaxyPayHash,


	generateGalaxyPayTransactionId,


	getEnabledGalaxyPayMethods,


	getGalaxyPayEndpoint,


	mapGalaxyPayCallbackStatus,

	normalizeGalaxyPayCallback,


	normalizeGalaxyPayMethod,


	normalizeGalaxyPayUrl,


	verifyGalaxyPayHash,


	generateGalaxyPayCallbackHash,


};