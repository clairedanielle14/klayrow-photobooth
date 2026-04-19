<script lang="ts">
	import type { PhotostripTemplate } from '$lib/types/photostrip';

	let {
		template,
		photos,
		label,
		activeSlot = null,
		interactive = true,
		showTitle = true,
		onFileSelect,
		onClear
	}: {
		template: PhotostripTemplate;
		photos: (string | null)[];
		label: string;
		activeSlot?: number | null;
		interactive?: boolean;
		showTitle?: boolean;
		onFileSelect: (slotIndex: number, file: File) => void;
		onClear: (slotIndex: number) => void;
	} = $props();

	let fileInputs: (HTMLInputElement | null)[] = [];

	function openFilePicker(slotIndex: number) {
		fileInputs[slotIndex]?.click();
	}

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
	{#if showTitle}
		<h2 class="text-xl text-slate-700">Photostrip preview</h2>
	{/if}
	<div
		class="mx-auto w-full max-w-[320px] rounded-3xl border-2 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
		style={`background:${template.background}; border-color:${template.panel};`}
	>
		<div class="space-y-3 rounded-2xl p-3" style={`background:${template.panel};`}>
			{#each [0, 1, 2] as index}
				<div
					class={`group relative aspect-4/3 overflow-hidden rounded-2xl border-[3px] ${
						activeSlot === index ? 'ring-4 ring-white/80 ring-offset-2 ring-offset-transparent' : ''
					}`}
					style={`border-color:${template.frameBorder}; background:${template.frameInner};`}
				>
					<input
						type="file"
						accept="image/*"
						class="sr-only"
						bind:this={fileInputs[index]}
						onchange={(event) => handleInputChange(event, index)}
						disabled={!interactive}
					/>
					{#if photos[index]}
						<img src={photos[index]} alt={`Strip photo ${index + 1}`} class="h-full w-full object-cover" />
						{#if interactive}
							<div class="absolute inset-0 bg-black/0 transition group-hover:bg-black/15"></div>
							<div class="absolute right-2 top-2 flex gap-1">
								<button
									type="button"
									class="rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-slate-700 shadow"
									onclick={() => openFilePicker(index)}
									aria-label={`Replace photo ${index + 1}`}
								>
									+
								</button>
								<button
									type="button"
									class="rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-slate-700 shadow"
									onclick={() => onClear(index)}
									aria-label={`Clear photo ${index + 1}`}
								>
									x
								</button>
							</div>
						{/if}
					{:else}
						{#if interactive}
							<button
								type="button"
								class="grid h-full w-full place-content-center gap-1 text-slate-600"
								onclick={() => openFilePicker(index)}
								aria-label={`Upload photo ${index + 1}`}
							>
								<span class="mx-auto grid h-10 w-10 place-content-center rounded-full border-2 border-slate-400 text-xl">
									+
								</span>
								<span class="text-sm">Add photo {index + 1}</span>
							</button>
						{:else}
							<div class="grid h-full w-full place-content-center gap-1 text-slate-500">
								<span class="mx-auto grid h-10 w-10 place-content-center rounded-full border-2 border-slate-300 text-xl">
									+
								</span>
								<span class="text-sm">Photo {index + 1}</span>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
		<p class="mt-4 text-center text-2xl italic" style={`color:${template.labelColor};`}>
			{label}
		</p>
		<p class="mt-2 text-center text-sm text-slate-700">{template.ornament}</p>
	</div>
</section>
