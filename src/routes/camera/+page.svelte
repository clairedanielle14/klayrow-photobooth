<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CameraPreview from '$lib/components/camera/CameraPreview.svelte';
	import PhotoStripPreview from '$lib/components/camera/PhotoStripPreview.svelte';
	import TemplatePicker from '$lib/components/camera/TemplatePicker.svelte';
	import { PHOTOSTRIP_TEMPLATES } from '$lib/data/templates';
	import type { PhotostripTemplateId } from '$lib/types/photostrip';
	import { createPhotostripBlob } from '$lib/utils/photostrip-export';
	import { formatNames } from '$lib/utils/names';
	import { onDestroy } from 'svelte';

	type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'error';
	type CaptureMode = 'upload' | 'camera';
	type FlowStep = 1 | 2 | 3;

	const names = $derived(page.url.searchParams.getAll('name'));
	const displayNames = $derived(formatNames(names) || 'Cutie');
	const steps = [
		{ id: 1, label: 'Choose Template' },
		{ id: 2, label: 'Take Photos' },
		{ id: 3, label: 'Review & Download' }
	] as const;

	let selectedTemplateId = $state<PhotostripTemplateId>('forest');
	let photos = $state<(string | null)[]>([null, null, null]);
	let currentStep = $state<FlowStep>(1);
	let captureMode = $state<CaptureMode>('upload');
	let stream = $state<MediaStream | null>(null);
	let cameraStatus = $state<CameraStatus>('idle');
	let isCapturingSequence = $state(false);
	let activeSlot = $state<number | null>(null);
	let countdown = $state<number | null>(null);
	let cameraPreview = $state<{ captureFrame: () => string | null } | null>(null);
	let isDownloadingStrip = $state(false);
	let downloadError = $state('');
	let batchUploadInput = $state<HTMLInputElement | null>(null);
	let isPreviewExpanded = $state(false);

	const selectedTemplate = $derived(
		PHOTOSTRIP_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? PHOTOSTRIP_TEMPLATES[0]
	);
	const cameraHint = $derived(
		cameraStatus === 'requesting'
			? 'Requesting camera permission...'
			: cameraStatus === 'ready'
				? 'Camera ready. Click Take photos to start the 3-shot sequence.'
				: cameraStatus === 'denied'
					? 'Camera permission denied. You can still add photos using the + buttons on the strip.'
					: cameraStatus === 'error'
						? 'Camera is unavailable on this device right now. You can continue with manual uploads.'
						: 'Allow camera access to use the auto 3-shot capture.'
	);
	const canDownloadStrip = $derived(photos.some(Boolean));
	const hasAtLeastOnePhoto = $derived(photos.some(Boolean));
	const photoCount = $derived(photos.filter(Boolean).length);

	function handleSelectTemplate(id: PhotostripTemplateId) {
		selectedTemplateId = id;
	}

	function wait(ms: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}

	function revokeIfBlobUrl(url: string | null) {
		if (url?.startsWith('blob:')) {
			URL.revokeObjectURL(url);
		}
	}

	async function ensureCameraReady(): Promise<boolean> {
		if (!browser) {
			return false;
		}

		if (stream) {
			cameraStatus = 'ready';
			return true;
		}

		if (!navigator.mediaDevices?.getUserMedia) {
			cameraStatus = 'error';
			return false;
		}

		cameraStatus = 'requesting';

		try {
			const nextStream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user' },
				audio: false
			});

			stream = nextStream;
			cameraStatus = 'ready';
			return true;
		} catch (error) {
			const isDenied =
				error instanceof DOMException &&
				['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(error.name);

			cameraStatus = isDenied ? 'denied' : 'error';
			return false;
		}
	}

	function replacePhoto(slotIndex: number, nextPhotoUrl: string) {
		const previousPhotoUrl = photos[slotIndex];
		revokeIfBlobUrl(previousPhotoUrl);

		const nextPhotos = [...photos];
		nextPhotos[slotIndex] = nextPhotoUrl;
		photos = nextPhotos;
	}

	function getFirstEmptySlot(): number {
		const emptySlot = photos.findIndex((photo) => !photo);
		return emptySlot === -1 ? 0 : emptySlot;
	}

	function handleFileSelect(slotIndex: number, file: File) {
		const nextPhotoUrl = URL.createObjectURL(file);
		replacePhoto(slotIndex, nextPhotoUrl);
	}

	function handleBatchUpload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const fileList = input.files;

		if (!fileList || fileList.length === 0) {
			return;
		}

		let targetSlot = getFirstEmptySlot();

		for (const file of Array.from(fileList).slice(0, 3)) {
			handleFileSelect(targetSlot, file);
			targetSlot = (targetSlot + 1) % 3;
		}

		input.value = '';
	}

	function handleSelectCaptureMode(mode: CaptureMode) {
		captureMode = mode;

		if (mode === 'camera') {
			void ensureCameraReady();
		}
	}

	function openBatchUploadPicker() {
		batchUploadInput?.click();
	}

	function handleClearSlot(slotIndex: number) {
		const current = photos[slotIndex];
		revokeIfBlobUrl(current);

		const nextPhotos = [...photos];
		nextPhotos[slotIndex] = null;
		photos = nextPhotos;
	}

	function clearAllPhotos() {
		for (const photo of photos) {
			revokeIfBlobUrl(photo);
		}

		photos = [null, null, null];
	}

	function stopCamera() {
		if (!stream) {
			return;
		}

		for (const track of stream.getTracks()) {
			track.stop();
		}

		stream = null;

		if (cameraStatus === 'ready') {
			cameraStatus = 'idle';
		}
	}

	async function captureSlot(slotIndex: number) {
		activeSlot = slotIndex;

		for (let value = 3; value >= 1; value -= 1) {
			countdown = value;
			await wait(1000);
		}

		countdown = null;

		const frame = cameraPreview?.captureFrame();

		if (!frame) {
			throw new Error(`Failed to capture slot ${slotIndex + 1}`);
		}

		replacePhoto(slotIndex, frame);
		await wait(150);
	}

	async function handleTakePhotos() {
		if (isCapturingSequence) {
			return;
		}

		const ready = await ensureCameraReady();

		if (!ready) {
			return;
		}

		isCapturingSequence = true;

		try {
			for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
				await captureSlot(slotIndex);
			}
		} catch {
			cameraStatus = 'error';
		} finally {
			activeSlot = null;
			countdown = null;
			isCapturingSequence = false;
		}
	}

	function handleBackStep() {
		if (currentStep === 1) {
			goto('/');
			return;
		}

		currentStep = (currentStep - 1) as FlowStep;
	}

	function handleNextStep() {
		if (currentStep === 2 && !hasAtLeastOnePhoto) {
			return;
		}

		if (currentStep < 3) {
			currentStep = (currentStep + 1) as FlowStep;
		}
	}

	function openExpandedPreview() {
		isPreviewExpanded = true;
	}

	function closeExpandedPreview() {
		isPreviewExpanded = false;
	}

	function toSafeFileLabel(value: string): string {
		return value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	async function handleDownloadStrip() {
		if (!browser || isDownloadingStrip || !canDownloadStrip) {
			return;
		}

		downloadError = '';
		isDownloadingStrip = true;

		try {
			const blob = await createPhotostripBlob({
				template: selectedTemplate,
				photos,
				label: displayNames
			});

			const downloadUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			const safeLabel = toSafeFileLabel(displayNames) || 'guest-mode';
			const safeTemplate = toSafeFileLabel(selectedTemplate.name) || 'template';

			link.href = downloadUrl;
			link.download = `photostrip-${safeTemplate}-${safeLabel}.png`;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(downloadUrl);
		} catch {
			downloadError = 'Could not generate strip image. Please try again.';
		} finally {
			isDownloadingStrip = false;
		}
	}

	onDestroy(() => {
		clearAllPhotos();
		stopCamera();
	});
</script>

<main
	class="min-h-screen bg-[#eef4f6] px-2 py-6 text-[#2d3b4c] [font:Georgia,serif]"
>
	<div
		class="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-4xl border border-[#8DB79B]/65 bg-[#8DB79B]/35 p-4 shadow-2xl backdrop-blur-xl sm:p-6"
	>
		<header class="space-y-3">
			<div class="flex items-center justify-between">
				<h1 class="text-3xl font-semibold text-[#2d3b4c] sm:text-4xl">Special Photobooth</h1>
				<p class="rounded-full bg-white/70 px-4 py-1.5 text-sm text-[#2d3b4c]">Name: {displayNames}</p>
			</div>

			<div class="grid grid-cols-3 gap-2 rounded-2xl bg-white/20 p-2">
				{#each steps as step}
					<div
						class={`rounded-xl px-2 py-3 text-center text-xs font-semibold sm:text-sm ${
							currentStep === step.id
								? 'bg-white text-teal-700 shadow'
								: currentStep > step.id
									? 'bg-emerald-100/90 text-emerald-700'
									: 'bg-white/40 text-[#2d3b4c]'
						}`}
					>
						<p>Step {step.id}</p>
						<p>{step.label}</p>
					</div>
				{/each}
			</div>
		</header>

		<div class="rounded-2xl bg-white/70 p-4 sm:p-6">
			{#if currentStep === 1}
				<div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
					<div class="space-y-4">
						<p class="text-sm text-slate-600">
							Pick your template first. You can still switch later, but this gives your booth direction.
						</p>
						<TemplatePicker
							templates={PHOTOSTRIP_TEMPLATES}
							selectedTemplateId={selectedTemplateId}
							onSelect={handleSelectTemplate}
						/>
					</div>

					<PhotoStripPreview
						template={selectedTemplate}
						photos={photos}
						label={displayNames}
						interactive={false}
						showTitle={false}
						onFileSelect={handleFileSelect}
						onClear={handleClearSlot}
					/>
				</div>
			{/if}

			{#if currentStep === 2}
				<div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
					<div class="space-y-4">
						<div class="grid grid-cols-2 gap-3">
							<button
								type="button"
								onclick={() => handleSelectCaptureMode('upload')}
								class={`rounded-xl border px-4 py-3 text-xl font-semibold transition ${
									captureMode === 'upload'
										? 'border-teal-600 bg-teal-600 text-white'
										: 'border-slate-300 bg-white text-slate-700'
								}`}
							>
								Upload
							</button>
							<button
								type="button"
								onclick={() => handleSelectCaptureMode('camera')}
								class={`rounded-xl border px-4 py-3 text-xl font-semibold transition ${
									captureMode === 'camera'
										? 'border-teal-600 bg-teal-600 text-white'
										: 'border-slate-300 bg-white text-slate-700'
								}`}
							>
								Take Photo
							</button>
						</div>

						{#if captureMode === 'camera'}
							<CameraPreview
								bind:this={cameraPreview}
								{stream}
								{cameraStatus}
								{countdown}
								{activeSlot}
								{isCapturingSequence}
								onTakePhotos={handleTakePhotos}
							/>
							<p class="rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-600">{cameraHint}</p>
						{:else}
							<input
								bind:this={batchUploadInput}
								type="file"
								accept="image/*"
								multiple
								class="sr-only"
								onchange={handleBatchUpload}
							/>
							<div class="rounded-2xl border border-slate-300 bg-white p-4">
								<p class="text-sm text-slate-600">Upload up to 3 photos quickly, then fine tune on the strip.</p>
								<button
									type="button"
									class="mt-3 w-full rounded-xl border-2 border-slate-600 bg-white px-4 py-3 text-xl text-slate-700"
									onclick={openBatchUploadPicker}
								>
									Choose photos
								</button>
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-3">
							<button
								type="button"
								class="rounded-xl border border-slate-400 bg-white px-4 py-3 text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
								onclick={clearAllPhotos}
								disabled={isCapturingSequence}
							>
								Clear all
							</button>
							<p class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
								{photoCount}/3 filled
							</p>
						</div>
					</div>

					<PhotoStripPreview
						template={selectedTemplate}
						photos={photos}
						label={displayNames}
						{activeSlot}
						onFileSelect={handleFileSelect}
						onClear={handleClearSlot}
						showTitle={false}
					/>
				</div>
			{/if}

			{#if currentStep === 3}
				<div class="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
					<div class="space-y-4">
						<h2 class="text-2xl font-semibold text-teal-700">Final review</h2>
						<p class="text-sm text-slate-600">
							Everything looks good. Download your strip or go back to retake photos and templates.
						</p>
						<div class="grid gap-3 sm:grid-cols-2">
							<button
								type="button"
								class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700"
								onclick={() => (currentStep = 2)}
							>
								Retake photos
							</button>
							<button
								type="button"
								class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700"
								onclick={() => (currentStep = 1)}
							>
								Change template
							</button>
						</div>
						<button
							type="button"
							class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700"
							onclick={openExpandedPreview}
						>
							Expand preview
						</button>
						<button
							type="button"
							class="w-full rounded-xl border-2 border-teal-600 bg-teal-600 px-4 py-3 text-xl font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
							onclick={handleDownloadStrip}
							disabled={isDownloadingStrip || !canDownloadStrip}
						>
							{isDownloadingStrip ? 'Preparing...' : 'Download strip'}
						</button>
						{#if downloadError}
							<p class="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
								{downloadError}
							</p>
						{/if}
					</div>

					<PhotoStripPreview
						template={selectedTemplate}
						photos={photos}
						label={displayNames}
						interactive={false}
						showTitle={false}
						onFileSelect={handleFileSelect}
						onClear={handleClearSlot}
					/>
				</div>
			{/if}
		</div>

		<footer class="flex items-center justify-between gap-3 rounded-2xl bg-white/20 p-3">
			<button
				type="button"
				class="rounded-xl border border-white/50 bg-white/80 px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-white"
				onclick={handleBackStep}
			>
				Back
			</button>

			<button
				type="button"
				class="rounded-xl border border-white/50 bg-white px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={handleNextStep}
				disabled={currentStep === 3 || (currentStep === 2 && !hasAtLeastOnePhoto)}
			>
				{currentStep === 2 && !hasAtLeastOnePhoto ? 'Add at least 1 photo' : 'Next'}
			</button>
		</footer>
	</div>
</main>

{#if isPreviewExpanded}
	<div class="fixed inset-0 z-50 bg-slate-900/70 p-4 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true">
		<div class="mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl bg-white p-4 sm:p-6">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-[#2d3b4c]">Expanded photostrip preview</h2>
				<button
					type="button"
					class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
					onclick={closeExpandedPreview}
				>
					Close
				</button>
			</div>
			<div class="flex-1 overflow-auto">
				<div class="flex justify-center pt-2">
					<div class="origin-top scale-[1.45] sm:scale-[1.65]">
						<PhotoStripPreview
							template={selectedTemplate}
							photos={photos}
							label={displayNames}
							interactive={false}
							showTitle={false}
							onFileSelect={handleFileSelect}
							onClear={handleClearSlot}
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
