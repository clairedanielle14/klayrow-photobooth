import type { PhotostripTemplate } from '$lib/types/photostrip';

export const PHOTOSTRIP_TEMPLATES: PhotostripTemplate[] = [
	{
		id: 'forest',
		name: 'Forest',
		tagline: 'Froggy meadow mood',
		background: '#94bf67',
		panel: '#c7e1aa',
		frameBorder: '#f7f9f2',
		frameInner: '#e7efd9',
		labelColor: '#10210b',
		ornament: 'Frog + flowers'
	},
	{
		id: 'birthday',
		name: 'Birthday',
		tagline: 'Party pastel vibe',
		background: '#f9b9b3',
		panel: '#ffd9d5',
		frameBorder: '#fff6ec',
		frameInner: '#fff1e4',
		labelColor: '#4a2339',
		ornament: 'Cake + ribbons'
	}
];
