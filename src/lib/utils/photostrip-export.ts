import type { PhotostripTemplate } from '$lib/types/photostrip';

type ExportParams = {
	template: PhotostripTemplate;
	photos: (string | null)[];
	label: string;
};

const WIDTH = 760;
const HEIGHT = 1960;

function roundRectPath(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
) {
	const r = Math.min(radius, width / 2, height / 2);

	context.beginPath();
	context.moveTo(x + r, y);
	context.lineTo(x + width - r, y);
	context.quadraticCurveTo(x + width, y, x + width, y + r);
	context.lineTo(x + width, y + height - r);
	context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
	context.lineTo(x + r, y + height);
	context.quadraticCurveTo(x, y + height, x, y + height - r);
	context.lineTo(x, y + r);
	context.quadraticCurveTo(x, y, x + r, y);
	context.closePath();
}

function drawRoundedRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
	fill: string
) {
	roundRectPath(context, x, y, width, height, radius);
	context.fillStyle = fill;
	context.fill();
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
		image.src = src;
	});
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('Could not create downloadable image.'));
					return;
				}

				resolve(blob);
			},
			'image/png',
			1
		);
	});
}

export async function createPhotostripBlob({ template, photos, label }: ExportParams): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = WIDTH;
	canvas.height = HEIGHT;

	const context = canvas.getContext('2d');

	if (!context) {
		throw new Error('Could not initialize canvas context.');
	}

	const panelWidth = WIDTH - 40;
	const panelHeight = HEIGHT - 40;
	const panelX = 20;
	const panelY = 20;

	drawRoundedRect(context, panelX, panelY, panelWidth, panelHeight, 14, template.background);

	const slots = [0, 1, 2];
	const frameX = panelX + 42;
	const frameWidth = panelWidth - 84;
	const frameHeight = 500;
	const frameGap = 35;
	const topOffset = panelY + 55;
	const frameBorder = 10;

	for (const slot of slots) {
		const frameY = topOffset + slot * (frameHeight + frameGap);

		drawRoundedRect(context, frameX, frameY, frameWidth, frameHeight, 8, template.frameBorder);

		const innerX = frameX + frameBorder;
		const innerY = frameY + frameBorder;
		const innerWidth = frameWidth - frameBorder * 2;
		const innerHeight = frameHeight - frameBorder * 2;

		drawRoundedRect(context, innerX, innerY, innerWidth, innerHeight, 4, template.frameInner);

		const photo = photos[slot];

		if (photo) {
			const image = await loadImage(photo);

			context.save();
			roundRectPath(context, innerX, innerY, innerWidth, innerHeight, 4);
			context.clip();

			const scale = Math.max(innerWidth / image.width, innerHeight / image.height);
			const drawWidth = image.width * scale;
			const drawHeight = image.height * scale;
			const drawX = innerX + (innerWidth - drawWidth) / 2;
			const drawY = innerY + (innerHeight - drawHeight) / 2;

			context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
			context.restore();
		} else {
			context.fillStyle = '#64748b';
			context.font = '500 54px Georgia';
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillText(`Photo ${slot + 1}`, innerX + innerWidth / 2, innerY + innerHeight / 2);
		}
	}

	context.fillStyle = template.labelColor;
	context.font = 'italic 68px Georgia';
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillText(label, WIDTH / 2, panelY + panelHeight - 195);

	context.fillStyle = '#334155';
	context.font = '500 44px Georgia';
	context.fillText(template.ornament, WIDTH / 2, panelY + panelHeight - 120);

	return canvasToBlob(canvas);
}
