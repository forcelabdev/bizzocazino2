<script setup>
import { computed, onMounted, ref, watch } from "vue";
import axios from "@axios";
import ability from "@/plugins/casl/ability";
import { useUserListStore } from "@/views/apps/user/useUserListStore";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const userStore = useUserListStore();

const canManage = computed(() => ability.can("manage", "controlGame"));

// Form state en üstte tanımlanır; aşağıdaki watcher'lar (vendor/oyun listesi vb.)
// script setup'ın üstten aşağıya sırayla çalışması nedeniyle buna erişebilmeli.
const form = ref({
	userCode: "",
	vendorCode: "",
	gameCode: "",
	currencyCode: "TRY",
	spinCount: 30,
	expireHours: 24,
});

// Vendor API'sinin JSON string döndürdüğü alanları ({"en":"..."}) düz metne çevirir.
const parseLocalizedText = (raw, fallback) => {
	const text = String(raw || "").trim();
	if (!text) return fallback;
	if (text.startsWith("{")) {
		try {
			const parsed = JSON.parse(text);
			return parsed.en || parsed.tr || Object.values(parsed)[0] || fallback;
		} catch {
			return text;
		}
	}
	return text;
};

/* --------------------------------------------------------------------- */
/* Vendor listesi (mevcut ControlGame API'sinden, sadece slot vendorları) */
/* --------------------------------------------------------------------- */

const vendors = ref([]);
const vendorsLoading = ref(false);

const vendorOptions = computed(() =>
	vendors.value.map((vendor) => ({ title: vendor.vendorName, value: vendor.vendorCode })),
);

const fetchVendors = async () => {
	vendorsLoading.value = true;
	try {
		const { data } = await axios.get("/admin/betinovi-admin/control-game/vendors");
		vendors.value = data.data?.vendors || [];
	} catch (error) {
		console.error("Vendor listesi hatası:", error);
	} finally {
		vendorsLoading.value = false;
	}
};

const currencyOptions = [
	{ title: "TRY - Türk Lirası", value: "TRY" },
	{ title: "USD - Amerikan Doları", value: "USD" },
	{ title: "EUR - Euro", value: "EUR" },
];

/* --------------------------------------------------------------------- */
/* Vendor seçilince oyun kodu listesi (GetVendorGames)                    */
/* --------------------------------------------------------------------- */

const games = ref([]);
const gamesLoading = ref(false);

const gameOptions = computed(() =>
	games.value.map((game) => ({ title: `${game.gameName} (${game.gameCode})`, value: game.gameCode })),
);

const fetchGames = async () => {
	if (!form.value.vendorCode) {
		games.value = [];
		return;
	}
	gamesLoading.value = true;
	try {
		const { data } = await axios.post("/admin/betinovi-admin/control-game/vendor-games", {
			vendorCode: form.value.vendorCode,
		});
		const list = Array.isArray(data.data?.vendorGames) ? data.data.vendorGames : [];
		games.value = list.map((game) => ({
			gameCode: game.gameCode,
			gameName: parseLocalizedText(game.gameName, game.gameCode),
		}));
	} catch (error) {
		console.error("Oyun listesi hatası:", error);
		games.value = [];
	} finally {
		gamesLoading.value = false;
	}
};

watch(
	() => form.value.vendorCode,
	() => {
		form.value.gameCode = "";
		fetchGames();
	},
);

/* --------------------------------------------------------------------- */
/* Kullanıcı arama (kullanıcı kodu = kullanıcının Mongo _id'si)           */
/* --------------------------------------------------------------------- */

const userSearch = ref("");
const userSearchLoading = ref(false);
const userOptions = ref([]);
const selectedUser = ref(null);

let userSearchTimeout = null;

const userOptionTitle = (user) => {
	const email = user?.local?.email || user?.email || "";

	return `${user?.username || user?.name || "—"}${email ? ` (${email})` : ""}`;
};

watch(userSearch, (value) => {
	clearTimeout(userSearchTimeout);
	if (!value || value.length < 2) {
		userOptions.value = selectedUser.value ? [selectedUser.value] : [];

		return;
	}
	userSearchTimeout = setTimeout(async () => {
		userSearchLoading.value = true;
		try {
			const res = await userStore.fetchUsers({ search: value, limit: 15 });
			userOptions.value = res.users || [];
		} catch (error) {
			console.error("Kullanıcı arama hatası:", error);
		} finally {
			userSearchLoading.value = false;
		}
	}, 300);
});

watch(selectedUser, (user) => {
	form.value.userCode = user?._id || "";
});

/* --------------------------------------------------------------------- */
/* Freeround listesi (GetFreeRoundList -> Array<Decimal> per-spin bet)    */
/* --------------------------------------------------------------------- */

const freeRoundListLoading = ref(false);
const freeRoundListError = ref("");
const betAmountOptions = ref([]);
const selectedBetAmount = ref(null);

const canFetchFreeRoundList = computed(
	() => Boolean(form.value.vendorCode && form.value.gameCode),
);

const fetchFreeRoundList = async () => {
	if (!canFetchFreeRoundList.value) return;

	freeRoundListLoading.value = true;
	freeRoundListError.value = "";
	selectedBetAmount.value = null;
	try {
		const { data } = await axios.post("/admin/betinovi-admin/control-game/free-round-list", {
			vendorCode: form.value.vendorCode,
			gameCode: form.value.gameCode,
			currencyCode: form.value.currencyCode,
		});
		const amounts = Array.isArray(data.data?.freeRounds) ? data.data.freeRounds : [];
		betAmountOptions.value = amounts.map((amount) => ({
			title: `${Number(amount).toFixed(2)} ${form.value.currencyCode}`,
			value: Number(amount),
		}));
		if (!betAmountOptions.value.length) {
			freeRoundListError.value = t("freeSpinBonusAdmin.freeRoundListEmpty");
		}
	} catch (error) {
		console.error("Freeround listesi hatası:", error);
		freeRoundListError.value =
			error?.response?.data?.message || t("freeSpinBonusAdmin.listFailed");
		betAmountOptions.value = [];
	} finally {
		freeRoundListLoading.value = false;
	}
};

// Vendor/oyun/currency değişince eski listeyi geçersiz kıl
watch(
	[() => form.value.vendorCode, () => form.value.gameCode, () => form.value.currencyCode],
	() => {
		betAmountOptions.value = [];
		selectedBetAmount.value = null;
		freeRoundListError.value = "";
	},
);

/* --------------------------------------------------------------------- */
/* Freespin uygula (ApplyFreeRound)                                      */
/* --------------------------------------------------------------------- */

const applying = ref(false);
const applyError = ref("");
const applySuccess = ref("");
const sessionLog = ref([]);

const canApply = computed(
	() =>
		Boolean(
			form.value.userCode &&
				form.value.vendorCode &&
				form.value.gameCode &&
				selectedBetAmount.value !== null &&
				Number(form.value.spinCount) > 0 &&
				Number(form.value.expireHours) > 0,
		) && canManage.value,
);

const applyFreeRound = async () => {
	if (!canApply.value) return;

	applying.value = true;
	applyError.value = "";
	applySuccess.value = "";

	const logEntry = {
		date: new Date(),
		userLabel: selectedUser.value?.username || selectedUser.value?.email || form.value.userCode,
		gameCode: form.value.gameCode,
		betAmount: selectedBetAmount.value,
		spinCount: form.value.spinCount,
		expireHours: form.value.expireHours,
		success: false,
		message: "",
	};

	try {
		await axios.post("/admin/betinovi-admin/control-game/apply-free-round", {
			userCode: form.value.userCode,
			vendorCode: form.value.vendorCode,
			gameCode: form.value.gameCode,
			currencyCode: form.value.currencyCode,
			betAmount: selectedBetAmount.value,
			spinCount: form.value.spinCount,
			expireHours: form.value.expireHours,
		});

		applySuccess.value = t("freeSpinBonusAdmin.applySuccess");
		logEntry.success = true;
		logEntry.message = t("freeSpinBonusAdmin.success");
	} catch (error) {
		console.error("Freespin uygulama hatası:", error);
		applyError.value = error?.response?.data?.message || t("freeSpinBonusAdmin.applyFailed");
		logEntry.success = false;
		logEntry.message = applyError.value;
	} finally {
		sessionLog.value = [logEntry, ...sessionLog.value].slice(0, 50);
		applying.value = false;
	}
};

const formatDate = (value) => {
	if (!value) return "-";
	return new Date(value).toLocaleString("tr-TR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

onMounted(() => {
	fetchVendors();
});
</script>

<template>
	<VRow>
		<VCol cols="12">
			<div class="d-flex flex-column mb-2">
				<h4 class="text-h4">
					{{ t("freeSpinBonusAdmin.title") }}
				</h4>
				<span class="text-body-2 text-disabled">{{ t("freeSpinBonusAdmin.description") }}</span>
			</div>
		</VCol>

		<VCol cols="12">
			<VCard>
				<VCardText>
					<h5 class="text-h5 mb-4">
						{{ t("freeSpinBonusAdmin.formTitle") }}
					</h5>

					<VAlert
						v-if="!canManage"
						type="warning"
						variant="tonal"
						class="mb-4"
					>
						Bu işlemi gerçekleştirmek için ControlGame yönetim yetkiniz bulunmuyor.
					</VAlert>

					<VForm @submit.prevent="applyFreeRound">
						<VRow>
							<VCol
								cols="12"
								md="6"
							>
								<VAutocomplete
									v-model="selectedUser"
									v-model:search="userSearch"
									:items="userOptions"
									:loading="userSearchLoading"
									:item-title="userOptionTitle"
									return-object
									clearable
									no-filter
									:label="t('freeSpinBonusAdmin.userCode')"
									:placeholder="t('freeSpinBonusAdmin.userSearchPlaceholder')"
									:hint="t('freeSpinBonusAdmin.userSearchHint')"
									persistent-hint
									:disabled="!canManage"
								/>
							</VCol>

							<VCol
								cols="12"
								md="6"
							>
								<AppTextField
									v-model="form.userCode"
									label="Kullanıcı Kodu"
									density="compact"
									readonly
								/>
							</VCol>

							<VCol
								cols="12"
								md="4"
							>
								<AppSelect
									v-model="form.vendorCode"
									:items="vendorOptions"
									:loading="vendorsLoading"
									:label="t('freeSpinBonusAdmin.vendor')"
									:disabled="!canManage"
								/>
							</VCol>

							<VCol
								cols="12"
								md="4"
							>
								<AppSelect
									v-model="form.gameCode"
									:items="gameOptions"
									:loading="gamesLoading"
									:disabled="!canManage || !form.vendorCode"
									:label="t('freeSpinBonusAdmin.gameCode')"
									:hint="t('freeSpinBonusAdmin.gameCodeHint')"
									persistent-hint
								/>
							</VCol>

							<VCol
								cols="12"
								md="4"
							>
								<AppSelect
									v-model="form.currencyCode"
									:items="currencyOptions"
									:label="t('freeSpinBonusAdmin.currency')"
									:disabled="!canManage"
								/>
							</VCol>

							<VCol cols="12">
								<VBtn
									variant="tonal"
									color="secondary"
									:loading="freeRoundListLoading"
									:disabled="!canManage || !canFetchFreeRoundList"
									@click="fetchFreeRoundList"
								>
									{{ t("freeSpinBonusAdmin.fetchList") }}
								</VBtn>
							</VCol>

							<VCol
								cols="12"
								md="6"
							>
								<AppSelect
									v-model="selectedBetAmount"
									:items="betAmountOptions"
									:loading="freeRoundListLoading"
									:label="t('freeSpinBonusAdmin.freeRoundList')"
									:disabled="!canManage || !betAmountOptions.length"
								/>
								<span
									v-if="freeRoundListError"
									class="text-caption text-error"
								>{{ freeRoundListError }}</span>
							</VCol>

							<VCol
								cols="12"
								md="3"
							>
								<AppTextField
									v-model.number="form.spinCount"
									type="number"
									min="1"
									:label="t('freeSpinBonusAdmin.freeRoundCount')"
									:disabled="!canManage"
								/>
							</VCol>

							<VCol
								cols="12"
								md="3"
							>
								<AppTextField
									v-model.number="form.expireHours"
									type="number"
									min="1"
									:label="t('freeSpinBonusAdmin.expireHours')"
									:disabled="!canManage"
								/>
							</VCol>

							<VCol
								v-if="applyError"
								cols="12"
							>
								<VAlert
									type="error"
									variant="tonal"
									closable
									@click:close="applyError = ''"
								>
									{{ applyError }}
								</VAlert>
							</VCol>

							<VCol
								v-if="applySuccess"
								cols="12"
							>
								<VAlert
									type="success"
									variant="tonal"
									closable
									@click:close="applySuccess = ''"
								>
									{{ applySuccess }}
								</VAlert>
							</VCol>

							<VCol cols="12">
								<VBtn
									type="submit"
									color="primary"
									:loading="applying"
									:disabled="!canApply"
								>
									{{ t("freeSpinBonusAdmin.apply") }}
								</VBtn>
							</VCol>
						</VRow>
					</VForm>
				</VCardText>
			</VCard>
		</VCol>

		<VCol cols="12">
			<VCard>
				<VCardText>
					<h5 class="text-h5 mb-4">
						{{ t("freeSpinBonusAdmin.sessionLogTitle") }}
					</h5>

					<VTable v-if="sessionLog.length">
						<thead>
							<tr>
								<th>{{ t("freeSpinBonusAdmin.date") }}</th>
								<th>{{ t("freeSpinBonusAdmin.userCode") }}</th>
								<th>{{ t("freeSpinBonusAdmin.gameCode") }}</th>
								<th>{{ t("freeSpinBonusAdmin.freeRoundCount") }}</th>
								<th>{{ t("freeSpinBonusAdmin.expireHours") }}</th>
								<th>{{ t("freeSpinBonusAdmin.result") }}</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="(entry, index) in sessionLog"
								:key="index"
							>
								<td>{{ formatDate(entry.date) }}</td>
								<td>{{ entry.userLabel }}</td>
								<td>{{ entry.gameCode }}</td>
								<td>{{ entry.spinCount }}</td>
								<td>{{ entry.expireHours }}</td>
								<td>
									<VChip
										:color="entry.success ? 'success' : 'error'"
										size="small"
									>
										{{ entry.success ? t("freeSpinBonusAdmin.success") : t("freeSpinBonusAdmin.failed") }}
									</VChip>
								</td>
							</tr>
						</tbody>
					</VTable>
					<span
						v-else
						class="text-body-2 text-disabled"
					>{{ t("freeSpinBonusAdmin.sessionLogEmpty") }}</span>
				</VCardText>
			</VCard>
		</VCol>
	</VRow>
</template>

<route lang="yaml">
meta:
  action: read
  subject: controlGame
</route>
