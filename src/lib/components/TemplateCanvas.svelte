<script lang="ts">
	import type { Template } from '$lib/types';
	import { renderTemplate, loadTemplateImages, type Loaded, type ImageMap } from '$lib/booth/compose';

	let {
		template,
		photos = [],
		filterId = 'none',
		class: klass = ''
	}: {
		template: Template;
		photos?: (Loaded | null)[];
		filterId?: string;
		class?: string;
	} = $props();

	let canvas: HTMLCanvasElement;
	let images = $state<ImageMap>(new Map());

	// Preload background/asset images whenever the set of image srcs changes.
	const imageKey = $derived(
		JSON.stringify([
			template.background.type === 'image' ? template.background.src : null,
			(template.assets ?? []).map((a) => a.src)
		])
	);
	$effect(() => {
		void imageKey;
		let cancelled = false;
		loadTemplateImages(template).then((map) => {
			if (!cancelled) images = map;
		});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!canvas) return;
		void template;
		void photos;
		void filterId;
		void images;
		renderTemplate(canvas, template, photos, filterId, images);
	});
</script>

<canvas
	bind:this={canvas}
	class={klass}
	style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:0.5rem;box-shadow:0 10px 40px rgba(0,0,0,0.5)"
></canvas>
