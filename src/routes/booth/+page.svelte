<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import type { Template } from '$lib/types';
	import { createCaptureSource, type CaptureSource } from '$lib/booth/capture';
	import { loadImage, renderTemplate, loadTemplateImages } from '$lib/booth/compose';
	import { FILTERS } from '$lib/booth/filters';
	import TemplateCanvas from '$lib/components/TemplateCanvas.svelte';

	type Bitmap = ImageBitmap;
	type Step = 'pick' | 'capture' | 'edit' | 'printing' | 'done';

	let step = $state<Step>('pick');
	let templates = $state<Template[]>([]);
	let selected = $state<Template | null>(null);

	// capture state
	let source: CaptureSource | null = null;
	let video = $state<HTMLVideoElement | null>(null);
	let cameraError = $state<string | null>(null);
	let photos = $state<(Bitmap | null)[]>([]);
	let current = $state(0); // slot being (re)taken
	let countdown = $state(0); // 0 = idle
	let flashing = $state(false);
	let busy = $state(false);

	// edit state
	let filterId = $state('none');

	// print state
	let printers = $state<{ name: string; enabled: boolean }[]>([]);
	let printer = $state('');
	let copies = $state(1);
	let printError = $state<string | null>(null);

	const allCaptured = $derived(
		!!selected && photos.length === selected.slots.length && photos.every((p) => p)
	);

	// ---- load templates on mount ----
	$effect(() => {
		fetch('/api/templates')
			.then((r) => r.json())
			.then((t: Template[]) => (templates = t))
			.catch(() => (templates = []));
	});

	async function pick(t: Template) {
		selected = t;
		photos = new Array(t.slots.length).fill(null);
		current = 0;
		filterId = 'none';
		step = 'capture';
		await startCamera();
	}

	async function startCamera() {
		cameraError = null;
		try {
			source = createCaptureSource('webcam');
			await source.start();
			// wait a tick for the <video> to mount, then attach
			queueMicrotask(() => {
				if (video && source) source.attach(video);
			});
		} catch (e) {
			cameraError = e instanceof Error ? e.message : 'Could not access camera';
		}
	}

	function stopCamera() {
		source?.stop();
		source = null;
	}

	async function snap() {
		if (!source || busy || countdown > 0) return;
		busy = true;
		// 3-2-1 countdown
		for (let n = 3; n >= 1; n--) {
			countdown = n;
			await wait(800);
		}
		countdown = 0;
		flashing = true;
		try {
			const dataUrl = await source.capture();
			const bmp = await loadImage(dataUrl);
			const next = [...photos];
			next[current] = bmp;
			photos = next;
			// advance to next empty slot, if any
			const nextEmpty = photos.findIndex((p, i) => i > current && !p);
			if (nextEmpty !== -1) current = nextEmpty;
			else {
				const anyEmpty = photos.findIndex((p) => !p);
				if (anyEmpty !== -1) current = anyEmpty;
			}
		} catch (e) {
			cameraError = e instanceof Error ? e.message : 'Capture failed';
		} finally {
			setTimeout(() => (flashing = false), 180);
			busy = false;
		}
	}

	function retake(i: number) {
		current = i;
		const next = [...photos];
		next[i] = null;
		photos = next;
	}

	function toEdit() {
		stopCamera();
		step = 'edit';
		loadPrinters();
	}

	function backToCapture() {
		step = 'capture';
		startCamera();
	}

	async function loadPrinters() {
		try {
			const list = await fetch('/api/printers').then((r) => r.json());
			printers = list;
			printer = list.find((p: { enabled: boolean }) => p.enabled)?.name ?? list[0]?.name ?? '';
		} catch {
			printers = [];
		}
	}

	async function composeDataUrl(): Promise<string> {
		if (!selected) throw new Error('no template');
		const images = await loadTemplateImages(selected);
		const canvas = document.createElement('canvas');
		renderTemplate(canvas, selected, photos, filterId, images);
		return canvas.toDataURL('image/jpeg', 0.95);
	}

	async function doPrint() {
		if (!selected) return;
		printError = null;
		step = 'printing';
		try {
			const dataUrl = await composeDataUrl();
			const res = await fetch('/api/print', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					dataUrl,
					printer,
					copies,
					name: selected.name,
					print: !!printer
				})
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || `print failed (${res.status})`);
			}
			step = 'done';
			autoReturn();
		} catch (e) {
			printError = e instanceof Error ? e.message : 'Print failed';
			step = 'edit';
		}
	}

	let returnTimer: ReturnType<typeof setTimeout>;
	function autoReturn() {
		clearTimeout(returnTimer);
		returnTimer = setTimeout(() => goto('/'), 20000);
	}

	function startOver() {
		clearTimeout(returnTimer);
		photos = [];
		selected = null;
		step = 'pick';
	}

	function wait(ms: number) {
		return new Promise((r) => setTimeout(r, ms));
	}

	onDestroy(() => {
		stopCamera();
		clearTimeout(returnTimer);
	});
</script>

<div class="relative flex h-screen w-screen flex-col overflow-hidden">
	<!-- top bar -->
	<header class="flex items-center justify-between px-8 py-4">
		<button class="text-slate-400 hover:text-white" onclick={() => goto('/')}>← Home</button>
		<h2 class="text-xl font-semibold tracking-wide text-slate-200">
			{#if selected}{selected.name}{:else}Choose a layout{/if}
		</h2>
		<div class="w-16"></div>
	</header>

	<!-- ============ STEP: pick ============ -->
	{#if step === 'pick'}
		<div class="flex flex-1 items-center justify-center overflow-auto p-8">
			{#if templates.length === 0}
				<p class="text-slate-400">No templates yet. Ask Kim to create one in the Designer.</p>
			{:else}
				<div class="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
					{#each templates as t (t.id)}
						<button
							class="group flex flex-col items-center gap-3 rounded-3xl bg-white/5 p-5 transition hover:bg-white/10 active:scale-95"
							onclick={() => pick(t)}
						>
							<div class="flex h-64 w-48 items-center justify-center">
								<TemplateCanvas template={t} />
							</div>
							<span class="text-lg font-medium text-slate-200">{t.name}</span>
							<span class="text-sm text-slate-400">{t.slots.length} photo{t.slots.length > 1 ? 's' : ''}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- ============ STEP: capture ============ -->
	{#if step === 'capture' && selected}
		<div class="flex flex-1 gap-6 overflow-hidden p-6">
			<!-- live preview -->
			<div class="relative flex flex-1 items-center justify-center">
				{#if cameraError}
					<div class="max-w-md rounded-2xl bg-red-500/10 p-8 text-center text-red-300">
						<p class="mb-4 text-lg">📷 {cameraError}</p>
						<button class="btn bg-white/10 text-base" onclick={startCamera}>Try again</button>
					</div>
				{:else}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						bind:this={video}
						autoplay
						playsinline
						muted
						class="max-h-full max-w-full rounded-2xl bg-black shadow-2xl"
						style="transform:scaleX(-1)"
					></video>

					{#if countdown > 0}
						<div class="absolute inset-0 flex items-center justify-center">
							<span class="text-[12rem] font-black text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
								>{countdown}</span
							>
						</div>
					{/if}
					{#if flashing}
						<div class="absolute inset-0 bg-white"></div>
					{/if}
				{/if}
			</div>

			<!-- side: progress + controls -->
			<div class="flex w-72 flex-col">
				<p class="mb-2 text-center text-lg text-slate-300">
					Photo {Math.min(current + 1, selected.slots.length)} of {selected.slots.length}
				</p>
				<div class="flex flex-1 flex-col gap-3 overflow-auto">
					{#each selected.slots as _slot, i (i)}
						<button
							class="flex h-24 items-center justify-center rounded-xl border-2 {i === current
								? 'border-sky-400'
								: 'border-white/10'} bg-white/5 text-slate-400"
							onclick={() => retake(i)}
						>
							{#if photos[i]}
								<span class="text-sm">✓ Photo {i + 1} — tap to retake</span>
							{:else}
								<span class="text-sm">Photo {i + 1}</span>
							{/if}
						</button>
					{/each}
				</div>

				{#if !cameraError}
					<button
						class="btn mt-4 bg-gradient-to-r from-fuchsia-500 to-sky-500 text-white disabled:opacity-40"
						onclick={snap}
						disabled={busy}
					>
						{busy ? '…' : '📸 Capture'}
					</button>
				{/if}
				<button
					class="btn mt-3 bg-emerald-500 text-white disabled:opacity-30"
					onclick={toEdit}
					disabled={!allCaptured}
				>
					Continue →
				</button>
			</div>
		</div>
	{/if}

	<!-- ============ STEP: edit ============ -->
	{#if step === 'edit' && selected}
		<div class="flex flex-1 gap-6 overflow-hidden p-6">
			<div class="flex flex-1 items-center justify-center">
				<TemplateCanvas template={selected} {photos} {filterId} class="max-h-full" />
			</div>
			<div class="flex w-80 flex-col gap-4 overflow-auto">
				<h3 class="text-lg font-semibold text-slate-200">✨ Pick a filter</h3>
				<div class="grid grid-cols-2 gap-2">
					{#each FILTERS as f (f.id)}
						<button
							class="rounded-xl px-3 py-3 text-sm font-medium transition {filterId === f.id
								? 'bg-sky-500 text-white'
								: 'bg-white/5 text-slate-300 hover:bg-white/10'}"
							onclick={() => (filterId = f.id)}
						>
							{f.label}
						</button>
					{/each}
				</div>

				<h3 class="mt-2 text-lg font-semibold text-slate-200">🖨 Print</h3>
				<label class="text-sm text-slate-400">
					Printer
					<select
						bind:value={printer}
						class="mt-1 w-full rounded-lg border-white/10 bg-white/5 text-slate-200"
					>
						<option value="">Save only (no printer)</option>
						{#each printers as p (p.name)}
							<option value={p.name} disabled={!p.enabled}>
								{p.name}{p.enabled ? '' : ' (offline)'}
							</option>
						{/each}
					</select>
				</label>
				<label class="text-sm text-slate-400">
					Copies
					<input
						type="number"
						min="1"
						max="5"
						bind:value={copies}
						class="mt-1 w-full rounded-lg border-white/10 bg-white/5 text-slate-200"
					/>
				</label>

				{#if printError}
					<p class="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{printError}</p>
				{/if}

				<div class="mt-auto flex flex-col gap-3">
					<button class="btn bg-white/10 text-base text-slate-200" onclick={backToCapture}>
						← Retake
					</button>
					<button
						class="btn bg-gradient-to-r from-fuchsia-500 to-sky-500 text-white"
						onclick={doPrint}
					>
						{printer ? '🖨 Print' : '💾 Save'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ============ STEP: printing ============ -->
	{#if step === 'printing'}
		<div class="flex flex-1 flex-col items-center justify-center gap-6">
			<div class="h-20 w-20 animate-spin rounded-full border-4 border-white/20 border-t-sky-400"></div>
			<p class="text-2xl text-slate-200">{printer ? 'Printing your photo…' : 'Saving your photo…'}</p>
		</div>
	{/if}

	<!-- ============ STEP: done ============ -->
	{#if step === 'done'}
		<div class="flex flex-1 flex-col items-center justify-center gap-6 text-center">
			<div class="text-8xl">🎉</div>
			<h2 class="text-4xl font-bold text-white">All done!</h2>
			<p class="text-xl text-slate-300">
				{printer ? 'Your photo is printing. Grab it from the printer!' : 'Your photo has been saved.'}
			</p>
			<button
				class="btn mt-4 bg-gradient-to-r from-fuchsia-500 to-sky-500 text-white"
				onclick={startOver}
			>
				Take another →
			</button>
		</div>
	{/if}
</div>
