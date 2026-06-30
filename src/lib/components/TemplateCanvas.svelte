<script lang="ts">
	import type { Template } from '$lib/types';
	import { renderTemplate } from '$lib/booth/compose';

	type Photo = (CanvasImageSource & { width: number; height: number }) | null;

	let {
		template,
		photos = [],
		filterId = 'none',
		class: klass = ''
	}: {
		template: Template;
		photos?: Photo[];
		filterId?: string;
		class?: string;
	} = $props();

	let canvas: HTMLCanvasElement;

	$effect(() => {
		if (!canvas) return;
		// touch reactive deps so re-render happens on change
		void template;
		void photos;
		void filterId;
		renderTemplate(canvas, template, photos, filterId);
	});
</script>

<canvas
	bind:this={canvas}
	class={klass}
	style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:0.5rem;box-shadow:0 10px 40px rgba(0,0,0,0.5)"
></canvas>
