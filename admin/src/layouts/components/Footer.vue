<script setup>
import logo from "@images/logo.svg?raw";
</script>

<template>
	<div class="h-100 d-flex align-center justify-space-between">
		<span class="d-flex align-center">
			&copy;
			{{ new Date().getFullYear() }}
			Made With
			<span
				class="footer-logo mx-1"
				v-html="logo"
			/>
			Forcelab
		</span>
	</div>
</template>

<style lang="scss" scoped>
	.footer-logo {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		block-size: 1.25rem;
		inline-size: 1.25rem;
		line-height: 0;

		:deep(svg) {
			block-size: 100%;
			inline-size: 100%;
		}
	}
</style>
