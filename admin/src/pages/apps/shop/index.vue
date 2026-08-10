<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const BASE_URL = import.meta.env.VITE_API_BASE_URL
const isDrawerOpen = ref(false)
const isSaving = ref(false)
const items = ref([])
const refForm = ref()
const formValid = ref(false)
const searchQuery = ref('')

const defaultItem = () => ({
	_id: null,
	title: '',
	description: '',
	banner: null,
	bannerUrl: '',
	coinCost: 0,
	rewardAmount: 0,
	isActive: true,
})

const itemToEdit = ref(defaultItem())

const headers = computed(() => [
	{ title: t('shop.banner'), key: 'banner' },
	{ title: t('shop.title'), key: 'title' },
	{ title: t('shop.coinCost'), key: 'coinCost' },
	{ title: t('shop.rewardAmount'), key: 'rewardAmount' },
	{ title: t('shop.status'), key: 'isActive' },
	{ title: t('actions'), key: 'actions', sortable: false },
])

const fetchItems = async () => {
	try {
		const res = await axios.get('/admin/shop-items')
		items.value = res.data.data || []
	} catch (error) {
		console.error('Shop items fetch error:', error)
	}
}

const filteredItems = computed(() => {
	const keyword = searchQuery.value.trim().toLowerCase()
	if (!keyword)
		return items.value

	return items.value.filter(item =>
		[item.title, item.description]
			.filter(Boolean)
			.some(value => value.toLowerCase().includes(keyword)),
	)
})

const openDrawer = item => {
	itemToEdit.value = item
		? {
				_id: item._id,
				title: item.title,
				description: item.description || '',
				banner: null,
				bannerUrl: item.banner,
				coinCost: item.coinCost,
				rewardAmount: item.rewardAmount,
				isActive: item.isActive !== false,
			}
		: defaultItem()

	isDrawerOpen.value = true
}

const closeDrawer = () => {
	isDrawerOpen.value = false
	nextTick(() => {
		itemToEdit.value = defaultItem()
		refForm.value?.resetValidation()
	})
}

const buildFormData = () => {
	const formData = new FormData()
	formData.append('title', itemToEdit.value.title)
	formData.append('description', itemToEdit.value.description || '')
	formData.append('coinCost', itemToEdit.value.coinCost)
	formData.append('rewardAmount', itemToEdit.value.rewardAmount)
	formData.append('isActive', itemToEdit.value.isActive)

	if (itemToEdit.value.banner instanceof File)
		formData.append('banner', itemToEdit.value.banner)

	return formData
}

const onSubmit = async () => {
	const validation = await refForm.value?.validate()
	if (!validation?.valid)
		return

	isSaving.value = true
	try {
		const payload = buildFormData()
		if (itemToEdit.value._id)
			await axios.put(`/admin/shop-items/${itemToEdit.value._id}`, payload)
		else
			await axios.post('/admin/shop-items', payload)

		closeDrawer()
		await fetchItems()
	} catch (error) {
		console.error('Shop item save error:', error)
	} finally {
		isSaving.value = false
	}
}

const deleteItem = async id => {
	if (!id)
		return

	try {
		await axios.delete(`/admin/shop-items/${id}`)
		await fetchItems()
	} catch (error) {
		console.error('Shop item delete error:', error)
	}
}

onMounted(fetchItems)
</script>

<template>
	<section>
		<VCard class="mb-6 shop-hero-card">
			<VCardText class="d-flex flex-column flex-md-row justify-space-between gap-6 align-md-center">
				<div>
					<p class="text-sm text-uppercase text-disabled mb-2">
						{{ t('shop.managementEyebrow') }}
					</p>
					<h2 class="text-h3 mb-2">{{ t('shop.management') }}</h2>
					<p class="text-body-1 text-medium-emphasis mb-0 shop-hero-copy">
						{{ t('shop.managementDescription') }}
					</p>
				</div>

				<div class="d-flex flex-column flex-sm-row gap-3 align-stretch align-sm-center">
					<AppTextField
						v-model="searchQuery"
						:label="t('shop.search')"
						prepend-inner-icon="tabler-search"
						clearable
					/>
					<VBtn color="primary" size="large" prepend-icon="tabler-plus" @click="() => openDrawer()">
						{{ t('shop.addNew') }}
					</VBtn>
				</div>
			</VCardText>
		</VCard>

		<VCard>
			<VDataTable :items="filteredItems" :headers="headers">
				<template #item.banner="{ item }">
					<VImg
						v-if="item.raw.banner"
						:src="item.raw.banner.startsWith('/') ? `${BASE_URL}${item.raw.banner}` : item.raw.banner"
						max-width="148"
						height="76"
						cover
						class="rounded-lg border-sm"
					/>
				</template>

				<template #item.coinCost="{ item }">
					<VChip color="warning" variant="tonal">
						{{ item.raw.coinCost }} {{ t('shop.coinUnit') }}
					</VChip>
				</template>

				<template #item.rewardAmount="{ item }">
					<VChip color="success" variant="tonal">
						{{ item.raw.rewardAmount }} TRY
					</VChip>
				</template>

				<template #item.isActive="{ item }">
					<VChip :color="item.raw.isActive ? 'success' : 'secondary'">
						{{ item.raw.isActive ? t('shop.active') : t('shop.inactive') }}
					</VChip>
				</template>

				<template #item.actions="{ item }">
					<IconBtn @click="() => openDrawer(item.raw)">
						<VIcon icon="tabler-edit" />
					</IconBtn>
					<IconBtn @click="() => deleteItem(item.raw._id)">
						<VIcon icon="tabler-trash" />
					</IconBtn>
				</template>
			</VDataTable>
		</VCard>

		<VNavigationDrawer
			v-model="isDrawerOpen"
			temporary
			location="end"
			width="440"
			class="scrollable-content"
		>
			<AppDrawerHeaderSection :title="t('shop.drawerTitle')" @cancel="closeDrawer" />
			<PerfectScrollbar :options="{ wheelPropagation: false }">
				<VCard flat>
					<VCardText>
						<VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
							<VRow>
								<VCol cols="12">
									<AppTextField
										v-model="itemToEdit.title"
										:label="t('shop.title')"
										:rules="[requiredValidator]"
									/>
								</VCol>
								<VCol cols="12">
									<VTextarea
										v-model="itemToEdit.description"
										:label="t('shop.description')"
										auto-grow
										rows="4"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<AppTextField
										v-model.number="itemToEdit.coinCost"
										:label="t('shop.coinCost')"
										type="number"
										min="0"
									/>
								</VCol>
								<VCol cols="12" md="6">
									<AppTextField
										v-model.number="itemToEdit.rewardAmount"
										:label="t('shop.rewardAmount')"
										type="number"
										min="0"
									/>
								</VCol>
								<VCol cols="12">
									<AppSwitch
										v-model="itemToEdit.isActive"
										:label="t('shop.activeToggle')"
									/>
								</VCol>
								<VCol cols="12">
									<VFileInput
										:label="t('shop.banner')"
										accept="image/*"
										@change="e => itemToEdit.banner = e.target.files[0]"
									/>
								</VCol>
								<VCol v-if="itemToEdit.bannerUrl" cols="12">
									<VImg
										:src="itemToEdit.bannerUrl.startsWith('/') ? `${BASE_URL}${itemToEdit.bannerUrl}` : itemToEdit.bannerUrl"
										height="160"
										cover
										class="rounded-lg border-sm"
									/>
								</VCol>
								<VCol cols="12" class="d-flex justify-end gap-3">
									<VBtn type="submit" :loading="isSaving">
										{{ t('shop.save') }}
									</VBtn>
									<VBtn variant="tonal" color="secondary" @click="closeDrawer">
										{{ t('shop.cancel') }}
									</VBtn>
								</VCol>
							</VRow>
						</VForm>
					</VCardText>
				</VCard>
			</PerfectScrollbar>
		</VNavigationDrawer>
	</section>
</template>

<style scoped>
.scrollable-content {
	max-block-size: 100vh;
}

.shop-hero-card {
	background:
		radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.12), transparent 42%),
		linear-gradient(135deg, rgba(var(--v-theme-surface), 1) 0%, rgba(var(--v-theme-surface), 0.92) 100%);
}

.shop-hero-copy {
	max-inline-size: 56ch;
}
</style>
