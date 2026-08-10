<script setup>
import { useTheme } from "vuetify";
import miscMaskDark from "@images/pages/misc-mask-dark.png";
import miscMaskLight from "@images/pages/misc-mask-light.png";
import { useGenerateImageVariant } from "@core/composable/useGenerateImageVariant";

const siteName = "Bizzocazino";
const authThemeMask = useGenerateImageVariant(miscMaskLight, miscMaskDark);
const theme = useTheme();

// Get user info from localStorage
const userData = JSON.parse(localStorage.getItem("userData") || "{}");
const userName = userData.name || userData.username || "Kullanıcı";
</script>

<template>
	<div class="misc-wrapper">
		<div class="misc-center-content text-center mb-12">
			<!-- 👉 Welcome Icon -->
			<div class="mb-6">
				<VIcon icon="tabler-home-2" size="80" color="primary" />
			</div>

			<!-- 👉 Title -->
			<h2 class="text-h2 font-weight-bold mb-4">
				{{ siteName }} Yönetim Paneli'ne Hoş Geldin! 🎉
			</h2>

			<!-- 👉 Subtitle with user name -->
			<p class="text-body-1 text-medium-emphasis mb-6">
				Merhaba <strong>{{ userName }}</strong
				>, panele başarıyla giriş yaptın.
			</p>

			<!-- 👉 Info Card -->
			<VCard class="mx-auto" max-width="500" variant="outlined">
				<VCardText class="text-start">
					<div class="d-flex align-center mb-3">
						<VIcon
							icon="tabler-info-circle"
							color="info"
							class="me-2"
						/>
						<span class="text-body-1 font-weight-medium"
							>Bilgilendirme</span
						>
					</div>
					<p class="text-body-2 text-medium-emphasis mb-0">
						Sol menüden erişim yetkin olan sayfalara gidebilirsin.
						Eğer belirli bir sayfaya erişim ihtiyacın varsa, lütfen
						yöneticinle iletişime geç.
					</p>
				</VCardText>
			</VCard>

			<!-- 👉 Quick Stats (optional) -->
			<VRow class="mt-8 justify-center">
				<VCol cols="12" sm="4">
					<VCard variant="tonal" color="primary">
						<VCardText class="text-center py-4">
							<VIcon icon="tabler-clock" size="32" class="mb-2" />
							<div class="text-body-2">Giriş Saati</div>
							<div class="text-h6">
								{{
									new Date().toLocaleTimeString("tr-TR", {
										hour: "2-digit",
										minute: "2-digit",
									})
								}}
							</div>
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard variant="tonal" color="success">
						<VCardText class="text-center py-4">
							<VIcon
								icon="tabler-calendar"
								size="32"
								class="mb-2"
							/>
							<div class="text-body-2">Tarih</div>
							<div class="text-h6">
								{{ new Date().toLocaleDateString("tr-TR") }}
							</div>
						</VCardText>
					</VCard>
				</VCol>
			</VRow>
		</div>

		<VImg :src="authThemeMask" class="misc-footer-img d-none d-md-block" />
	</div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/misc.scss";
</style>

<route lang="yaml">
meta:
    layout: default
    action: read
    subject: Auth
</route>
