<script setup>
import axios from "@/plugins/axios";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// Transaction state renkleri
const resolveStatus = {
	completed: "success",
	approved: "success",
	rejected: "error",
	pending: "warning",
	processing: "info",
};

// Transactions listesi
const lastTransactions = ref([]);

const translateStatus = (status) => {
	const key = `analytics.${status}`;
	const translated = t(key);

	return translated !== key ? translated : status;
};

const fetchLastTransactions = async () => {
	try {
		const res = await axios.get("/admin/analytics/last-transactions");
		if (res.data.success) {
			lastTransactions.value = res.data.data;
		}
	} catch (err) {
		console.error("Fetch last transactions error:", err);
	}
};

// TRY formatla
const formatAmount = (val) => {
	return Number(val || 0).toLocaleString("tr-TR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

// Kaynak label
const getSourceLabel = (source) => {
	return source === "bank" ? "Banka" : "Crypto";
};

onMounted(() => {
	fetchLastTransactions();
});
</script>

<template>
	<VCard :title="t('analytics.recentTransactions')">
		<VDivider />
		<VTable class="text-no-wrap">
			<thead>
				<tr>
					<th class="font-weight-medium">
						{{ t("analytics.user") }}
					</th>
					<th class="font-weight-medium">
						{{ t("analytics.type") }}
					</th>
					<th class="font-weight-medium">Kaynak</th>
					<th class="font-weight-medium">
						{{ t("analytics.date") }}
					</th>
					<th class="font-weight-medium">
						{{ t("analytics.status") }}
					</th>
					<th class="font-weight-medium">
						{{ t("analytics.amount") }}
					</th>
				</tr>
			</thead>

			<tbody>
				<tr v-for="tx in lastTransactions" :key="tx._id">
					<!-- Kullanıcı -->
					<td>
						<span class="font-weight-medium text-base">
							{{ tx.user?.username || "—" }}
						</span>
					</td>

					<!-- İşlem tipi -->
					<td>
						<VChip
							:color="tx.type === 'deposit' ? 'success' : 'error'"
							label
							size="small"
						>
							{{ tx.type === "deposit" ? "Yatırım" : "Çekim" }}
						</VChip>
					</td>

					<!-- Kaynak (Crypto / Bank) -->
					<td>
						<VChip
							:color="
								tx.source === 'bank' ? 'primary' : 'secondary'
							"
							label
							size="small"
						>
							{{ getSourceLabel(tx.source) }}
						</VChip>
					</td>

					<!-- Tarih -->
					<td>
						<span class="text-sm text-disabled">
							{{ new Date(tx.createdAt).toLocaleString("tr-TR") }}
						</span>
					</td>

					<!-- Durum -->
					<td>
						<VChip
							label
							:color="resolveStatus[tx.status] || 'secondary'"
							size="small"
						>
							{{ translateStatus(tx.status) }}
						</VChip>
					</td>

					<!-- Miktar -->
					<td>
						<span class="font-weight-medium text-base">
							{{ formatAmount(tx.amount) }}
							{{ tx.currency || "TRY" }}
						</span>
					</td>
				</tr>
			</tbody>
		</VTable>
	</VCard>
</template>
