<script setup>
import { useBankAccountStore } from "@/views/apps/bank-accounts/useBankAccountStore";
import ability from "@/plugins/casl/ability";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { VDataTable } from "vuetify/labs/VDataTable";
import axios from "@/plugins/axios";

const { t } = useI18n();
const store = useBankAccountStore();

const dialog = ref(false);
const deleteDialog = ref(false);
const editMode = ref(false);
const selectedAccount = ref(null);
const logoFile = ref(null);
const uploadingLogo = ref(false);

const defaultForm = {
	bankName: "",
	accountName: "",
	accountNumber: "",
	iban: "",
	note: "",
	logo: null,
	minAmount: 0,
	maxAmount: null,
	active: true,
	order: 0,
};
const form = ref({ ...defaultForm });

const headers = computed(() => [
	{ title: t("bankAccount.order"), key: "order", width: "80px" },
	{ title: t("bankAccount.bankName"), key: "bankName" },
	{ title: t("bankAccount.accountName"), key: "accountName" },
	{ title: t("bankAccount.iban"), key: "iban" },
	{ title: t("bankAccount.minAmount"), key: "minAmount", width: "120px" },
	{ title: t("status"), key: "active", width: "100px" },
	{ title: t("actions"), key: "actions", sortable: false, width: "150px" },
]);

const accounts = computed(() => store.accounts);
const loading = computed(() => store.loading);
const canManageBankAccounts = computed(
	() =>
		ability.can("manage", "finance.bankAccounts") ||
		ability.can("manage", "finance"),
);

const fetchAccounts = async () => {
	try {
		await store.fetchAccounts();
	} catch (e) {
		console.error("Banka hesapları alınamadı:", e);
	}
};

const uploadLogoFile = async () => {
	if (!canManageBankAccounts.value) return;
	if (!logoFile.value || logoFile.value.length === 0) return;
	
	uploadingLogo.value = true;
	try {
		const formData = new FormData();
		formData.append("file", logoFile.value[0]);
		
		const response = await axios.post("/admin/files/upload", formData, {
			headers: { "Content-Type": "multipart/form-data" }
		});
		
		if (response.data?.url) {
			form.value.logo = response.data.url;
		}
	} catch (e) {
		console.error("Logo yükleme hatası:", e);
	} finally {
		uploadingLogo.value = false;
		logoFile.value = null;
	}
};

const openCreateDialog = () => {
	if (!canManageBankAccounts.value) return;
	editMode.value = false;
	form.value = { ...defaultForm };
	logoFile.value = null;
	dialog.value = true;
};

const openEditDialog = (account) => {
	if (!canManageBankAccounts.value) return;
	editMode.value = true;
	selectedAccount.value = account;
	form.value = {
		bankName: account.bankName || "",
		accountName: account.accountName || "",
		accountNumber: account.accountNumber || "",
		iban: account.iban || "",
		note: account.note || "",
		logo: account.logo || null,
		minAmount: account.minAmount || 0,
		maxAmount: account.maxAmount || null,
		active: account.active !== false,
		order: account.order || 0,
	};
	logoFile.value = null;
	dialog.value = true;
};

const saveAccount = async () => {
	if (!canManageBankAccounts.value) return;
	try {
		if (editMode.value && selectedAccount.value) {
			await store.updateAccount(selectedAccount.value._id, form.value);
		} else {
			await store.createAccount(form.value);
		}
		dialog.value = false;
	} catch (e) {
		console.error("Kayıt hatası", e);
		alert(t("bankAccount.saveError"));
	}
};

const openDeleteDialog = (account) => {
	if (!canManageBankAccounts.value) return;
	selectedAccount.value = account;
	deleteDialog.value = true;
};

const deleteAccount = async () => {
	if (!canManageBankAccounts.value || !selectedAccount.value) return;
	try {
		await store.deleteAccount(selectedAccount.value._id);
		deleteDialog.value = false;
	} catch (e) {
		console.error("Silme hatası", e);
		alert(t("bankAccount.deleteError"));
	}
};

const toggleActive = async (account) => {
	if (!canManageBankAccounts.value) return;
	try {
		await store.toggleActive(account);
	} catch (e) {
		console.error("Durum güncelleme hatası", e);
	}
};

onMounted(fetchAccounts);
</script>

<template>
	<div>
		<VCard>
			<VCardTitle class="d-flex align-center justify-space-between pa-4">
				<span>{{ t("bankAccount.title") }}</span>
				<VBtn v-if="canManageBankAccounts" color="primary" @click="openCreateDialog">
					<VIcon start icon="tabler-plus" />
					{{ t("bankAccount.newAccount") }}
				</VBtn>
			</VCardTitle>

			<VCardText>
				<VDataTable
					:headers="headers"
					:items="accounts"
					:loading="loading"
					class="elevation-1"
					item-value="_id"
				>
					<template #item.active="{ item }">
						<VChip
							:color="item.raw.active ? 'success' : 'error'"
							size="small"
							@click="toggleActive(item.raw)"
							:style="{ cursor: canManageBankAccounts ? 'pointer' : 'default' }"
						>
							{{
								item.raw.active
									? t("bankAccount.active")
									: t("bankAccount.passive")
							}}
						</VChip>
					</template>

					<template #item.minAmount="{ item }">
						{{ item.raw.minAmount?.toLocaleString("tr-TR") }} ₺
					</template>

					<template #item.actions="{ item }">
						<div v-if="canManageBankAccounts">
						<VBtn
							icon
							variant="text"
							size="small"
							@click="openEditDialog(item.raw)"
						>
							<VIcon icon="tabler-edit" />
						</VBtn>
						<VBtn
							icon
							variant="text"
							size="small"
							color="error"
							@click="openDeleteDialog(item.raw)"
						>
							<VIcon icon="tabler-trash" />
						</VBtn>
						</div>
					</template>

					<template #no-data>
						<div class="text-center pa-4">
							{{ t("bankAccount.noData") }}
						</div>
					</template>
				</VDataTable>
			</VCardText>
		</VCard>

		<!-- Create/Edit Dialog -->
		<VDialog v-model="dialog" max-width="600px" persistent>
			<VCard>
				<VCardTitle>
					{{
						editMode
							? t("bankAccount.editAccount")
							: t("bankAccount.newAccount")
					}}
				</VCardTitle>
				<VCardText>
					<VRow>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.bankName"
								:label="t('bankAccount.bankName') + ' *'"
								variant="outlined"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.accountName"
								:label="t('bankAccount.accountName') + ' *'"
								variant="outlined"
							/>
						</VCol>
						<VCol cols="12">
							<VTextField
								v-model="form.iban"
								:label="t('bankAccount.iban') + ' *'"
								variant="outlined"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.accountNumber"
								:label="t('bankAccount.accountNumber')"
								variant="outlined"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VFileInput
								v-model="logoFile"
								:label="t('bankAccount.logo') + ' (Dosya Yükle)'"
								accept="image/*"
								prepend-icon="mdi-bank"
								variant="outlined"
								:disabled="!canManageBankAccounts"
								@change="uploadLogoFile"
								:loading="uploadingLogo"
							/>
							<div v-if="form.logo" class="d-flex align-center gap-2 mt-2">
								<VAvatar size="40" rounded>
									<VImg :src="form.logo" />
								</VAvatar>
								<VTextField
									v-model="form.logo"
									label="Logo URL"
									variant="outlined"
									readonly
									density="compact"
								/>
								<VBtn icon size="small" variant="text" color="error" @click="form.logo = null">
									<VIcon icon="mdi-close" />
								</VBtn>
							</div>
						</VCol>
						<VCol cols="12" md="4">
							<VTextField
								v-model.number="form.minAmount"
								:label="t('bankAccount.minAmount')"
								type="number"
								variant="outlined"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VTextField
								v-model.number="form.maxAmount"
								:label="t('bankAccount.maxAmount')"
								type="number"
								variant="outlined"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VTextField
								v-model.number="form.order"
								:label="t('bankAccount.order')"
								type="number"
								variant="outlined"
							/>
						</VCol>
						<VCol cols="12">
							<VTextarea
								v-model="form.note"
								:label="t('bankAccount.note')"
								variant="outlined"
								rows="2"
							/>
						</VCol>
						<VCol cols="12">
							<VSwitch
								v-model="form.active"
								:label="t('bankAccount.active')"
								color="primary"
							/>
						</VCol>
					</VRow>
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="dialog = false">{{
						t("cancel")
					}}</VBtn>
					<VBtn color="primary" :disabled="!canManageBankAccounts" @click="saveAccount">{{
						t("save")
					}}</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<!-- Delete Confirmation Dialog -->
		<VDialog v-model="deleteDialog" max-width="400px">
			<VCard>
				<VCardTitle>{{ t("bankAccount.deleteAccount") }}</VCardTitle>
				<VCardText>
					<strong>{{ selectedAccount?.bankName }}</strong>
					{{ t("bankAccount.deleteConfirm") }}
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="deleteDialog = false">{{
						t("cancel")
					}}</VBtn>
					<VBtn color="error" :disabled="!canManageBankAccounts" @click="deleteAccount">{{
						t("delete")
					}}</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</div>
</template>

<route lang="yaml">
meta:
  action: read
  subject: finance.bankAccounts
</route>
