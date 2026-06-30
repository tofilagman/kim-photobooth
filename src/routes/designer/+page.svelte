<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Template, Slot, TextDeco } from '$lib/types';
	import { uid } from '$lib/util';

	type View = 'list' | 'edit';
	let view = $state<View>('list');
	let templates = $state<Template[]>([]);
	let draft = $state<Template | null>(null);
	let saving = $state(false);

	const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
		{ label: 'Strip 2×6', w: 600, h: 1800 },
		{ label: '4×6 Portrait', w: 1200, h: 1800 },
		{ label: '4×6 Landscape', w: 1800, h: 1200 },
		{ label: 'Square', w: 1200, h: 1200 }
	];

	async function load() {
		templates = await fetch('/api/templates').then((r) => r.json());
	}
	$effect(() => {
		load();
	});

	function newTemplate() {
		draft = {
			id: '',
			name: 'New Template',
			width: 1200,
			height: 1800,
			background: { type: 'color', color: '#1a1a1a' },
			slots: [{ id: uid('s'), x: 0.1, y: 0.1, w: 0.8, h: 0.5, radius: 0.03 }],
			texts: [
				{ id: uid('t'), text: 'Kim Photobooth', x: 0.5, y: 0.95, size: 0.04, color: '#ffffff', align: 'center', bold: true }
			],
			createdAt: 0,
			updatedAt: 0
		};
		view = 'edit';
	}

	function edit(t: Template) {
		// deep clone so cancel discards changes
		draft = structuredClone($state.snapshot(t)) as Template;
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

	// ---- background helpers ----
	function setSolid(color: string) {
		if (draft) draft.background = { type: 'color', color };
	}
	function toggleGradient(on: boolean) {
		if (!draft) return;
		draft.background = on
			? { type: 'gradient', from: '#2b1055', to: '#7597de', angle: 135 }
			: { type: 'color', color: '#1a1a1a' };
	}

	// ---- slots ----
	function addSlot() {
		draft?.slots.push({ id: uid('s'), x: 0.2, y: 0.2, w: 0.6, h: 0.4, radius: 0.03 });
	}
	function removeSlot(i: number) {
		draft?.slots.splice(i, 1);
	}

	// ---- preview geometry + dragging ----
	const aspect = $derived(draft ? draft.width / draft.height : 0.66);
	// fit preview within a 60vh-tall column
	const previewH = 520;
	const previewW = $derived(previewH * aspect);

	type Drag =
		| { kind: 'move-slot' | 'resize-slot'; i: number; sx: number; sy: number; orig: Slot }
		| { kind: 'move-text'; i: number; sx: number; sy: number; orig: TextDeco }
		| null;
	let drag = $state<Drag>(null);

	function clamp(v: number, lo: number, hi: number) {
		return Math.max(lo, Math.min(hi, v));
	}

	function startSlotMove(e: PointerEvent, i: number) {
		if (!draft) return;
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
		drag = { kind: 'move-slot', i, sx: e.clientX, sy: e.clientY, orig: { ...draft.slots[i] } };
	}
	function startSlotResize(e: PointerEvent, i: number) {
		if (!draft) return;
		e.stopPropagation();
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
		drag = { kind: 'resize-slot', i, sx: e.clientX, sy: e.clientY, orig: { ...draft.slots[i] } };
	}
	function startTextMove(e: PointerEvent, i: number) {
		if (!draft) return;
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
		drag = { kind: 'move-text', i, sx: e.clientX, sy: e.clientY, orig: { ...draft.texts[i] } };
	}

	function onMove(e: PointerEvent) {
		if (!drag || !draft) return;
		const dx = (e.clientX - drag.sx) / previewW;
		const dy = (e.clientY - drag.sy) / previewH;
		if (drag.kind === 'move-slot') {
			const s = draft.slots[drag.i];
			s.x = clamp(drag.orig.x + dx, 0, 1 - s.w);
			s.y = clamp(drag.orig.y + dy, 0, 1 - s.h);
		} else if (drag.kind === 'resize-slot') {
			const s = draft.slots[drag.i];
			s.w = clamp(drag.orig.w + dx, 0.05, 1 - s.x);
			s.h = clamp(drag.orig.h + dy, 0.05, 1 - s.y);
		} else if (drag.kind === 'move-text') {
			const t = draft.texts[drag.i];
			t.x = clamp(drag.orig.x + dx, 0, 1);
			t.y = clamp(drag.orig.y + dy, 0, 1);
		}
	}
	function onUp() {
		drag = null;
	}

	function bgStyle(t: Template): string {
		if (t.background.type === 'gradient') {
			return `background:linear-gradient(${t.background.angle ?? 0}deg, ${t.background.from}, ${t.background.to})`;
		}
		return `background:${t.background.color}`;
	}
</script>

<svelte:window onpointermove={onMove} onpointerup={onUp} />

<div class="flex h-screen w-screen flex-col overflow-hidden">
	<header class="flex items-center justify-between border-b border-white/10 px-8 py-4">
		<button class="text-slate-400 hover:text-white" onclick={() => (view === 'edit' ? (view = 'list') : goto('/'))}>
			← {view === 'edit' ? 'Back' : 'Home'}
		</button>
		<h2 class="text-xl font-semibold text-slate-200">Template Designer</h2>
		<div class="w-16"></div>
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
						<div
							class="overflow-hidden rounded shadow-lg"
							style="{bgStyle(t)};width:120px;height:{(120 / t.width) * t.height}px;position:relative"
						>
							{#each t.slots as s (s.id)}
								<div
									class="absolute bg-white/15"
									style="left:{s.x * 100}%;top:{s.y * 100}%;width:{s.w * 100}%;height:{s.h * 100}%;border-radius:4px"
								></div>
							{/each}
						</div>
						<span class="font-medium text-slate-200">{t.name}</span>
						<div class="flex gap-2">
							<button class="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20" onclick={() => edit(t)}>
								Edit
							</button>
							<button class="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30" onclick={() => remove(t)}>
								Delete
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ===== editor ===== -->
	{#if view === 'edit' && draft}
		<div class="flex flex-1 gap-8 overflow-hidden p-8">
			<!-- preview / canvas -->
			<div class="flex flex-1 items-center justify-center">
				<div
					class="relative touch-none overflow-hidden rounded-lg shadow-2xl"
					style="{bgStyle(draft)};width:{previewW}px;height:{previewH}px"
				>
					{#each draft.slots as s, i (s.id)}
						<div
							role="button"
							tabindex="0"
							class="absolute cursor-move border-2 border-sky-400/70 bg-sky-400/10"
							style="left:{s.x * 100}%;top:{s.y * 100}%;width:{s.w * 100}%;height:{s.h * 100}%;border-radius:{(s.radius ?? 0) * Math.min(s.w * previewW, s.h * previewH)}px"
							onpointerdown={(e) => startSlotMove(e, i)}
						>
							<span class="absolute top-1 left-1 text-xs text-sky-200">#{i + 1}</span>
							<!-- resize handle -->
							<div
								class="absolute right-0 bottom-0 h-5 w-5 cursor-nwse-resize rounded-tl bg-sky-400"
								onpointerdown={(e) => startSlotResize(e, i)}
							></div>
						</div>
					{/each}
					{#each draft.texts as t, i (t.id)}
						<div
							role="button"
							tabindex="0"
							class="absolute -translate-x-1/2 -translate-y-1/2 cursor-move whitespace-nowrap"
							style="left:{t.x * 100}%;top:{t.y * 100}%;font-size:{t.size * previewH}px;color:{t.color};font-weight:{t.bold ? 700 : 400}"
							onpointerdown={(e) => startTextMove(e, i)}
						>
							{t.text}
						</div>
					{/each}
				</div>
			</div>

			<!-- properties -->
			<div class="flex w-80 flex-col gap-4 overflow-auto">
				<label class="text-sm text-slate-400">
					Name
					<input
						bind:value={draft.name}
						class="mt-1 w-full rounded-lg border-white/10 bg-white/5 text-slate-100"
					/>
				</label>

				<label class="text-sm text-slate-400">
					Paper size
					<select
						class="mt-1 w-full rounded-lg border-white/10 bg-white/5 text-slate-100"
						onchange={(e) => {
							const p = SIZE_PRESETS[+(e.currentTarget as HTMLSelectElement).value];
							if (draft && p) {
								draft.width = p.w;
								draft.height = p.h;
							}
						}}
					>
						{#each SIZE_PRESETS as p, idx (p.label)}
							<option value={idx} selected={draft.width === p.w && draft.height === p.h}>{p.label}</option>
						{/each}
					</select>
				</label>

				<div class="text-sm text-slate-400">
					Background
					<div class="mt-2 flex items-center gap-3">
						<label class="flex items-center gap-2 text-slate-300">
							<input
								type="checkbox"
								checked={draft.background.type === 'gradient'}
								onchange={(e) => toggleGradient((e.currentTarget as HTMLInputElement).checked)}
							/>
							Gradient
						</label>
					</div>
					{#if draft.background.type === 'color'}
						<input
							type="color"
							value={draft.background.color}
							class="mt-2 h-10 w-full rounded"
							oninput={(e) => setSolid((e.currentTarget as HTMLInputElement).value)}
						/>
					{:else}
						<div class="mt-2 flex gap-2">
							<input type="color" bind:value={draft.background.from} class="h-10 flex-1 rounded" />
							<input type="color" bind:value={draft.background.to} class="h-10 flex-1 rounded" />
						</div>
						<label class="mt-2 block text-xs text-slate-400">
							Angle {draft.background.angle ?? 0}°
							<input type="range" min="0" max="360" bind:value={draft.background.angle} class="w-full" />
						</label>
					{/if}
				</div>

				<div class="text-sm text-slate-400">
					<div class="mb-2 flex items-center justify-between">
						<span>Photo slots ({draft.slots.length})</span>
						<button class="rounded-lg bg-white/10 px-3 py-1 text-slate-200 hover:bg-white/20" onclick={addSlot}>
							+ Add
						</button>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each draft.slots as s, i (s.id)}
							<button
								class="rounded-lg bg-red-500/15 px-3 py-1 text-xs text-red-300 hover:bg-red-500/25"
								onclick={() => removeSlot(i)}
							>
								Remove #{i + 1}
							</button>
						{/each}
					</div>
					<p class="mt-2 text-xs text-slate-500">Drag slots on the preview to move; drag the corner to resize.</p>
				</div>

				{#if draft.texts[0]}
					<div class="text-sm text-slate-400">
						Footer text
						<input bind:value={draft.texts[0].text} class="mt-1 w-full rounded-lg border-white/10 bg-white/5 text-slate-100" />
						<div class="mt-2 flex items-center gap-3">
							<input type="color" bind:value={draft.texts[0].color} class="h-9 w-16 rounded" />
							<label class="flex-1 text-xs">
								Size
								<input type="range" min="0.02" max="0.1" step="0.005" bind:value={draft.texts[0].size} class="w-full" />
							</label>
						</div>
					</div>
				{/if}

				<div class="mt-auto flex gap-3">
					<button class="btn flex-1 bg-white/10 text-base text-slate-200" onclick={() => (view = 'list')}>
						Cancel
					</button>
					<button class="btn flex-1 bg-emerald-500 text-base text-white disabled:opacity-50" onclick={save} disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
