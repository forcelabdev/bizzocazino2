const express = require("express");
const axios = require("axios");
const router = express.Router();


const User = require("../../database/models/User");
const SiteSettings = require("../../database/models/SiteSettings");
const GalaxyPayTransaction = require("../../database/models/GalaxyPayTransaction");
const { authorizeUser } = require("../../middleware/auth");
const { getActiveWallet, updateUserBalance } = require("../../utils/wallet");


const {
	DEFAULT_METHOD_FLAGS,
	buildGalaxyPayFormBody,
	createGalaxyPayHeaders,
	generateGalaxyPayTransactionId,
	getGalaxyPayEndpoint,
	mapGalaxyPayCallbackStatus,
	normalizeGalaxyPayCallback,
	normalizeGalaxyPayMethod,
	normalizeGalaxyPayUrl,
	generateGalaxyPayHash,
	generateGalaxyPayCallbackHash,
} = require("../../utils/galaxyPay");




// ---------------- SETTINGS ----------------

const getSettings = async (requireActive = true) => {


	let siteSettings = await SiteSettings.findOne();


	if (!siteSettings) {

		siteSettings = new SiteSettings();

		await siteSettings.save();

	}


	const settings = {

		isActive:false,

		name:"GalaxyPay",

		logo:"",

		minAmount:100,

		maxAmount:100000,

		currency:"TRY",

		lang:"tr",

		apiId:"",

		apiKey:"",

		apiUrl:"https://galaxypay.dev",

		methods:{
			...DEFAULT_METHOD_FLAGS
		},

		returnUrlSuccess:"",

		returnUrlFail:"",

		...(siteSettings.galaxyPay || {})

	};



	settings.methods = {

		...DEFAULT_METHOD_FLAGS,

		...(settings.methods || {})

	};



	if(requireActive && !settings.isActive){

		throw new Error("GalaxyPay aktif değil");

	}



	if(requireActive && (!settings.apiId || !settings.apiKey)){

		throw new Error("API bilgileri eksik");

	}



	return settings;

};








// ---------------- AXIOS ----------------


const createClient = (settings)=> 


axios.create({

	baseURL:settings.apiUrl,

	headers:createGalaxyPayHeaders(),

	timeout:30000

});




// ===============================
// callbackResponse - PHP STİLİ HASH İLE
// ===============================

const callbackResponse = (settings, status, message) => {
    const response = {
        status,
        message,
        hash: generateGalaxyPayCallbackHash({
            status,
            message,
            apiKey: settings.apiKey,
        }),
    };
    
    console.log("📤 CALLBACK RESPONSE:", response);
    
    return response;
};




// ---------------- DEPOSIT ----------------


router.post("/deposit", authorizeUser(true), async(req,res)=>{


try{


	const user = await User.findById(req.user._id);


	const settings = await getSettings(true);



	const requestedAmount = Number(req.body.amount);



	const method =
		normalizeGalaxyPayMethod(
			req.body.method || "lobby"
		);




	if(!requestedAmount || requestedAmount <= 0){

		return res.status(400).json({

			success:false,

			error:"Geçersiz tutar"

		});

	}





	const externalTransactionId =

		generateGalaxyPayTransactionId(

			user._id.toString(),

			"deposit"

		);





	const client = createClient(settings);






// ===============================
// NAME FIX
// ===============================


	const nameParts = String(
		user.name || user.username || "Kullanici"
	)
	.trim()
	.split(/\s+/)
	.filter(Boolean);



	const firstName =
		nameParts.length > 1
			? nameParts.slice(0, -1).join(" ")
			: nameParts[0] || "Kullanici";



	const lastName =
		nameParts.length > 1
			? nameParts[nameParts.length - 1]
			: nameParts[0] || "Kullanici";





	const payload = {


		api_id:settings.apiId,


		api_key:settings.apiKey,


		user_id:user._id.toString(),


		username:user.username,


		external_transaction_id:
			externalTransactionId,



		first_name:
			firstName,



		last_name:
			lastName,



		amount:
			requestedAmount.toFixed(2),



		currency:
			settings.currency,



		lang:
			settings.lang,


		type: "deposit"


	};



	console.log(
		"GALAXY PAY GİDEN:",
		payload
	);






	const endpoint =

		getGalaxyPayEndpoint(

			"deposit",

			method

		);






	const response =

		await client.post(


			endpoint,


			buildGalaxyPayFormBody(payload)


		);






	const raw = response.data;






	if(Number(raw.code)!==200){


		return res.status(400).json({

			success:false,

			error:
				raw.message ||
				"deposit failed"

		});


	}






	const transaction =

	await GalaxyPayTransaction.create({


		user:user._id,


		externalTransactionId,


		type:"deposit",


		method,


		amount:requestedAmount,


		requestedAmount,


		finalAmount:0,


		status:"processing",



		paymentUrl:

			normalizeGalaxyPayUrl(

				raw.url,

				settings.apiUrl

			),



		oldBalance:

			getActiveWallet(user)?.balance || 0


	});






	return res.json({

		success:true,

		data:transaction

	});





}catch(err){


	return res.status(500).json({

		success:false,

		error:err.message

	});


}



});









// ---------------- WITHDRAW ----------------


router.post("/withdraw", authorizeUser(true), async(req,res)=>{


try{


	const user = await User.findById(req.user._id);


	const settings = await getSettings(true);


	const amount = Number(req.body.amount);




	if(!amount || amount<=0){


		return res.status(400).json({

			success:false,

			error:"Geçersiz tutar"

		});


	}




	const wallet = getActiveWallet(user);




	if(wallet.balance < amount){


		return res.status(400).json({

			success:false,

			error:"Yetersiz bakiye"

		});


	}


	const method =
		normalizeGalaxyPayMethod(
			req.body.method || "bank-transfer"
		);




	const externalTransactionId =

		generateGalaxyPayTransactionId(

			user._id.toString(),

			"withdraw"

		);





	const client = createClient(settings);




	const nameParts = String(
		user.name || user.username || "Kullanici"
	)
	.trim()
	.split(/\s+/)
	.filter(Boolean);



	const firstName =
		nameParts.length > 1
			? nameParts.slice(0, -1).join(" ")
			: nameParts[0] || "Kullanici";



	const lastName =
		nameParts.length > 1
			? nameParts[nameParts.length - 1]
			: nameParts[0] || "Kullanici";





	const payload = {


		api_id:settings.apiId,


		api_key:settings.apiKey,


		user_id:user._id.toString(),


		username:user.username,


		external_transaction_id:
			externalTransactionId,



		first_name:
			firstName,



		last_name:
			lastName,



		amount:
			amount.toFixed(2),



		currency:
			settings.currency,



		lang:
			settings.lang,


		type: "withdraw"


	};



	console.log(
		"GALAXY PAY WITHDRAW GİDEN:",
		payload
	);






	const endpoint =

		getGalaxyPayEndpoint(

			"withdraw",

			method

		);






	const response =

		await client.post(


			endpoint,


			buildGalaxyPayFormBody(payload)


		);






	const raw = response.data;






	if(Number(raw.code)!==200){


		return res.status(400).json({

			success:false,

			error:
				raw.message ||
				"withdraw failed"

		});


	}




	// Bakiyeyi güncelle (çekim için)
	await updateUserBalance(

		user,

		-amount,

		{

			emitSocket:true

		}

	);





	const transaction =

	await GalaxyPayTransaction.create({



		user:user._id,


		externalTransactionId,


		type:"withdraw",


		method,


		amount,


		status:"processing",



		paymentUrl:

			normalizeGalaxyPayUrl(

				raw.url,

				settings.apiUrl

			),



		oldBalance:

			wallet.balance


	});






	return res.json({

		success:true,

		data:transaction

	});





}catch(err){


	return res.status(500).json({

		success:false,

		error:err.message

	});


}



});









// ---------------- CALLBACK ----------------


router.post(

"/callback",

express.urlencoded({

	extended:true

}),


express.json(),


async(req,res)=>{


try{


	const settings = await getSettings(true);




	console.log(
		"📥 GALAXY CALLBACK RAW:",
		req.body
	);




	const cb = normalizeGalaxyPayCallback(req.body || {});




	const externalId =

		cb.externalTransactionId ||

		req.body.external_transaction_id ||

		req.body.externalTransactionId ||

		req.body.transaction_id;





	const transaction =

	await GalaxyPayTransaction.findOne({

		externalTransactionId:externalId

	});






	if(!transaction){


        return res.json(

            callbackResponse(

                settings,

                404,

                "not found"

            )

        );

    }






	if(transaction.status==="approved"){


        return res.json(

            callbackResponse(

                settings,

                201,

                "already processed"

            )

        );

    }






	const newStatus =

		mapGalaxyPayCallbackStatus(cb.status);





	transaction.status = newStatus;


	transaction.callbackRawData=req.body;






	if(newStatus==="approved" && transaction.type==="deposit"){



		const user = await User.findById(transaction.user);



		if(user){


			const providerAmount = Number(

				cb.amount ||

				req.body.amount ||

				transaction.amount ||

				0

			);




			transaction.amount = providerAmount;


			transaction.finalAmount = providerAmount;





			const newBalance =

			await updateUserBalance(

				user,

				providerAmount,

				{

					emitSocket:true

				}

			);




			transaction.newBalance = newBalance;


		}



		transaction.approvedAt = new Date();


	}




	if(newStatus==="approved" && transaction.type==="withdraw"){


		transaction.approvedAt = new Date();


	}





	await transaction.save();





    return res.json(

        callbackResponse(

            settings,

            200,

            "ok"

        )

    );





}catch(err){


	console.error("❌ CALLBACK ERROR:", err);

    return res.json(

        callbackResponse(

            settings,

            500,

            "error"

        )

    );


}



});







module.exports = router;