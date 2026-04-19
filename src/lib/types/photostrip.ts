export type PhotostripTemplateId = 'forest' | 'birthday';

export type PhotostripTemplate = {
	id: PhotostripTemplateId;
	name: string;
	tagline: string;
	background: string;
	panel: string;
	frameBorder: string;
	frameInner: string;
	labelColor: string;
	ornament: string;
};
