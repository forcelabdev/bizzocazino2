<script setup>
import { computed, onMounted, ref, watch } from "vue";
import axios from "@axios";
import ability from "@/plugins/casl/ability";
import { useUserListStore } from "@/views/apps/user/useUserListStore";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const userStore = useUserListStore();

const canManage = computed(() => ability.can("manage", "controlGame"));

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
/* Kullanıcı arama (kullanıcı kodu = kullanıcının Mongo _id'si)           */
/* --------------------------------------------------------------------- */

const userSearch = ref("");
const userSearchLoading = ref(false);
const userOptions = ref([]);
const selectedUser = ref(null);

let userSearchTimeout = null;

const fetchUserOptions = async (query) => {
	userSearchLoading.value = true;
	try {
		const response = await userStore.fetchUsers({ q: query || undefined, itemsPerPage: 15 });
		userOptions.value = (response.users || []).map((user) => ({
			title: `${user.username || user.name || user.email || user._id} ${user.email ? `(${user.email})` : ""}`.trim(),
			value: user,
		}));
	} catch (error) {
		console.error("Kullanıcı arama hatası:", error);
		userOptions.value = [];
	} finally {
		userSearchLoading.value = false;
	}
};

watch(userSearch, (query) => {
	if (userSearchTimeout) clearTimeout(userSearchTimeout);
	userSearchTimeout = setTimeout(() => fetchUserOptions(query), 350);
});

const onUserSelected = (user) => {
	selectedUser.value = user;
	form.value.userCode = user?._id || "";
};

/* --------------------------------------------------------------------- */
/* Freeround listesi (vendor + oyun kodu + para birimine göre canlı çekilir) */
/* --------------------------------------------------------------------- */

const form = ref({
	userCode: "",
	vendorCode: "",
	gameCode: "",
	currencyCode: "TRY",
	freeRoundCount: 30,
	expireHours: 24,
});

const freeRoundListLoading = ref(false);
const freeRoundListError = ref("");
const freeRoundItems = ref([]);
const selectedFreeRoundItem = ref(null);

const extractListFromResponse = (payload) => {
	if (!payload) return [];
	if (Array.isArray(payload)) return payload;
	const preferredKeys = ["freeRoundList", "list", "rows", "items", "results", "freeRounds"];
	for (const key of preferredKeys) {
		if (Array.isArray(payload[key])) return payload[key];
	}
	for (const value of Object.values(payload)) {
		if (Array.isArray(value)) return value;
	}
	return [];
};

const labelForFreeRoundItem = (item, index) => {
	if (item === null || typeof item !== "object") return String(item ?? `Freeround ${index + 1}`);
	const keys = ["title", "name", "freeRoundName", "listName", "label", "code", "currencyCode"];
	for (const key of keys) {
		if (item[key]) return String(item[key]);
	}
	return `Freeround ${index + 1}`;
};

const freeRoundOptions = computed(() =>
	freeRoundItems.value.map((item, index) => ({
		title: labelForFreeRoundItem(item, index),
		value: item,
	})),
);

const canFetchFreeRoundList = computed(
	() => Boolean(form.value.vendorCode && form.value.gameCode && form.value.currencyCode),
);

const fetchFreeRoundList = async () => {
	if (!canFetchFreeRoundList.value) return;

	freeRoundListLoading.value = true;
	freeRoundListError.value = "";
	selectedFreeRoundItem.value = null;
	try {
		const { data } = await axios.post("/admin/betinovi-admin/control-game/free-round-list", {
			vendorCode: form.value.vendorCode,
			gameCode: form.value.gameCode,
			currencyCode: form.value.currencyCode,
		});
		freeRoundItems.value = extractListFromResponse(data.data);
		if (!freeRoundItems.value.length) {
			freeRoundListError.value = t("freeSpinBonusAdmin.freeRoundListEmpty");
		}
	} catch (error) {
		console.error("Freeround listesi hatası:", error);
		freeRoundListError.value =
			error?.response?.data?.message || t("freeSpinBonusAdmin.listFailed");
		freeRoundItems.value = [];
	} finally {
		freeRoundListLoading.value = false;
	}
};

// Vendor/oyun/currency değişince eski listeyi geçersiz kıl
watch(
	[() => form.value.vendorCode, () => form.value.gameCode, () => form.value.currencyCode],
	() => {
		freeRoundItems.value = [];
		selectedFreeRoundItem.value = null;
		freeRoundListError.value = "";
	},
);

/* --------------------------------------------------------------------- */
/* Freespin uygula                                                       */
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
				form.value.currencyCode &&
				selectedFreeRoundItem.value &&
				Number(form.value.freeRoundCount) > 0 &&
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
		freeRoundCount: form.value.freeRoundCount,
		expireHours: form.value.expireHours,
		success: false,
		message: "",
	};

	try {
		await axios.post("/admin/betinovi-admin/control-game/apply-free-round", {
			...selectedFreeRoundItem.value,
			userCode: form.value.userCode,
			vendorCode: form.value.vendorCode,
			gameCode: form.value.gameCode,
			currencyCode: form.value.currencyCode,
			freeRoundCount: form.value.freeRoundCount,
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
								<AppAutocomplete
									v-model="selectedUser"
									v-model:search="userSearch"
									:items="userOptions"
									:loading="userSearchLoading"
									item-title="title"
									item-value="value"
									:label="t('freeSpinBonusAdmin.userCode')"
									:placeholder="t('freeSpinBonusAdmin.userSearchPlaceholder')"
									return-object
									no-filter
									clearable
									@update:model-value="onUserSelected"
								/>
								<span class="text-caption text-disabled">{{ t("freeSpinBonusAdmin.userSearchHint") }}</span>
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
								/>
							</VCol>

							<VCol
								cols="12"
								md="4"
							>
								<AppTextField
									v-model="form.gameCode"
									:label="t('freeSpinBonusAdmin.gameCode')"
									placeholder="vs20olympus1000dice"
								/>
								<span class="text-caption text-disabled">{{ t("freeSpinBonusAdmin.gameCodeHint") }}</span>
							</VCol>

							<VCol
								cols="12"
								md="4"
							>
								<AppSelect
									v-model="form.currencyCode"
									:items="currencyOptions"
									:label="t('freeSpinBonusAdmin.currency')"
								/>
							</VCol>

							<VCol cols="12">
								<VBtn
									variant="tonal"
									:loading="freeRoundListLoading"
									:disabled="!canFetchFreeRoundList"
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
									v-model="selectedFreeRoundItem"
									:items="freeRoundOptions"
									:loading="freeRoundListLoading"
									:label="t('freeSpinBonusAdmin.freeRoundList')"
									:disabled="!freeRoundOptions.length"
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
									v-model.number="form.freeRoundCount"
									type="number"
									min="1"
									:label="t('freeSpinBonusAdmin.freeRoundCount')"
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
								<td>{{ entry.freeRoundCount }}</td>
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
