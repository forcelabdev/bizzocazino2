<script setup>
import BetinoviReportPage from "@/components/betinovi/BetinoviReportPage.vue";
</script>

<template>
	<BetinoviReportPage
		report-type="settlement"
		title="Mutabakat"
		description="Forcelab mutabakat kayıtlarını temsilci, vendor, kullanıcı ve oyun bazında filtreleyin."
	/>
</template>

<route lang="yaml">
meta:
  action: read
  subject: reports.betinovi
</route>
