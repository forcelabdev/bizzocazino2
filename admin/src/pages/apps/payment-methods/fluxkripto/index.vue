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
	name: "FluxKripto",
	logo: "",
	minAmount: 100,
	maxAmount: 100000,
	currency: "TRY",
	apiUrl: "https://api.fluxkripto.com",
	siteUrl: "",
	apiKey: "",
	secretKey: "",
	apiKeyConfigured: false,
	secretKeyConfigured: false,
	callbackUrl: "",
	methods: {
		deposit: true,
		withdraw: true,
	},
	currencies: {
		trx: true,
		usdt: true,
	},
});

const callbackUrlPreview = computed(
	() => settings.value.callbackUrl || apiBaseUrl + "/payment/fluxkripto/callback",
);

const normalizeSettings = (value = {}) => ({
	isActive: value.isActive ?? false,
	name: value.name || "FluxKripto",
	logo: value.logo || "",
	minAmount: Number(value.minAmount ?? 100),
	maxAmount: Number(value.maxAmount ?? 100000),
	currency: "TRY",
	apiUrl: value.apiUrl || "https://api.fluxkripto.com",
	siteUrl: value.siteUrl || "",
	apiKey: "",
	secretKey: "",
	apiKeyConfigured: Boolean(value.apiKeyConfigured),
	secretKeyConfigured: Boolean(value.secretKeyConfigured),
	callbackUrl: value.callbackUrl || "",
	methods: {
		deposit: value.methods?.deposit ?? true,
		withdraw: value.methods?.withdraw ?? true,
	},
	currencies: {
		trx: value.currencies?.trx ?? true,
		usdt: value.currencies?.usdt ?? true,
	},
});

const copyPlaceholder = async (value) => {
	try {
		await navigator.clipboard.writeText(value);
	} catch (err) {
		console.error("Placeholder kopyalanamadı:", err);
	}
};

const saveSettings = async () => {
	if (!ensurePlatformUpdatePermission()) return;

	const { apiKeyConfigured, secretKeyConfigured, ...payload } = settings.value;
	delete payload.callbackUrl;
	const apiKeyWasEntered = Boolean(payload.apiKey?.trim());
	const secretKeyWasEntered = Boolean(payload.secretKey?.trim());

	try {
		loading.value = true;
		const response = await axios.put("/admin/fluxkripto/settings", payload);
		settings.value = normalizeSettings({
			...settings.value,
			...(response.data?.data || {}),
			apiKeyConfigured:
				response.data?.data?.apiKeyConfigured ?? (apiKeyConfigured || apiKeyWasEntered),
			secretKeyConfigured:
				response.data?.data?.secretKeyConfigured ??
				(secretKeyConfigured || secretKeyWasEntered),
		});
		alert("FluxKripto ayarları başarıyla kaydedildi!");
	} catch (error) {
		console.error("FluxKripto ayarları kaydedilirken hata:", error);
		alert(error?.response?.data?.error || "FluxKripto ayarları kaydedilemedi.");
	} finally {
		loading.value = false;
	}
};

const fetchSettings = async () => {
	try {
		const response = await axios.get("/admin/fluxkripto/settings");
		if (response.data?.success && response.data.data) {
			settings.value = normalizeSettings(response.data.data);
		}
	} catch (error) {
		console.error("FluxKripto ayarları yüklenirken hata:", error);
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
					<h1 class="payment-method-title">FluxKripto</h1>
					<p class="payment-method-subtitle">
						FluxKripto native kripto para ödeme sağlayıcı ayarlarını yönetin.
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
					<VAlert color="info" variant="tonal" icon="mdi-link-variant" class="mb-5">
						<div class="d-flex flex-wrap align-center justify-space-between ga-3">
							<div>
								<div class="font-weight-bold">Native callback adresi</div>
								<code>{{ callbackUrlPreview }}</code>
							</div>
							<VBtn variant="outlined" size="small" prepend-icon="mdi-content-copy" @click="copyPlaceholder(callbackUrlPreview)">
								Kopyala
							</VBtn>
						</div>
					</VAlert>

					<VCard variant="outlined" class="mb-5">
						<VCardTitle class="d-flex flex-wrap align-center justify-space-between ga-3">
							<span>Servis durumu ve limitler</span>
							<VChip :color="settings.isActive ? 'success' : 'secondary'" size="small" variant="tonal">
								{{ settings.isActive ? "Aktif" : "Kapalı" }}
							</VChip>
						</VCardTitle>
						<VCardText>
							<VRow>
								<VCol cols="12">
									<VSwitch v-model="settings.isActive" label="FluxKripto sağlayıcısını kullanıma aç" color="success" />
								</VCol>
								<VCol cols="12" md="6">
									<VTextField v-model="settings.name" label="Görünen isim" />
								</VCol>
								<VCol cols="12" md="6">
									<VTextField v-model="settings.logo" label="Logo URL" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model.number="settings.minAmount" label="Minimum tutar" type="number" :min="0" suffix="TRY" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model.number="settings.maxAmount" label="Maksimum tutar" type="number" :min="0" suffix="TRY" />
								</VCol>
								<VCol cols="12" md="4">
									<VTextField v-model="settings.currency" label="Muhasebe para birimi" readonly />
								</VCol>
							</VRow>
						</VCardText>
					</VCard>

					<VCard variant="outlined" class="mb-5">
						<VCardTitle>Native kanallar</VCardTitle>
						<VCardSubtitle>Hosted ödeme sayfası kullanılmaz.</VCardSubtitle>
						<VCardText>
							<VRow>
								<VCol cols="12" sm="6">
									<VSwitch v-model="settings.methods.deposit" label="Yatırım" color="success" />
								</VCol>
								<VCol cols="12" sm="6">
									<VSwitch v-model="settings.methods.withdraw" label="Çekim" color="warning" />
								</VCol>
								<VCol cols="12" sm="6">
									<VSwitch v-model="settings.currencies.trx" label="TRX" color="info" />
								</VCol>
								<VCol cols="12" sm="6">
									<VSwitch v-model="settings.currencies.usdt" label="USDT" color="info" />
								</VCol>
							</VRow>
						</VCardText>
					</VCard>

					<VCard variant="outlined">
						<VCardTitle>Bağlantı ve kimlik bilgileri</VCardTitle>
						<VCardText>
							<VRow>
								<VCol cols="12" md="6">
									<VTextField v-model="settings.apiUrl" label="API URL" placeholder="https://api.fluxkripto.com" />
								</VCol>
								<VCol cols="12" md="6">
									<VTextField v-model="settings.siteUrl" label="Site URL" placeholder="https://site.example" />
								</VCol>
								<VCol cols="12" md="6">
									<div class="d-flex align-center justify-space-between mb-2">
										<span class="text-body-2 font-weight-medium">API Key</span>
										<VChip :color="settings.apiKeyConfigured ? 'success' : 'warning'" size="x-small" variant="tonal">
											{{ settings.apiKeyConfigured ? "Yapılandırıldı" : "Eksik" }}
										</VChip>
									</div>
									<VTextField v-model="settings.apiKey" type="password" autocomplete="new-password" placeholder="Değiştirmek için yeni değer girin" hint="Boş bırakırsanız mevcut değer korunur." persistent-hint />
								</VCol>
								<VCol cols="12" md="6">
									<div class="d-flex align-center justify-space-between mb-2">
										<span class="text-body-2 font-weight-medium">Secret Key</span>
										<VChip :color="settings.secretKeyConfigured ? 'success' : 'warning'" size="x-small" variant="tonal">
											{{ settings.secretKeyConfigured ? "Yapılandırıldı" : "Eksik" }}
										</VChip>
									</div>
									<VTextField v-model="settings.secretKey" type="password" autocomplete="new-password" placeholder="Değiştirmek için yeni değer girin" hint="Boş bırakırsanız mevcut değer korunur." persistent-hint />
								</VCol>
								<VCol cols="12" class="d-flex justify-end">
									<VBtn color="primary" prepend-icon="mdi-content-save" :disabled="!canUpdatePlatform" :loading="loading" @click="saveSettings">
										FluxKripto ayarlarını kaydet
									</VBtn>
								</VCol>
							</VRow>
						</VCardText>
					</VCard>
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
