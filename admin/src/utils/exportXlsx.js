/**
 * Ortak XLSX dışa aktarım yardımcısı.
 *
 * @param {Object} params
 * @param {Array<Object>} params.rows - Sheet'e yazılacak satırlar (obje dizisi, key = kolon başlığı)
 * @param {string} params.fileName - Uzantısız dosya adı; tarih otomatik eklenir
 * @param {string} [params.sheetName="Sayfa1"] - Sheet adı
 * @param {Array<number>} [params.columnWidths] - Kolon genişlikleri (karakter cinsinden)
 * @returns {Promise<boolean>} başarılıysa true
 */
export const exportToXlsx = async ({
	rows,
	fileName,
	sheetName = "Sayfa1",
	columnWidths,
}) => {
	if (!Array.isArray(rows) || rows.length === 0)
		throw new Error("Dışa aktarılacak veri bulunamadı.");

	const XLSXModule = await import("xlsx");
	const XLSX = XLSXModule.default || XLSXModule;

	const worksheet = XLSX.utils.json_to_sheet(rows);

	if (Array.isArray(columnWidths) && columnWidths.length)
		worksheet["!cols"] = columnWidths.map((wch) => ({ wch }));

	const workbook = XLSX.utils.book_new();

	// Excel sheet adı 31 karakterle sınırlı ve bazı karakterlere izin vermez
	const safeSheet = String(sheetName).replace(/[\\/?*[\]]/g, "").slice(0, 31) || "Sayfa1";

	XLSX.utils.book_append_sheet(workbook, worksheet, safeSheet);

	const dateSuffix = new Date().toISOString().slice(0, 10);

	XLSX.writeFile(workbook, `${fileName}-${dateSuffix}.xlsx`, {
		compression: true,
	});

	return true;
};

/**
 * Kolon genişliklerini satırlardaki en uzun içeriğe göre otomatik hesaplar.
 * @param {Array<Object>} rows
 * @param {number} [min=10]
 * @param {number} [max=40]
 */
export const autoColumnWidths = (rows, min = 10, max = 40) => {
	if (!rows?.length) return [];
	const keys = Object.keys(rows[0]);

	return keys.map((key) => {
		const headerLen = String(key).length;
		const maxCell = rows.reduce((acc, row) => {
			const len = String(row[key] ?? "").length;
			return len > acc ? len : acc;
		}, 0);

		return Math.min(max, Math.max(min, headerLen + 2, maxCell + 2));
	});
};
