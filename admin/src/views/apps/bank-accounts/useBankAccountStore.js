import axios from "@axios";
import { defineStore } from "pinia";

export const useBankAccountStore = defineStore("BankAccountStore", {
	state: () => ({
		accounts: [],
		loading: false,
		error: null,
	}),

	actions: {
		async fetchAccounts() {
			this.loading = true;
			this.error = null;
			try {
				const res = await axios.get("/admin/bank-accounts");
				console.log("Store - Bank accounts response:", res.data);
				this.accounts = res.data.data || [];
				return this.accounts;
			} catch (err) {
				console.error("Store - Bank accounts fetch error:", err);
				this.error =
					err.response?.data?.message ||
					err.message ||
					"Bir hata oluştu";
				throw err;
			} finally {
				this.loading = false;
			}
		},

		async fetchAccount(id) {
			try {
				const res = await axios.get(`/admin/bank-accounts/${id}`);
				return res.data.data;
			} catch (err) {
				console.error("Store - Bank account fetch error:", err);
				throw err;
			}
		},

		async createAccount(accountData) {
			try {
				const res = await axios.post(
					"/admin/bank-accounts",
					accountData
				);
				await this.fetchAccounts();
				return res.data.data;
			} catch (err) {
				console.error("Store - Bank account create error:", err);
				throw err;
			}
		},

		async updateAccount(id, accountData) {
			try {
				const res = await axios.put(
					`/admin/bank-accounts/${id}`,
					accountData
				);
				await this.fetchAccounts();
				return res.data.data;
			} catch (err) {
				console.error("Store - Bank account update error:", err);
				throw err;
			}
		},

		async deleteAccount(id) {
			try {
				await axios.delete(`/admin/bank-accounts/${id}`);
				await this.fetchAccounts();
				return true;
			} catch (err) {
				console.error("Store - Bank account delete error:", err);
				throw err;
			}
		},

		async toggleActive(account) {
			try {
				const res = await axios.put(
					`/admin/bank-accounts/${account._id}`,
					{
						...account,
						active: !account.active,
					}
				);
				await this.fetchAccounts();
				return res.data.data;
			} catch (err) {
				console.error("Store - Bank account toggle error:", err);
				throw err;
			}
		},
	},
});
