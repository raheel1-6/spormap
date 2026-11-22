package tr.com.spormap.core.designsystem.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Semantic colour tokens for the "paper map" look. Dark mode dims the paper instead of
 * inverting it, so the same tokens stay recognisably warm.
 */
@Immutable
data class SporColors(
    /** Map canvas behind the regions. */
    val mapBackground: Color,
    /** Faint dot grid drawn on the map canvas. */
    val mapDot: Color,
    /** Outlines of out-of-focus neighbouring regions. */
    val mapGhostOutline: Color,
    /** Cream panel / card paper. */
    val paper: Color,
    /** Hairlines and the double inner border on paper. */
    val paperRule: Color,
    val ink: Color,
    val inkMuted: Color,
    /** Dark rust: selected chip, current breadcrumb. */
    val rustDark: Color,
    /** Burnt orange fill of the selected region. */
    val selectedRegion: Color,
    /** Thick outline (and glow) of the focused parent region. */
    val outlineRust: Color,
    /** Small-caps eyebrows, ornaments. */
    val accent: Color,
    /** Text on rust / selected fills. */
    val onRust: Color,
    /** Region pastels, assigned one per sport category (see categories.json, M5). */
    val pastels: RegionPastels,
    val isDark: Boolean,
)

@Immutable
data class RegionPastels(
    val sage: Color,
    val dustyPink: Color,
    val tan: Color,
    val lavender: Color,
    val olive: Color,
    val greyBlue: Color,
    val cream: Color,
) {
    val all: List<Color> get() = listOf(sage, dustyPink, tan, lavender, olive, greyBlue, cream)
}

val LightSporColors = SporColors(
    mapBackground = Color(0xFFDED2BA),
    mapDot = Color(0x1F1E1408),
    mapGhostOutline = Color(0x33B5441E),
    paper = Color(0xFFF8EFDE),
    paperRule = Color(0xFFD8C8AA),
    ink = Color(0xFF1E1408),
    inkMuted = Color(0xFF6B5A44),
    rustDark = Color(0xFF7A2A14),
    selectedRegion = Color(0xFFAE4F23),
    outlineRust = Color(0xFFB5441E),
    accent = Color(0xFFA2421D),
    onRust = Color(0xFFFFFFFF),
    pastels = RegionPastels(
        sage = Color(0xFFC1D0B9),
        dustyPink = Color(0xFFD2B4BE),
        tan = Color(0xFFD4C2AC),
        lavender = Color(0xFFC8B8C2),
        olive = Color(0xFFD7CEAF),
        greyBlue = Color(0xFFC0C1C3),
        cream = Color(0xFFF1E8D7),
    ),
    isDark = false,
)

/** "Paper by lamplight": same hues, lower luminance, cream ink. */
val DarkSporColors = SporColors(
    mapBackground = Color(0xFF2B251D),
    mapDot = Color(0x1FF1E8D7),
    mapGhostOutline = Color(0x40D9774A),
    paper = Color(0xFF3A3228),
    paperRule = Color(0xFF5A4E3E),
    ink = Color(0xFFF1E8D7),
    inkMuted = Color(0xFFBBAA90),
    rustDark = Color(0xFFB4532D),
    selectedRegion = Color(0xFFC8622F),
    outlineRust = Color(0xFFD9774A),
    accent = Color(0xFFE08A5E),
    onRust = Color(0xFFFFF7EC),
    pastels = RegionPastels(
        sage = Color(0xFF59654F),
        dustyPink = Color(0xFF6E5560),
        tan = Color(0xFF6C5E4C),
        lavender = Color(0xFF625562),
        olive = Color(0xFF6B654A),
        greyBlue = Color(0xFF55585C),
        cream = Color(0xFF7A715F),
    ),
    isDark = true,
)

val LocalSporColors = staticCompositionLocalOf { LightSporColors }
