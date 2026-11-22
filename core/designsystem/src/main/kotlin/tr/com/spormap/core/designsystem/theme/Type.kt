package tr.com.spormap.core.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import tr.com.spormap.core.designsystem.R

/* Bundled variable fonts (SIL OFL 1.1, see /licenses). minSdk 26 supports variation axes. */

private const val DISPLAY_OPSZ = 72f
private const val TEXT_OPSZ = 18f
private const val FRAUNCES_SOFTNESS = 50f

@OptIn(ExperimentalTextApi::class)
private fun fraunces(weight: FontWeight, italic: Boolean, opticalSize: Float) = Font(
    resId = if (italic) R.font.fraunces_italic else R.font.fraunces,
    weight = weight,
    style = if (italic) FontStyle.Italic else FontStyle.Normal,
    variationSettings = FontVariation.Settings(
        FontVariation.weight(weight.weight),
        FontVariation.Setting("opsz", opticalSize),
        FontVariation.Setting("SOFT", FRAUNCES_SOFTNESS),
    ),
)

@OptIn(ExperimentalTextApi::class)
private fun inter(weight: FontWeight, italic: Boolean = false) = Font(
    resId = if (italic) R.font.inter_italic else R.font.inter,
    weight = weight,
    style = if (italic) FontStyle.Italic else FontStyle.Normal,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
)

private val serifWeights = listOf(FontWeight.Normal, FontWeight.Medium, FontWeight.SemiBold, FontWeight.Bold)

/** Fraunces at display optical size: panel titles. */
val FrauncesDisplay = FontFamily(
    serifWeights.flatMap { listOf(fraunces(it, false, DISPLAY_OPSZ), fraunces(it, true, DISPLAY_OPSZ)) },
)

/** Fraunces at text optical size: venue names in lists. */
val FrauncesText = FontFamily(
    serifWeights.flatMap { listOf(fraunces(it, false, TEXT_OPSZ), fraunces(it, true, TEXT_OPSZ)) },
)

val Inter = FontFamily(
    inter(FontWeight.Normal),
    inter(FontWeight.Medium),
    inter(FontWeight.SemiBold),
    inter(FontWeight.Bold),
    inter(FontWeight.Normal, italic = true),
)

/** Tabular figures so ratings line up in a column. */
private const val TABULAR = "tnum"

/** App-specific text roles that Material's scale doesn't name. */
@Immutable
data class SporType(
    val panelTitle: TextStyle,
    val eyebrow: TextStyle,
    val ornament: TextStyle,
    val sectionHeader: TextStyle,
    val listHeading: TextStyle,
    val venueName: TextStyle,
    val venueSubline: TextStyle,
    val rating: TextStyle,
    val reviewCount: TextStyle,
    val badge: TextStyle,
    val chip: TextStyle,
    val crumb: TextStyle,
    val regionLabel: TextStyle,
    val regionCategory: TextStyle,
    val footer: TextStyle,
)

val DefaultSporType = SporType(
    panelTitle = TextStyle(
        fontFamily = FrauncesDisplay,
        fontStyle = FontStyle.Italic,
        fontWeight = FontWeight.Medium,
        fontSize = 34.sp,
        lineHeight = 38.sp,
    ),
    eyebrow = TextStyle(fontFamily = Inter, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, letterSpacing = 1.6.sp),
    ornament = TextStyle(fontFamily = FrauncesText, fontSize = 12.sp, letterSpacing = 4.sp),
    sectionHeader = TextStyle(fontFamily = Inter, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, letterSpacing = 2.sp),
    listHeading = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 1.4.sp),
    venueName = TextStyle(fontFamily = FrauncesText, fontWeight = FontWeight.Normal, fontSize = 17.sp, lineHeight = 22.sp),
    venueSubline = TextStyle(fontFamily = Inter, fontSize = 12.sp, lineHeight = 16.sp),
    rating = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Bold, fontSize = 15.sp, fontFeatureSettings = TABULAR),
    reviewCount = TextStyle(fontFamily = Inter, fontSize = 13.sp, fontFeatureSettings = TABULAR),
    badge = TextStyle(fontFamily = Inter, fontWeight = FontWeight.SemiBold, fontSize = 9.sp, letterSpacing = 0.6.sp),
    chip = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Medium, fontSize = 13.sp, fontFeatureSettings = TABULAR),
    crumb = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Medium, fontSize = 13.sp),
    regionLabel = TextStyle(fontFamily = Inter, fontWeight = FontWeight.SemiBold, fontSize = 13.sp),
    regionCategory = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Medium, fontSize = 8.sp, letterSpacing = 1.2.sp),
    footer = TextStyle(fontFamily = Inter, fontSize = 11.sp, lineHeight = 15.sp),
)

val LocalSporType = staticCompositionLocalOf { DefaultSporType }

/** Material roles mapped onto the same two families, for stock M3 components. */
val SporMaterialTypography: Typography = Typography().let { base ->
    base.copy(
        displayLarge = base.displayLarge.copy(fontFamily = FrauncesDisplay),
        displayMedium = base.displayMedium.copy(fontFamily = FrauncesDisplay),
        displaySmall = base.displaySmall.copy(fontFamily = FrauncesDisplay),
        headlineLarge = base.headlineLarge.copy(fontFamily = FrauncesDisplay),
        headlineMedium = base.headlineMedium.copy(fontFamily = FrauncesDisplay),
        headlineSmall = base.headlineSmall.copy(fontFamily = FrauncesDisplay),
        titleLarge = base.titleLarge.copy(fontFamily = FrauncesText),
        titleMedium = base.titleMedium.copy(fontFamily = Inter),
        titleSmall = base.titleSmall.copy(fontFamily = Inter),
        bodyLarge = base.bodyLarge.copy(fontFamily = Inter),
        bodyMedium = base.bodyMedium.copy(fontFamily = Inter),
        bodySmall = base.bodySmall.copy(fontFamily = Inter),
        labelLarge = base.labelLarge.copy(fontFamily = Inter),
        labelMedium = base.labelMedium.copy(fontFamily = Inter),
        labelSmall = base.labelSmall.copy(fontFamily = Inter),
    )
}
