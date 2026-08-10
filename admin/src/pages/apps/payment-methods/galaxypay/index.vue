<script setup>
import { ref, onMounted, computed } from "vue";
import axios from "@/plugins/axios";
import ability from "@/plugins/casl/ability";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const loading = ref(false);

const canUpdatePlatform = computed(
	() => ability.can("update", "platform") || ability.can("manage", "platform"),
);
const canReadPlatform = computed(
	() => ability.can("read", "platform") || ability.can("manage", "platform"),
);

const ensurePlatformUpdatePermission = () => {
	if (canUpdatePlatform.value) return true;
	alert("Bu işlem için yetkiniz yok.");
	return false;
};

const settings = ref({
	isActive: false,
	name: "GalaxyPay",
	logo: "",
	minAmount: 100,
	maxAmount: 100000,
	currency: "TRY",
	lang: "tr",
	apiId: "",
	apiKey: "",
	apiUrl: "https://galaxypay.dev",
	methods: {
		depositLobby: true,
		depositBankTransfer: true,
		depositPapara: true,
		withdrawBankTransfer: true,
		withdrawPapara: true,
	},
	returnUrlSuccess: "",
	returnUrlFail: "",
});

const callbackUrlPreview = computed(() => apiBaseUrl + "/payment/galaxypay/callback");

const saveSettings = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	try {
		loading.value = true;
		await axios.put("/admin/galaxypay/settings", settings.value);
		alert("GalaxyPay ayarları başarıyla kaydedildi!");
	} catch (error) {
		console.error("GalaxyPay ayarları kaydedilirken hata:", error);
		alert("GalaxyPay ayarları kaydedilirken bir hata oluştu!");
	} finally {
		loading.value = false;
	}
};

const fetchSettings = async () => {
	try {
		const response = await axios.get("/admin/galaxypay/settings");
		if (response.data.success && response.data.data) {
			settings.value = response.data.data;
		}
	} catch (error) {
		console.error("GalaxyPay ayarları yüklenirken hata:", error);
	}
};

onMounted(async () => {
	if (canReadPlatform.value) {
		await fetchSettings();
	}
});
</script>

<template>
	<div class="payment-method-page">
		<VCard class="payment-method-shell">
			<VCardText class="payment-method-header">
				<div>
					<div class="payment-method-eyebrow">Ödeme Yöntemi</div>
					<h1 class="payment-method-title">GalaxyPay</h1>
					<p class="payment-method-subtitle">
						GalaxyPay ödeme sağlayıcısı için API ve limit ayarlarını yönetin.
					</p>
				</div>
				<VChip
					:color="canUpdatePlatform ? 'success' : 'warning'"
					variant="tonal"
					size="small"
				>
					<VIcon
						:start="true"
						:icon="canUpdatePlatform ? 'mdi-shield-check' : 'mdi-lock-outline'"
					/>
					{{ canUpdatePlatform ? 'Düzenleme açık' : 'Salt okunur' }}
				</VChip>
			</VCardText>

			<VProgressLinear v-if="loading" indeterminate />
			<VDivider />

			<VCardText class="payment-method-body">
				<VContainer>
					<VAlert type="info" class="mb-4">
						<strong>GalaxyPay</strong> ödeme sistemi entegrasyonu.
						API ID ve API Key bilgilerinizi buradan yönetebilirsiniz.
						<br />
						<strong>Callback URL:</strong>
						<code>{{ callbackUrlPreview }}</code>
					</VAlert>
					<VRow>
						<VCol cols="12">
							<VSwitch
								v-model="settings.isActive"
								label="GalaxyPay Aktif"
								color="success"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="settings.name"
								label="Görünen İsim"
								placeholder="GalaxyPay"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="settings.logo"
								label="Logo URL"
								placeholder="https://example.com/logo.png"
							/>
						</VCol>
						<VCol cols="12" md="3">
							<VTextField
								v-model.number="settings.minAmount"
								label="Minimum Tutar"
								type="number"
								:min="0"
							/>
						</VCol>
						<VCol cols="12" md="3">
							<VTextField
								v-model.number="settings.maxAmount"
								label="Maksimum Tutar"
								type="number"
								:min="0"
							/>
						</VCol>
						<VCol cols="12" md="3">
							<VTextField
								v-model="settings.currency"
								label="Currency"
								placeholder="TRY"
							/>
						</VCol>
						<VCol cols="12" md="3">
							<VTextField
								v-model="settings.lang"
								label="Dil"
								placeholder="tr"
							/>
						</VCol>
						<VCol cols="12">
							<VDivider class="my-4" />
							<h3 class="mb-3">API Ayarları</h3>
						</VCol>
						<VCol cols="12" md="4">
							<VTextField
								v-model="settings.apiId"
								label="API ID"
								prepend-icon="mdi-identifier"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VTextField
								v-model="settings.apiKey"
								label="API Key"
								type="password"
								prepend-icon="mdi-key"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VTextField
								v-model="settings.apiUrl"
								label="API URL"
								placeholder="https://galaxypay.dev"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="settings.returnUrlSuccess"
								label="Başarılı Dönüş URL"
								placeholder="https://site.com/payment/success"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="settings.returnUrlFail"
								label="Başarısız Dönüş URL"
								placeholder="https://site.com/payment/fail"
							/>
						</VCol>
						<VCol cols="12">
							<VDivider class="my-4" />
							<h3 class="mb-3">Aktif Yöntemler</h3>
						</VCol>
						<VCol cols="12" md="4">
							<VSwitch
								v-model="settings.methods.depositLobby"
								label="Deposit Lobby"
								color="success"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VSwitch
								v-model="settings.methods.depositBankTransfer"
								label="Deposit Bank Transfer"
								color="success"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VSwitch
								v-model="settings.methods.depositPapara"
								label="Deposit Papara"
								color="success"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VSwitch
								v-model="settings.methods.withdrawBankTransfer"
								label="Withdraw Bank Transfer"
								color="warning"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VSwitch
								v-model="settings.methods.withdrawPapara"
								label="Withdraw Papara"
								color="warning"
							/>
						</VCol>
						<VCol cols="12">
							<VBtn
								color="primary"
								@click="saveSettings"
								:disabled="!canUpdatePlatform"
								:loading="loading"
							>
								GalaxyPay Ayarlarını Kaydet
							</VBtn>
						</VCol>
					</VRow>
				</VContainer>
			</VCardText>
		</VCard>
	</div>
</template>

<style lang="scss" scoped>
.payment-method-page {
	max-inline-size: 960px;
	margin-inline: auto;
}

.payment-method-shell {
	overflow: hidden;
}

.payment-method-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24px;
	padding: 28px 32px;
}

.payment-method-eyebrow {
	color: rgba(var(--v-theme-primary), 1);
	font-size: 0.75rem;
	font-weight: 700;
	text-transform: uppercase;
}

.payment-method-title {
	margin: 4px 0 8px;
	font-size: 1.75rem;
	font-weight: 700;
}

.payment-method-subtitle {
	max-inline-size: 640px;
	margin: 0;
	color: rgba(var(--v-theme-on-surface), 0.68);
}

.payment-method-body {
	padding: 28px 32px;
}

@media (max-width: 767px) {
	.payment-method-header,
	.payment-method-body {
		padding: 20px;
	}
}
</style>
