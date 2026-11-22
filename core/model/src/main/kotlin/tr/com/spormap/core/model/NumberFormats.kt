package tr.com.spormap.core.model

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.text.NumberFormat
import java.util.Locale

/** Turkish is the default locale of the app; English is the only alternative (M7). */
val TurkishLocale: Locale = Locale.forLanguageTag("tr-TR")

/**
 * Formats a Google-style star rating with exactly one decimal, half-up, using the locale's
 * decimal separator: 4.85 → "4,9" in Turkish, "4.9" in English.
 */
fun formatRating(value: Double, locale: Locale = TurkishLocale): String {
    val rounded = BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP)
    val format = DecimalFormat("0.0", DecimalFormatSymbols.getInstance(locale))
    return format.format(rounded)
}

/** Formats a review count with grouping: 1234 → "1.234" in Turkish, "1,234" in English. */
fun formatCount(value: Int, locale: Locale = TurkishLocale): String =
    NumberFormat.getIntegerInstance(locale).format(value)
