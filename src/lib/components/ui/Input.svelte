<script lang="js">
	let { className = 'app-input', inputType = 'text', type = inputType, ...restProps } = $props();
</script>

<input class={className} {type} {...restProps} />

<style>
	input {
		box-sizing: border-box;
	}
</style>
