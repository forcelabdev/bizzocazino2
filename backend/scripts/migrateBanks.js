const mongoose = require("mongoose");
require("dotenv").config();
const { bankAccounts } = require("../config");
const BankAccount = require("../database/models/BankAccount");
require("../database")().then(async () => {
	for (const acc of bankAccounts) {
		await BankAccount.create({ ...acc, active: true });
	}
	console.log("Migration done");
	process.exit(0);
});
