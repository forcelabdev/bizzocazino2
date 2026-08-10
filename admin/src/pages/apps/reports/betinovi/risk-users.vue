<script setup>
import BetinoviReportPage from "@/components/betinovi/BetinoviReportPage.vue";
</script>

<template>
	<BetinoviReportPage
		report-type="risk-users"
		title="Riskli Kullanıcılar"
		description="Riskli kullanıcı raporlarını vendor, kullanıcı ve risk seviyesiyle takip edin."
	/>
</template>

<route lang="yaml">
meta:
  action: read
  subject: reports.betinovi
</route>