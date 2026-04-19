<script lang="ts">
	let {
		photos,
		onFileSelect,
		onClear
	}: {
		photos: (string | null)[];
		onFileSelect: (slotIndex: number, file: File) => void;
		onClear: (slotIndex: number) => void;
	} = $props();

	function handleInputChange(event: Event, slotIndex: number) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		onFileSelect(slotIndex, file);
		input.value = '';
	}
</script>

<section class="space-y-3">
	<h2 class="text-xl text-slate-700">3 camera slots</h2>
	<div class="grid gap-3 sm:grid-cols-3">
		{#each [0, 1, 2] as index}
			<article class="space-y-2 rounded-2xl border-2 border-slate-300 bg-white p-3">
				<div class="aspect-[4/3] overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50">
					{#if photos[index]}
						<img src={photos[index]} alt={`Captured photo ${index + 1}`} class="h-full w-full object-cover" />
					{:else}
						<div class="grid h-full place-content-center text-sm text-slate-500">Slot {index + 1}</div>
					{/if}
				</div>
				<label class="block">
					<span class="sr-only">Upload photo for slot {index + 1}</span>
					<input
						type="file"
						accept="image/*"
						class="block w-full cursor-pointer rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700 file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-xs file:text-white"
						onchange={(event) => handleInputChange(event, index)}
					/>
				</label>
				<button
					type="button"
					class="w-full rounded-lg border border-slate-400 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => onClear(index)}
					disabled={!photos[index]}
				>
					Clear slot
				</button>
			</article>
		{/each}
	</div>
</section>
