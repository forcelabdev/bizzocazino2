/**
 * Kullanıcıya gösterilecek para birimi/coin etiketini normalize eder.
 *
 * Sistemde varsayılan ana cüzdan "Rivo" coinType değeri ile tutulur
 * (bkz. backend/utils/rivoWallet.js), ancak arayüzde bu birim gerçek
 * para birimi olan TRY (Türk Lirası) olarak gösterilmelidir.
 *
 * Not: Bu fonksiyon yalnızca EKRANDA gösterilen metni etkiler.
 * Veritabanındaki coinType değeri ("Rivo") ve buna bağlı iş mantığı
 * (cüzdan eşleştirme vb.) değişmez.
 */
export const formatCoinType = coinType => {
  if (!coinType) return coinType

  return coinType === 'Rivo' ? 'TRY' : coinType
}
