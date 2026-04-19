<script lang="ts">
	let {
		stream,
		cameraStatus,
		countdown,
		activeSlot,
		isCapturingSequence,
		onTakePhotos
	}: {
		stream: MediaStream | null;
		cameraStatus: 'idle' | 'requesting' | 'ready' | 'denied' | 'error';
		countdown: number | null;
		activeSlot: number | null;
		isCapturingSequence: boolean;
		onTakePhotos: () => void;
	} = $props();

	let videoEl = $state<HTMLVideoElement | null>(null);

	$effect(() => {
		if (!videoEl) {
			return;
		}

		videoEl.srcObject = stream;
	});

	export function captureFrame(): string | null {
		if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
			return null;
		}

		const canvas = document.createElement('canvas');
		canvas.width = videoEl.videoWidth;
		canvas.height = videoEl.videoHeight;

		const context = canvas.getContext('2d');

		if (!context) {
			return null;
		}

		context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL('image/jpeg', 0.92);
	}
</script>

<section class="space-y-3">
	<h2 class="text-xl text-slate-700">Camera preview</h2>

	<div class="relative aspect-video overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-900">
		{#if stream}
			<video bind:this={videoEl} autoplay playsinline muted class="h-full w-full object-cover"></video>
		{:else}
			<div class="grid h-full place-content-center px-6 text-center text-sm text-slate-200">
				Camera preview will appear here after you allow access.
			</div>
		{/if}

		{#if countdown !== null}
			<div class="absolute inset-0 grid place-content-center bg-black/25">
				<div class="text-8xl font-bold text-white drop-shadow-lg">{countdown}</div>
			</div>
		{/if}

		{#if isCapturingSequence && activeSlot !== null}
			<p class="absolute bottom-2 left-2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
				Capturing slot {activeSlot + 1}
			</p>
		{/if}
	</div>

	<button
		type="button"
		class="w-full rounded-2xl border-2 border-slate-600 bg-white px-4 py-4 text-2xl text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
		onclick={onTakePhotos}
		disabled={cameraStatus === 'requesting' || isCapturingSequence}
	>
		{#if isCapturingSequence}
			Capturing...
		{:else}
			Take photos
		{/if}
	</button>
</section>
