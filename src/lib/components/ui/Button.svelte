<script lang="js">
	let {
		className = 'app-button app-button-primary',
		children,
		type = 'button',
		...restProps
	} = $props();
</script>

<button class={className} {type} {...restProps}>
	{@render children?.()}
</button>
