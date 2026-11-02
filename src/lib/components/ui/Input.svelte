<script lang="js">
	let {
		className = 'app-input',
		inputType = 'text',
		type = inputType,
		value = $bindable(''),
		...restProps
	} = $props();
</script>

<input class={className} {type} bind:value {...restProps} />

<style>
	input {
		box-sizing: border-box;
	}
</style>
