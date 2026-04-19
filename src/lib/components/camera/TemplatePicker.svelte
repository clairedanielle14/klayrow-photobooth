<script lang="ts">
	import type { PhotostripTemplate, PhotostripTemplateId } from '$lib/types/photostrip';

	let {
		templates,
		selectedTemplateId,
		onSelect,
		disabled = false
	}: {
		templates: PhotostripTemplate[];
		selectedTemplateId: PhotostripTemplateId;
		onSelect: (id: PhotostripTemplateId) => void;
		disabled?: boolean;
	} = $props();
</script>

<section class="space-y-3">
	<h2 class="text-xl text-slate-700">Choose a template</h2>
	<div class="grid gap-3 sm:grid-cols-2">
		{#each templates as template}
			<button
				type="button"
				onclick={() => onSelect(template.id)}
				aria-pressed={selectedTemplateId === template.id}
				disabled={disabled}
				class={`rounded-2xl border-2 bg-white p-4 text-left transition ${
					selectedTemplateId === template.id
						? 'border-slate-700 shadow-[0_8px_18px_rgba(51,65,85,0.2)]'
						: 'border-slate-300 hover:border-slate-500'
				} disabled:cursor-not-allowed disabled:opacity-50`}
			>
				<p class="text-lg font-semibold text-slate-800">{template.name}</p>
				<p class="text-sm text-slate-600">{template.tagline}</p>
			</button>
		{/each}
	</div>
</section>
