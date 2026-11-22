package tr.com.spormap.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable

/**
 * App theme. Dynamic colour is deliberately off: the paper palette is the brand.
 * Access tokens through [SporTheme.colors] / [SporTheme.type].
 */
@Composable
fun SporHaritasiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkSporColors else LightSporColors
    val scheme = colors.toMaterialScheme()
    CompositionLocalProvider(
        LocalSporColors provides colors,
        LocalSporType provides DefaultSporType,
    ) {
        MaterialTheme(colorScheme = scheme, typography = SporMaterialTypography, content = content)
    }
}

object SporTheme {
    val colors: SporColors
        @Composable @ReadOnlyComposable
        get() = LocalSporColors.current

    val type: SporType
        @Composable @ReadOnlyComposable
        get() = LocalSporType.current
}

private fun SporColors.toMaterialScheme() = if (isDark) {
    darkColorScheme(
        primary = selectedRegion, onPrimary = onRust,
        secondary = rustDark, onSecondary = onRust,
        tertiary = accent,
        background = mapBackground, onBackground = ink,
        surface = paper, onSurface = ink,
        surfaceVariant = paper, onSurfaceVariant = inkMuted,
        surfaceContainer = paper, surfaceContainerHigh = paper, surfaceContainerLow = paper,
        outline = paperRule, outlineVariant = paperRule,
    )
} else {
    lightColorScheme(
        primary = selectedRegion, onPrimary = onRust,
        secondary = rustDark, onSecondary = onRust,
        tertiary = accent,
        background = mapBackground, onBackground = ink,
        surface = paper, onSurface = ink,
        surfaceVariant = paper, onSurfaceVariant = inkMuted,
        surfaceContainer = paper, surfaceContainerHigh = paper, surfaceContainerLow = paper,
        outline = paperRule, outlineVariant = paperRule,
    )
}
