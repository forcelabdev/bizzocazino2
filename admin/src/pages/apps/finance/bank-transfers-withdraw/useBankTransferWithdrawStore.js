import axios from "@axios";
import { defineStore } from "pinia";

const sanitizeParams = (params) => {
	const clean = {};
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "")
			clean[key] = value;
	});
	return clean;
};

export const useBankTransferWithdrawStore = defineStore(
	"bank-transfer-withdraw",
	{
		actions: {
			fetchTransfers(params = {}) {
				return axios.get("/admin/bank-transfers-withdraw", {
					params: sanitizeParams({
						search: params.search,
						status: params.status,
						page: params.page,
						limit: params.limit,
						userId: params.userId,
					}),
				});
			},

			updateTransferStatus(id, status) {
				return axios.patch(
					`/admin/bank-transfers-withdraw/${id}/status`,
					{ status }
				);
			},
		},
	}
);
