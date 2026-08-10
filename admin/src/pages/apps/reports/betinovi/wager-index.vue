<script setup>
import BetinoviReportPage from "@/components/betinovi/BetinoviReportPage.vue";
</script>

<template>
	<BetinoviReportPage
		report-type="wager-index"
		title="Bahis indeksine göre"
		description="Wager ID başlangıcına göre Betinovi bahis kayıtlarını listeleyin."
	/>
</template>

<route lang="yaml">
meta:
  action: read
  subject: reports.betinovi
</route>