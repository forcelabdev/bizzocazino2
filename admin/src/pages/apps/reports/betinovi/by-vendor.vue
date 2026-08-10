<script setup>
import BetinoviReportPage from "@/components/betinovi/BetinoviReportPage.vue";
</script>

<template>
	<BetinoviReportPage
		report-type="by-vendor"
		title="Vendora göre"
		description="Vendor bazlı bahis, kazanç ve mutabakat verilerini inceleyin."
	/>
</template>

<route lang="yaml">
meta:
  action: read
  subject: reports.betinovi
</route>