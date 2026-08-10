<script setup>
import BetinoviReportPage from "@/components/betinovi/BetinoviReportPage.vue";
</script>

<template>
	<BetinoviReportPage
		report-type="by-agent"
		title="Temsilciye göre"
		description="Temsilci bazlı Betinovi raporlarını tarih ve periyot filtresiyle görüntüleyin."
	/>
</template>

<route lang="yaml">
meta:
  action: read
  subject: reports.betinovi
</route>