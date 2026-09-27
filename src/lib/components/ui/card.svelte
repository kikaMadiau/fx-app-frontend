<script lang="js">
	let { className = '', children } = $props();
</script>

<div class={`app-card card ${className}`}>
	{@render children?.()}
</div>

<style>
	.card {
		width: 100%;
		height: auto;
		box-sizing: border-box;
	}
</style>
