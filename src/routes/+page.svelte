<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden">
	<!-- soft glow background -->
	<div
		class="pointer-events-none absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-fuchsia-600/30 blur-3xl"
	></div>
	<div
		class="pointer-events-none absolute -right-40 -bottom-40 h-[40rem] w-[40rem] rounded-full bg-sky-500/30 blur-3xl"
	></div>

	<div class="relative z-10 flex flex-col items-center text-center">
		<p class="mb-2 text-2xl font-light tracking-[0.3em] text-sky-300 uppercase">Welcome to</p>
		<h1
			class="bg-gradient-to-r from-fuchsia-400 via-pink-300 to-sky-300 bg-clip-text text-8xl font-black text-transparent drop-shadow"
		>
			Kim Photobooth
		</h1>
		<p class="mt-4 mb-16 text-2xl text-slate-300">Smile, snap, and print your moment 📸</p>

		<button
			class="btn animate-pulse bg-gradient-to-r from-fuchsia-500 to-sky-500 px-16 py-8 text-3xl text-white shadow-2xl shadow-fuchsia-500/40 hover:from-fuchsia-400 hover:to-sky-400"
			onclick={() => goto('/booth')}
		>
			👉 Touch to Start
		</button>
	</div>

	<!-- discreet designer entrance for Kim -->
	<button
		class="absolute right-6 bottom-6 z-10 rounded-full bg-white/10 px-5 py-3 text-sm text-slate-300 backdrop-blur transition hover:bg-white/20"
		onclick={() => goto('/designer')}
	>
		⚙︎ Designer
	</button>
</div>
