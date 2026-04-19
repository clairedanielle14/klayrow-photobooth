<script lang="ts">
	import { goto } from '$app/navigation';
	import { parseNames } from '$lib/utils/names';

	const HERO_IMAGE_SRC = '/home-special-photobooth.png';
	let namesInput = $state('');
	let heroImageFailed = $state(false);

	function handleStart(event: SubmitEvent) {
		event.preventDefault();

		const names = parseNames(namesInput);
		const searchParams = new URLSearchParams();

		for (const name of names) {
			searchParams.append('name', name);
		}

		const target = searchParams.size > 0 ? `/camera?${searchParams.toString()}` : '/camera';
		goto(target);
	}
</script>

<main
	class="min-h-screen bg-[#eef4f6] px-4 pb-12 pt-8 text-[#2d3b4c] [font:Georgia,serif] sm:pt-6"
>
	<div class="mx-auto flex w-full max-w-115 flex-col items-center gap-6">
		<div class="text-center">
			<p class="m-0 text-[0.95rem] tracking-[0.02em]">Klayrow's Photobooth</p>
		</div>

		<section
			aria-label="Photobooth artwork"
			class="relative aspect-[4/5.4] w-full overflow-hidden rounded-3xl border-[3px] border-[#5d8b69] bg-linear-to-b from-[#bde9f7] to-[#7bb68a] shadow-[0_12px_30px_rgba(41,90,112,0.2)] sm:aspect-4/5"
		>
			{#if !heroImageFailed}
				<img
					src={HERO_IMAGE_SRC}
					alt="Special Photobooth home illustration"
					class="h-full w-full object-cover"
					onerror={() => (heroImageFailed = true)}
				/>
			{:else}
				<div
					class="absolute left-[7%] top-[11%] h-11 w-11 rounded-full border-[3px] border-white/80"
				></div>
				<div
					class="absolute left-[17%] top-[20%] h-6 w-6 rounded-full border-[3px] border-white/80"
				></div>
				<div
					class="absolute inset-x-[12%] inset-y-[14%] rounded-[18px] border-4 border-[#f7f5ec] bg-[linear-gradient(90deg,transparent_34%,#f7f5ec_34%,#f7f5ec_36%,transparent_36%),linear-gradient(180deg,transparent_22%,#f7f5ec_22%,#f7f5ec_24%,transparent_24%)]"
				></div>
			{/if}
		</section>

		<form class="grid w-full gap-3" onsubmit={handleStart}>
			<label for="names" class="text-base">Who is this for? (optional)</label>
			<input
				id="names"
				name="names"
				type="text"
				bind:value={namesInput}
				placeholder="yomi, claire"
				autocomplete="off"
				class="rounded-xl border-2 border-[#9db8cf] bg-[#fcfdfd] px-4 py-3 text-base outline-none focus:border-[#5d8b69] focus:ring-2 focus:ring-[#b6ebbd]"
			/>
			<p class="m-0 text-sm text-[#5e6f80]">
				Separate names with commas. We will use up to 2 names.
			</p>
			<button
				type="submit"
				class="mt-2 cursor-pointer rounded-2xl border-2 border-[#2d3b4c] bg-white px-4 py-3 text-xl transition-colors hover:bg-[#e9f7ff]"
			>
				Start
			</button>
		</form>
	</div>
</main>
