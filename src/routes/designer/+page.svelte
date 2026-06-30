<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Template, Slot, TextDeco, Asset, Background } from '$lib/types';
	import { uid } from '$lib/util';

	type View = 'list' | 'edit';
	let view = $state<View>('list');
	let templates = $state<Template[]>([]);
	let draft = $state<Template | null>(null);
	let saving = $state(false);

	const SIZE_PRESETS = [
		{ label: 'Strip 2×6', w: 600, h: 1800 },
		{ label: '4×6 Portrait', w: 1200, h: 1800 },
		{ label: '4×6 Landscape', w: 1800, h: 1200 },
		{ label: 'Square', w: 1200, h: 1200 }
	];
	const EMOJIS = ['🎉', '🎂', '🎈', '🎁', '✨', '⭐', '❤️', '👑', '🥳', '🍾', '💖', '🌟', '18'];

	async function load() {
		templates = await fetch('/api/templates').then((r) => r.json());
	}
	$effect(() => {
		load();
	});

	function blankTemplate(): Template {
		return {
			id: '',
			name: 'New Template',
			width: 1200,
			height: 1800,
			background: { type: 'gradient', from: '#ff6ec4', to: '#7873f5', angle: 160 },
			slots: [{ id: uid('s'), x: 0.1, y: 0.12, w: 0.8, h: 0.5, radius: 0.03, rotation: 0 }],
			texts: [
				{ id: uid('t'), text: 'Celebrate!', x: 0.5, y: 0.92, size: 0.05, color: '#ffffff', align: 'center', bold: true, rotation: 0 }
			],
			assets: [],
			createdAt: 0,
			updatedAt: 0
		};
	}

	function newTemplate() {
		draft = blankTemplate();
		selected = null;
		view = 'edit';
	}
	function edit(t: Template) {
		const clone = structuredClone($state.snapshot(t)) as Template;
		clone.assets ??= [];
		clone.texts ??= [];
		// normalize optional fields so range/checkbox bindings always have a value
		clone.slots.forEach((s) => {
			s.rotation ??= 0;
			s.radius ??= 0;
		});
		clone.texts.forEach((t) => {
			t.rotation ??= 0;
			t.bold ??= false;
		});
		clone.assets.forEach((a) => {
			a.rotation ??= 0;
			a.opacity ??= 1;
		});
		draft = clone;
		selected = null;
		view = 'edit';
	}
	async function remove(t: Template) {
		if (!confirm(`Delete "${t.name}"?`)) return;
		await fetch(`/api/templates/${t.id}`, { method: 'DELETE' });
		await load();
	}
	async function save() {
		if (!draft) return;
		saving = true;
		try {
			await fetch('/api/templates', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(draft)
			});
			await load();
			view = 'list';
			draft = null;
		} finally {
			saving = false;
		}
	}

	// ---------- selection ----------
	type Sel = { kind: 'slot' | 'text' | 'asset'; index: number } | null;
	let selected = $state<Sel>(null);
	const isSel = (kind: string, i: number) => selected?.kind === kind && selected.index === i;

	function currentEl(): Slot | TextDeco | Asset | null {
		if (!draft || !selected) return null;
		if (selected.kind === 'slot') return draft.slots[selected.index] ?? null;
		if (selected.kind === 'text') return draft.texts[selected.index] ?? null;
		return draft.assets[selected.index] ?? null;
	}

	// ---------- add elements ----------
	function addSlot() {
		if (!draft) return;
		draft.slots.push({ id: uid('s'), x: 0.25, y: 0.25, w: 0.5, h: 0.35, radius: 0.03, rotation: 0 });
		selected = { kind: 'slot', index: draft.slots.length - 1 };
	}
	function addText() {
		if (!draft) return;
		draft.texts.push({ id: uid('t'), text: 'Text', x: 0.5, y: 0.5, size: 0.05, color: '#ffffff', align: 'center', bold: true, rotation: 0 });
		selected = { kind: 'text', index: draft.texts.length - 1 };
	}
	function addEmoji(e: string) {
		if (!draft) return;
		draft.texts.push({ id: uid('t'), text: e, x: 0.5, y: 0.5, size: 0.12, color: '#ffffff', align: 'center', rotation: 0 });
		selected = { kind: 'text', index: draft.texts.length - 1 };
	}

	// ---------- uploads ----------
	let uploadMode: 'background' | 'asset' = 'background';
	let fileInput: HTMLInputElement;

	function pickBackgroundImage() {
		uploadMode = 'background';
		fileInput.click();
	}
	function pickAssetImage() {
		uploadMode = 'asset';
		fileInput.click();
	}
	async function onFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || !draft) return;
		const dataUrl = await fileToDataUrl(file);
		const dims = await imageSize(dataUrl);
		const { url } = await fetch('/api/assets', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ dataUrl })
		}).then((r) => r.json());

		if (uploadMode === 'background') {
			draft.background = { type: 'image', src: url, fit: 'cover' };
		} else {
			// keep the image's aspect ratio: (w*W)/(h*H) === natW/natH
			const w = 0.4;
			const h = (w * draft.width * dims.h) / (dims.w * draft.height);
			draft.assets.push({ id: uid('a'), src: url, x: 0.5 - w / 2, y: 0.5 - h / 2, w, h, rotation: 0, opacity: 1 });
			selected = { kind: 'asset', index: draft.assets.length - 1 };
		}
	}
	function fileToDataUrl(file: File): Promise<string> {
		return new Promise((res, rej) => {
			const fr = new FileReader();
			fr.onload = () => res(fr.result as string);
			fr.onerror = rej;
			fr.readAsDataURL(file);
		});
	}
	function imageSize(src: string): Promise<{ w: number; h: number }> {
		return new Promise((res) => {
			const img = new Image();
			img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
			img.onerror = () => res({ w: 1, h: 1 });
			img.src = src;
		});
	}

	// ---------- delete / layer ----------
	function deleteSelected() {
		if (!draft || !selected) return;
		if (selected.kind === 'slot') draft.slots.splice(selected.index, 1);
		else if (selected.kind === 'text') draft.texts.splice(selected.index, 1);
		else draft.assets.splice(selected.index, 1);
		selected = null;
	}
	function reorder(dir: 1 | -1) {
		if (!draft || !selected) return;
		const arr =
			selected.kind === 'text' ? draft.texts : selected.kind === 'asset' ? draft.assets : draft.slots;
		const i = selected.index;
		const j = i + dir;
		if (j < 0 || j >= arr.length) return;
		[arr[i], arr[j]] = [arr[j], arr[i]];
		selected = { kind: selected.kind, index: j };
	}

	// ---------- background helpers ----------
	function setBg(type: Background['type']) {
		if (!draft) return;
		if (type === 'color') draft.background = { type: 'color', color: '#1a1a1a' };
		else if (type === 'gradient') draft.background = { type: 'gradient', from: '#ff6ec4', to: '#7873f5', angle: 160 };
		else pickBackgroundImage();
	}

	// ---------- preview geometry + transforms ----------
	let box = $state<HTMLDivElement>();
	const aspect = $derived(draft ? draft.width / draft.height : 0.66);
	const previewH = 540;
	const previewW = $derived(previewH * aspect);

	type Drag = {
		mode: 'move' | 'resize' | 'rotate';
		kind: 'slot' | 'text' | 'asset';
		index: number;
		sx: number;
		sy: number;
		orig: Slot & TextDeco & Asset;
	} | null;
	let drag = $state<Drag>(null);

	const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
	const rad = (d: number) => (d * Math.PI) / 180;

	function start(mode: 'move' | 'resize' | 'rotate', e: PointerEvent) {
		if (!selected) return;
		e.stopPropagation();
		const el = currentEl();
		if (!el) return;
		drag = {
			mode,
			kind: selected.kind,
			index: selected.index,
			sx: e.clientX,
			sy: e.clientY,
			orig: structuredClone($state.snapshot(el)) as Slot & TextDeco & Asset
		};
	}
	function selectAndMove(kind: 'slot' | 'text' | 'asset', i: number, e: PointerEvent) {
		selected = { kind, index: i };
		start('move', e);
	}

	function onMove(e: PointerEvent) {
		if (!drag || !draft) return;
		const el = currentEl();
		if (!el) return;
		const dx = (e.clientX - drag.sx) / previewW;
		const dy = (e.clientY - drag.sy) / previewH;

		if (drag.mode === 'move') {
			if (drag.kind === 'text') {
				(el as TextDeco).x = clamp(drag.orig.x + dx, 0, 1);
				(el as TextDeco).y = clamp(drag.orig.y + dy, 0, 1);
			} else {
				const s = el as Slot | Asset;
				s.x = clamp(drag.orig.x + dx, -0.2, 1 - 0.02);
				s.y = clamp(drag.orig.y + dy, -0.2, 1 - 0.02);
			}
		} else if (drag.mode === 'resize') {
			if (drag.kind === 'text') {
				(el as TextDeco).size = clamp(drag.orig.size + dy, 0.02, 0.4);
			} else {
				const s = el as Slot | Asset;
				const theta = rad(drag.orig.rotation ?? 0);
				const dpx = e.clientX - drag.sx;
				const dpy = e.clientY - drag.sy;
				// project screen delta into the element's local (unrotated) axes
				const lx = (dpx * Math.cos(theta) + dpy * Math.sin(theta)) / previewW;
				const ly = (-dpx * Math.sin(theta) + dpy * Math.cos(theta)) / previewH;
				const cx = drag.orig.x + drag.orig.w / 2;
				const cy = drag.orig.y + drag.orig.h / 2;
				s.w = clamp(drag.orig.w + 2 * lx, 0.03, 1.6);
				s.h = clamp(drag.orig.h + 2 * ly, 0.03, 1.6);
				s.x = cx - s.w / 2;
				s.y = cy - s.h / 2;
			}
		} else if (drag.mode === 'rotate') {
			if (!box) return;
			const rect = box.getBoundingClientRect();
			const ccx = drag.kind === 'text' ? drag.orig.x : drag.orig.x + drag.orig.w / 2;
			const ccy = drag.kind === 'text' ? drag.orig.y : drag.orig.y + drag.orig.h / 2;
			const cxpx = rect.left + ccx * previewW;
			const cypx = rect.top + ccy * previewH;
			const deg = (Math.atan2(e.clientY - cypx, e.clientX - cxpx) * 180) / Math.PI + 90;
			el.rotation = Math.round(deg);
		}
	}
	function onUp() {
		drag = null;
	}

	function bgCss(t: Template): string {
		if (t.background.type === 'gradient')
			return `background:linear-gradient(${t.background.angle ?? 0}deg, ${t.background.from}, ${t.background.to})`;
		if (t.background.type === 'image')
			return `background:#000 url(${t.background.src}) center/${t.background.fit ?? 'cover'} no-repeat`;
		return `background:${t.background.color}`;
	}
</script>

<svelte:window onpointermove={onMove} onpointerup={onUp} />
<input type="file" accept="image/*" class="hidden" bind:this={fileInput} onchange={onFile} />

<div class="flex h-screen w-screen flex-col overflow-hidden">
	<header class="flex items-center justify-between border-b border-white/10 px-6 py-3">
		<button class="text-slate-400 hover:text-white" onclick={() => (view === 'edit' ? (view = 'list') : goto('/'))}>
			← {view === 'edit' ? 'Back' : 'Home'}
		</button>
		<h2 class="text-xl font-semibold text-slate-200">Template Designer</h2>
		{#if view === 'edit'}
			<button class="rounded-xl bg-emerald-500 px-5 py-2 font-semibold text-white disabled:opacity-50" onclick={save} disabled={saving}>
				{saving ? 'Saving…' : 'Save'}
			</button>
		{:else}
			<div class="w-16"></div>
		{/if}
	</header>

	<!-- ===== list ===== -->
	{#if view === 'list'}
		<div class="flex-1 overflow-auto p-8">
			<div class="mb-6 flex justify-end">
				<button class="btn bg-gradient-to-r from-fuchsia-500 to-sky-500 text-base text-white" onclick={newTemplate}>
					+ New Template
				</button>
			</div>
			<div class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
				{#each templates as t (t.id)}
					<div class="flex flex-col items-center gap-3 rounded-2xl bg-white/5 p-4">
						<div class="overflow-hidden rounded shadow-lg" style="{bgCss(t)};width:120px;height:{(120 / t.width) * t.height}px;position:relative">
							{#each t.slots as s (s.id)}
								<div class="absolute bg-white/15" style="left:{s.x * 100}%;top:{s.y * 100}%;width:{s.w * 100}%;height:{s.h * 100}%;border-radius:4px;transform:rotate({s.rotation ?? 0}deg)"></div>
							{/each}
							{#each t.assets ?? [] as a (a.id)}
								<img src={a.src} alt="" class="absolute" style="left:{a.x * 100}%;top:{a.y * 100}%;width:{a.w * 100}%;height:{a.h * 100}%;transform:rotate({a.rotation ?? 0}deg);opacity:{a.opacity ?? 1}" />
							{/each}
						</div>
						<span class="font-medium text-slate-200">{t.name}</span>
						<div class="flex gap-2">
							<button class="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20" onclick={() => edit(t)}>Edit</button>
							<button class="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30" onclick={() => remove(t)}>Delete</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ===== editor ===== -->
	{#if view === 'edit' && draft}
		<div class="flex flex-1 gap-4 overflow-hidden p-4">
			<!-- left toolbar -->
			<div class="flex w-44 flex-col gap-2 overflow-auto">
				<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Add</p>
				<button class="rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10" onclick={addSlot}>📷 Photo slot</button>
				<button class="rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10" onclick={addText}>🔤 Text</button>
				<button class="rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10" onclick={pickAssetImage}>🖼️ Upload image</button>
				<p class="mt-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Stickers</p>
				<div class="grid grid-cols-4 gap-1">
					{#each EMOJIS as em (em)}
						<button class="rounded-lg bg-white/5 py-2 text-lg hover:bg-white/15" onclick={() => addEmoji(em)}>{em}</button>
					{/each}
				</div>
			</div>

			<!-- preview / canvas -->
			<div class="flex flex-1 items-center justify-center">
				<div
					bind:this={box}
					class="relative touch-none overflow-hidden rounded-lg shadow-2xl"
					style="{bgCss(draft)};width:{previewW}px;height:{previewH}px"
					onpointerdown={() => (selected = null)}
				>
					<!-- slots -->
					{#each draft.slots as s, i (s.id)}
						<div
							role="button" tabindex="0"
							class="absolute cursor-move border-2 bg-sky-400/10 {isSel('slot', i) ? 'border-sky-300' : 'border-sky-400/60'}"
							style="left:{s.x * 100}%;top:{s.y * 100}%;width:{s.w * 100}%;height:{s.h * 100}%;transform:rotate({s.rotation ?? 0}deg);border-radius:{(s.radius ?? 0) * Math.min(s.w * previewW, s.h * previewH)}px"
							onpointerdown={(e) => selectAndMove('slot', i, e)}
						>
							<span class="absolute top-0.5 left-1 text-xs text-sky-200">#{i + 1}</span>
							{#if isSel('slot', i)}
								{@render handles()}
							{/if}
						</div>
					{/each}
					<!-- assets -->
					{#each draft.assets as a, i (a.id)}
						<div
							role="button" tabindex="0"
							class="absolute cursor-move {isSel('asset', i) ? 'ring-2 ring-sky-300' : ''}"
							style="left:{a.x * 100}%;top:{a.y * 100}%;width:{a.w * 100}%;height:{a.h * 100}%;transform:rotate({a.rotation ?? 0}deg);opacity:{a.opacity ?? 1}"
							onpointerdown={(e) => selectAndMove('asset', i, e)}
						>
							<img src={a.src} alt="" class="pointer-events-none h-full w-full" draggable="false" />
							{#if isSel('asset', i)}
								{@render handles()}
							{/if}
						</div>
					{/each}
					<!-- texts -->
					{#each draft.texts as t, i (t.id)}
						<div
							role="button" tabindex="0"
							class="absolute -translate-x-1/2 -translate-y-1/2 cursor-move leading-none whitespace-nowrap {isSel('text', i) ? 'ring-2 ring-sky-300' : ''}"
							style="left:{t.x * 100}%;top:{t.y * 100}%;font-size:{t.size * previewH}px;color:{t.color};font-weight:{t.bold ? 700 : 400};rotate:{t.rotation ?? 0}deg"
							onpointerdown={(e) => selectAndMove('text', i, e)}
						>
							{t.text}
							{#if isSel('text', i)}
								{@render handles()}
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- right properties -->
			<div class="flex w-72 flex-col gap-4 overflow-auto pr-1">
				<label class="text-xs text-slate-400">
					Name
					<input bind:value={draft.name} class="mt-1 w-full rounded-lg border-white/10 bg-white/5 text-sm text-slate-100" />
				</label>
				<label class="text-xs text-slate-400">
					Paper size
					<select
						class="mt-1 w-full rounded-lg border-white/10 bg-white/5 text-sm text-slate-100"
						onchange={(e) => {
							const p = SIZE_PRESETS[+(e.currentTarget as HTMLSelectElement).value];
							if (draft && p) { draft.width = p.w; draft.height = p.h; }
						}}
					>
						{#each SIZE_PRESETS as p, idx (p.label)}
							<option value={idx} selected={draft.width === p.w && draft.height === p.h}>{p.label}</option>
						{/each}
					</select>
				</label>

				<!-- background -->
				<div class="rounded-xl bg-white/5 p-3">
					<p class="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Background</p>
					<div class="mb-3 flex gap-1 text-xs">
						{#each ['color', 'gradient', 'image'] as const as ty (ty)}
							<button class="flex-1 rounded-lg px-2 py-1.5 capitalize {draft.background.type === ty ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}" onclick={() => setBg(ty)}>{ty}</button>
						{/each}
					</div>
					{#if draft.background.type === 'color'}
						<input type="color" bind:value={draft.background.color} class="h-9 w-full rounded" />
					{:else if draft.background.type === 'gradient'}
						<div class="flex gap-2">
							<input type="color" bind:value={draft.background.from} class="h-9 flex-1 rounded" />
							<input type="color" bind:value={draft.background.to} class="h-9 flex-1 rounded" />
						</div>
						<label class="mt-2 block text-xs text-slate-400">Angle {draft.background.angle ?? 0}°
							<input type="range" min="0" max="360" bind:value={draft.background.angle} class="w-full" />
						</label>
					{:else}
						<div class="flex gap-2">
							<button class="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20" onclick={pickBackgroundImage}>Replace…</button>
							<button class="rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20" onclick={() => { if (draft && draft.background.type === 'image') draft.background = { ...draft.background, fit: draft.background.fit === 'cover' ? 'contain' : 'cover' }; }}>
								{draft.background.fit ?? 'cover'}
							</button>
						</div>
					{/if}
				</div>

				<!-- selected element properties -->
				{#if selected}
					{@const el = currentEl()}
					{#if el}
						<div class="rounded-xl bg-white/5 p-3">
							<div class="mb-2 flex items-center justify-between">
								<p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">
									{selected.kind === 'slot' ? `Photo slot #${selected.index + 1}` : selected.kind === 'text' ? 'Text' : 'Image'}
								</p>
								<button class="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30" onclick={deleteSelected}>Delete</button>
							</div>

							{#if selected.kind === 'text'}
								<input bind:value={(el as TextDeco).text} class="mb-2 w-full rounded-lg border-white/10 bg-white/5 text-sm text-slate-100" />
								<div class="mb-2 flex items-center gap-2">
									<input type="color" bind:value={(el as TextDeco).color} class="h-8 w-12 rounded" />
									<label class="flex items-center gap-1 text-xs text-slate-300">
										<input type="checkbox" bind:checked={(el as TextDeco).bold} /> Bold
									</label>
								</div>
								<label class="block text-xs text-slate-400">Size
									<input type="range" min="0.02" max="0.3" step="0.005" bind:value={(el as TextDeco).size} class="w-full" />
								</label>
							{/if}

							{#if selected.kind === 'slot'}
								<label class="block text-xs text-slate-400">Corner radius
									<input type="range" min="0" max="0.5" step="0.01" bind:value={(el as Slot).radius} class="w-full" />
								</label>
							{/if}

							{#if selected.kind === 'asset'}
								<label class="block text-xs text-slate-400">Opacity
									<input type="range" min="0.1" max="1" step="0.05" bind:value={(el as Asset).opacity} class="w-full" />
								</label>
							{/if}

							<label class="mt-1 block text-xs text-slate-400">Rotation {Math.round(el.rotation ?? 0)}°
								<input type="range" min="-180" max="180" bind:value={el.rotation} class="w-full" />
							</label>

							{#if selected.kind !== 'slot'}
								<div class="mt-2 flex gap-2 text-xs">
									<button class="flex-1 rounded-lg bg-white/10 px-2 py-1.5 hover:bg-white/20" onclick={() => reorder(1)}>Bring forward</button>
									<button class="flex-1 rounded-lg bg-white/10 px-2 py-1.5 hover:bg-white/20" onclick={() => reorder(-1)}>Send back</button>
								</div>
							{/if}
						</div>
					{/if}
				{:else}
					<p class="rounded-xl bg-white/5 p-3 text-xs text-slate-400">
						Tap an element on the canvas to move, resize (corner), or rotate (top handle) it.
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

{#snippet handles()}
	<!-- resize: bottom-right corner -->
	<div
		class="absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-white bg-sky-400"
		onpointerdown={(e) => start('resize', e)}
		role="button" tabindex="0"
	></div>
	<!-- rotate: above center -->
	<div
		class="absolute left-1/2 h-4 w-4 -translate-x-1/2 cursor-grab rounded-full border border-white bg-amber-400"
		style="top:-1.75rem"
		onpointerdown={(e) => start('rotate', e)}
		role="button" tabindex="0"
	></div>
{/snippet}
