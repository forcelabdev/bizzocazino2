window.ASSET_URL = new URL("https://apibizzocasino.site");
window.toAssetUrl = (path) => {
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	return new URL(cleanPath, window.ASSET_URL).toString();
};