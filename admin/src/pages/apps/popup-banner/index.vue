<script setup>
// 🚧 Pop-up Duyuru Banner — henüz geliştirilmedi. Bu sayfa, menüde yer tutucu
// (placeholder) olarak eklendi. Backend'de pop-up banner yönetimi endpoint'i
// hazır olduğunda burası gerçek formla değiştirilecek.
</script>

<template>
	<VRow>
		<VCol cols="12">
			<VCard>
				<VCardText class="d-flex flex-column align-center text-center py-16">
					<VIcon
						icon="tabler-photo-up"
						size="56"
						class="mb-4 text-disabled"
					/>
					<h4 class="text-h4 mb-2">Pop-up Duyuru Banner</h4>
					<p class="text-body-1 text-medium-emphasis mb-0" style="max-width: 480px;">
						Sitede açılışta gösterilen pop-up duyuru banner yönetimi
						özelliği yakında burada olacak. Bu sayfa şu an geliştirme
						aşamasındadır.
					</p>
					<VChip
						class="mt-4"
						color="warning"
						variant="tonal"
					>
						Yakında
					</VChip>
				</VCardText>
			</VCard>
		</VCol>
	</VRow>
</template>
