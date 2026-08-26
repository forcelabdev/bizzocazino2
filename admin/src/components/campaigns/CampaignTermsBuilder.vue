<script setup>
// 🎯 Kampanya "Şartlar ve Koşullar" alanı için basit içerik oluşturucu.
// Amaç: yöneticilerin artık ham HTML yazmak zorunda kalmadan, sadece başlık +
// kural listesi (düz metin) girerek aynı stilize HTML çıktısını üretebilmesi.
// Round-trip (düzenlerken geri okuma) için üretilen HTML'in başına, tarayıcıda
// görünmeyen bir HTML yorum satırı içinde base64 kodlu yapılandırılmış veri
// gömülür: <!--TERMS_BUILDER_DATA:...-->. Bu satır kullanıcıya asla gösterilmez.
// Mevcut kampanyalarda elle yazılmış özel HTML varsa (marker yoksa) bileşen
// otomatik olarak "HTML Kodu" moduna geçer, içerik kaybı yaşanmaz.

const props = defineProps({
	modelValue: {
		type: String,
		default: "",
	},
})

const emit = defineEmits(["update:modelValue"])

const STANDARD_PROVIDERS = [
	"Apparat", "Bgaming", "Novomatic", "Betsoft", "Bfgames", "Endorphina",
	"KAGaming", "Red Tiger", "Spinomenal", "Yggdrasil", "Only Play", "7Mojos",
	"SmartSoft", "TaDa Gaming", "Wazdan", "RedStone", "PopiPlay", "Platipus",
	"Pixmove", "OneGame", "Microgaming", "Turbo Games", "TVBet", "Ela Games",
	"BigPot", "Aviatrix", "AmigoGaming", "1x2Gaming", "Big Time Gaming", "Fazi",
	"JetX", "Iron Dog Studios",
]

const DEFAULT_HEADING = "ŞARTLAR VE KOŞULLAR (18+)"
const DATA_MARKER_RE = /^<!--TERMS_BUILDER_DATA:([^>]*)-->/

const defaultRule = () => ({
	text: "",
	highlight: false,
	providers: false,
	providerList: [...STANDARD_PROVIDERS],
})

// Sık kullanılan 7 kural için hazır şablon — sabit yapıyı tekrar tekrar
// yazmak zorunda kalmasınlar diye tek tıkla doldurulabilir.
const STANDARD_TEMPLATE_RULES = () => [
	{ ...defaultRule(), text: "Bu bonustan faydalanabilmek için gereken minimum yatırım tutarı 1.000₺'dir." },
	{ ...defaultRule(), text: "Bonus yalnızca slot alanında geçerlidir." },
	{ ...defaultRule(), text: "Herhangi bir çekim işlemi gerçekleştirmeden önce yatırım + bonus tutarının 1 katı çevrim yapılmalıdır." },
	{ ...defaultRule(), text: "Bonus, aktive edildikten sonraki 3 gün boyunca geçerlidir." },
	{
		...defaultRule(),
		text: "Aşağıdaki sağlayıcılardaki çevrimler bonus çevrimine katkı sağlamaz. Bonus çevrimi esnasında aşağıdaki sağlayıcılarda katılım sağlanması durumunda bakiye düzenlemesi yapılacaktır.",
		providers: true,
	},
	{ ...defaultRule(), text: "Bizzo, önceden haber vermeksizin herhangi bir promosyonun kurallarını değiştirme, promosyonu tamamen iptal etme hakkını saklı tutar." },
	{ ...defaultRule(), text: "Tüm bonuslarda Bizzo Bonus Şartları geçerlidir." },
]

const heading = ref(DEFAULT_HEADING)
const rules = ref([defaultRule()])
const mode = ref("simple") // 'simple' | 'html'
const rawHtml = ref("")
const isHydrating = ref(false)
const generatedHtml = ref("")

const escapeHtml = (str) =>
	String(str || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")

// UTF-8 güvenli base64 encode/decode (Türkçe karakterler için)
const encodeData = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
const decodeData = (str) => JSON.parse(decodeURIComponent(escape(atob(str))))

const buildHtml = () => {
	const data = { heading: heading.value, rules: rules.value }
	const marker = `<!--TERMS_BUILDER_DATA:${encodeData(data)}-->`

	const rulesHtml = rules.value
		.filter((r) => r.text.trim() || r.providers)
		.map((r) => {
			const style = r.highlight
				? ' style="display:list-item; margin-bottom:12px; background-color: rgba(246, 201, 69, 0.08); padding: 10px; border-left: 3px solid #f6c945; border-radius: 4px;"'
				: ' style="display:list-item; margin-bottom:12px;"'

			let inner = escapeHtml(r.text.trim()).replace(/\n/g, "<br>")

			if (r.providers && r.providerList.length) {
				const items = r.providerList
					.map((p) => `            <li>${escapeHtml(p)}</li>`)
					.join("\n")
				inner += `\n        <br><br>\n        <strong style="color:#f6c945;">Geçersiz Sağlayıcılar:</strong>\n        <ul style="list-style:disc; padding-left:20px; margin-top:10px; column-count: 2; column-gap: 20px;">\n${items}\n        </ul>`
			}

			return `    <li${style}>\n        ${inner}\n    </li>`
		})
		.join("\n\n")

	return `${marker}\n<h3 style="color:#f6c945; margin-bottom:15px; font-weight:bold; font-size:18px;">\n    ${escapeHtml(heading.value)}\n</h3>\n\n<ol style="list-style: decimal !important; padding-left:25px; margin:0; color:#ffffff; line-height:1.8;">\n${rulesHtml}\n</ol>`
}

const hydrateFromHtml = (html) => {
	isHydrating.value = true

	const match = DATA_MARKER_RE.exec(html || "")
	let parsed = null

	if (match) {
		try {
			parsed = decodeData(match[1])
		} catch {
			parsed = null
		}
	}

	if (parsed) {
		heading.value = parsed.heading || DEFAULT_HEADING
		rules.value = (parsed.rules || []).map((r) => ({
			text: r.text || "",
			highlight: !!r.highlight,
			providers: !!r.providers,
			providerList:
				Array.isArray(r.providerList) && r.providerList.length
					? r.providerList
					: [...STANDARD_PROVIDERS],
		}))
		if (!rules.value.length) rules.value = [defaultRule()]
		mode.value = "simple"
		rawHtml.value = html || ""
	} else {
		// Marker yok: elle yazılmış özel HTML veya boş alan. Veri kaybını
		// önlemek için HTML moduna geç, ancak boşsa basit modda başlat.
		mode.value = html && html.trim() ? "html" : "simple"
		rawHtml.value = html || ""
	}

	generatedHtml.value = mode.value === "simple" ? buildHtml() : rawHtml.value
	isHydrating.value = false
}

hydrateFromHtml(props.modelValue)

watch(
	() => props.modelValue,
	(val) => {
		if (val === generatedHtml.value) return // kendi ürettiğimiz güncelleme, döngüyü önle
		hydrateFromHtml(val)
	},
)

watch(
	[heading, rules],
	() => {
		if (isHydrating.value || mode.value !== "simple") return
		generatedHtml.value = buildHtml()
		emit("update:modelValue", generatedHtml.value)
	},
	{ deep: true },
)

watch(rawHtml, (val) => {
	if (isHydrating.value || mode.value !== "html") return
	generatedHtml.value = val
	emit("update:modelValue", val)
})

const hasCustomRawHtml = computed(
	() => rawHtml.value.trim().length > 0 && !DATA_MARKER_RE.test(rawHtml.value),
)

const setMode = (value) => {
	if (value === mode.value) return

	if (value === "simple" && hasCustomRawHtml.value) {
		const confirmed = confirm(
			"Basit moda geçerseniz mevcut özel HTML içeriği sıfırlanıp form ile değiştirilecektir. Devam edilsin mi?",
		)
		if (!confirmed) return
		heading.value = DEFAULT_HEADING
		rules.value = [defaultRule()]
	}

	mode.value = value
	generatedHtml.value = mode.value === "simple" ? buildHtml() : rawHtml.value
	emit("update:modelValue", generatedHtml.value)
}

const addRule = () => {
	rules.value.push(defaultRule())
}

const removeRule = (index) => {
	rules.value.splice(index, 1)
	if (!rules.value.length) rules.value.push(defaultRule())
}

const moveRule = (index, dir) => {
	const target = index + dir
	if (target < 0 || target >= rules.value.length) return
	const arr = [...rules.value]
	;[arr[index], arr[target]] = [arr[target], arr[index]]
	rules.value = arr
}

const toggleProviders = (rule, value) => {
	rule.providers = value
	if (rule.providers && !rule.providerList.length) {
		rule.providerList = [...STANDARD_PROVIDERS]
	}
}

const resetProviderList = (rule) => {
	rule.providerList = [...STANDARD_PROVIDERS]
}

const loadStandardTemplate = () => {
	if (
		rules.value.some((r) => r.text.trim()) &&
		!confirm("Mevcut kurallar, standart şablon ile değiştirilecektir. Devam edilsin mi?")
	) {
		return
	}
	heading.value = DEFAULT_HEADING
	rules.value = STANDARD_TEMPLATE_RULES()
}

const previewHtml = computed(() =>
	mode.value === "simple" ? buildHtml() : rawHtml.value,
)
</script>

<template>
	<div>
		<div class="d-flex flex-wrap justify-space-between align-center mb-3 gap-2">
			<span class="text-subtitle-1">Şartlar ve Koşullar İçeriği</span>
			<div class="d-flex align-center gap-2">
				<VBtn
					v-if="mode === 'simple'"
					size="small"
					variant="text"
					prepend-icon="tabler-template"
					@click="loadStandardTemplate"
				>
					Standart Şablonu Yükle
				</VBtn>
				<VBtnToggle
					:model-value="mode"
					density="compact"
					mandatory
					color="primary"
					@update:model-value="setMode"
				>
					<VBtn value="simple" size="small">
						<VIcon icon="tabler-forms" start size="16" />
						Basit Mod
					</VBtn>
					<VBtn value="html" size="small">
						<VIcon icon="tabler-code" start size="16" />
						HTML Kodu
					</VBtn>
				</VBtnToggle>
			</div>
		</div>

		<!-- Basit Mod -->
		<div v-if="mode === 'simple'">
			<AppTextField
				v-model="heading"
				label="Başlık"
				density="compact"
				class="mb-4"
			/>

			<VCard
				v-for="(rule, index) in rules"
				:key="index"
				variant="tonal"
				class="mb-3"
			>
				<VCardText>
					<div class="d-flex align-center gap-2 mb-2">
						<VChip size="small" color="primary" label>{{ index + 1 }}</VChip>
						<VSpacer />
						<IconBtn size="small" :disabled="index === 0" @click="moveRule(index, -1)">
							<VIcon icon="tabler-arrow-up" size="18" />
						</IconBtn>
						<IconBtn size="small" :disabled="index === rules.length - 1" @click="moveRule(index, 1)">
							<VIcon icon="tabler-arrow-down" size="18" />
						</IconBtn>
						<IconBtn size="small" color="error" @click="removeRule(index)">
							<VIcon icon="tabler-trash" size="18" />
						</IconBtn>
					</div>

					<VTextarea
						v-model="rule.text"
						label="Kural metni"
						placeholder="Örn: Bu bonustan faydalanabilmek için gereken minimum yatırım tutarı 1.000₺'dir."
						density="compact"
						rows="2"
						auto-grow
						hide-details="auto"
					/>

					<div class="d-flex flex-wrap gap-4 mt-3">
						<VSwitch
							v-model="rule.highlight"
							label="Vurgulanmış kutu yap"
							density="compact"
							color="primary"
							hide-details
						/>
						<VSwitch
							:model-value="rule.providers"
							label="Geçersiz sağlayıcı listesi ekle"
							density="compact"
							color="primary"
							hide-details
							@update:model-value="(v) => toggleProviders(rule, v)"
						/>
					</div>

					<div v-if="rule.providers" class="mt-3">
						<div class="d-flex justify-space-between align-center mb-1">
							<span class="text-caption text-medium-emphasis">Geçersiz Sağlayıcılar</span>
							<VBtn size="x-small" variant="text" @click="resetProviderList(rule)">
								Standart Listeyi Yükle
							</VBtn>
						</div>
						<VCombobox
							v-model="rule.providerList"
							:items="STANDARD_PROVIDERS"
							multiple
							chips
							closable-chips
							density="compact"
							hide-details
							placeholder="Sağlayıcı ekle..."
						/>
					</div>
				</VCardText>
			</VCard>

			<VBtn variant="tonal" prepend-icon="tabler-plus" @click="addRule">
				Kural Ekle
			</VBtn>
		</div>

		<!-- HTML Mod -->
		<VTextarea
			v-else
			v-model="rawHtml"
			label="Şartlar ve Koşullar (HTML)"
			hint="Gelişmiş kullanım için doğrudan HTML yazabilirsiniz. Kullanıcıya almadan önce gösterilir."
			persistent-hint
			rows="6"
		/>

		<!-- Önizleme -->
		<div class="mt-4">
			<div class="text-caption text-medium-emphasis mb-2">Önizleme</div>
			<div class="terms-preview" v-html="previewHtml" />
		</div>
	</div>
</template>

<style scoped>
.terms-preview {
	background-color: #14151a;
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 8px;
	padding: 20px;
}
</style>
