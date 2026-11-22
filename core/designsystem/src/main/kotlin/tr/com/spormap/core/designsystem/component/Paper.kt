package tr.com.spormap.core.designsystem.component

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import tr.com.spormap.core.designsystem.theme.SporTheme

/** Cream "menu card" with a double inner border. Used by the venue panel and tooltips. */
@Composable
fun PaperPanel(
    modifier: Modifier = Modifier,
    contentPadding: Dp = 20.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = SporTheme.colors
    Surface(
        modifier = modifier,
        color = colors.paper,
        contentColor = colors.ink,
        shape = RoundedCornerShape(6.dp),
        shadowElevation = 8.dp,
    ) {
        Column(
            Modifier
                .padding(6.dp)
                .border(1.dp, colors.paperRule, RoundedCornerShape(3.dp))
                .padding(3.dp)
                .border(0.5.dp, colors.paperRule, RoundedCornerShape(2.dp))
                .padding(contentPadding),
            content = content,
        )
    }
}

/** Small rust caps above the title, e.g. "İSTANBUL · KADIKÖY". Uppercased with Turkish rules. */
@Composable
fun Eyebrow(parts: List<String>, modifier: Modifier = Modifier) {
    Text(
        text = parts.joinToString("  ·  ") { it.uppercase(tr.com.spormap.core.model.TurkishLocale) },
        style = SporTheme.type.eyebrow,
        color = SporTheme.colors.accent,
        modifier = modifier,
    )
}

@Composable
fun PanelTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = SporTheme.type.panelTitle,
        color = SporTheme.colors.ink,
        modifier = modifier.semantics { heading() },
    )
}

/** "✦ ✦ ✦" divider under the title. Decorative, hidden from accessibility services. */
@Composable
fun Ornament(modifier: Modifier = Modifier) {
    Text(
        text = "✦ ✦ ✦",
        style = SporTheme.type.ornament,
        color = SporTheme.colors.accent,
        textAlign = TextAlign.Center,
        modifier = modifier.fillMaxWidth().clearAndSetSemantics { },
    )
}

/** Centered small-caps header flanked by hairlines: ——  HALI SAHA  —— */
@Composable
fun SectionHeader(text: String, modifier: Modifier = Modifier) {
    val colors = SporTheme.colors
    Row(
        modifier = modifier.fillMaxWidth().padding(vertical = 10.dp).semantics { heading() },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        HorizontalDivider(Modifier.weight(1f), thickness = 0.75.dp, color = colors.paperRule)
        Text(
            text = text.uppercase(tr.com.spormap.core.model.TurkishLocale),
            style = SporTheme.type.sectionHeader,
            color = colors.inkMuted,
        )
        HorizontalDivider(Modifier.weight(1f), thickness = 0.75.dp, color = colors.paperRule)
    }
}

/** Dotted leader that fills the gap between a venue name and its rating. */
@Composable
fun DotLeader(modifier: Modifier = Modifier, color: Color = SporTheme.colors.inkMuted.copy(alpha = 0.55f)) {
    Canvas(modifier.height(2.dp)) {
        val step = 4.dp.toPx()
        val r = 0.7.dp.toPx()
        var x = r
        while (x < size.width - r) {
            drawCircle(color, radius = r, center = Offset(x, size.height / 2))
            x += step
        }
    }
}

/** Faint dot grid painted on the map canvas behind the regions. */
@Composable
fun DotGridBackground(modifier: Modifier = Modifier, spacing: Dp = 14.dp) {
    val colors = SporTheme.colors
    Canvas(modifier) {
        drawRect(colors.mapBackground)
        val step = spacing.toPx()
        val r = 0.9.dp.toPx()
        var y = step / 2
        while (y < size.height) {
            var x = step / 2
            while (x < size.width) {
                drawCircle(colors.mapDot, radius = r, center = Offset(x, y))
                x += step
            }
            y += step
        }
    }
}

/** Two-line region label as drawn on the map: name + top category in tiny spaced caps. */
@Composable
fun RegionLabel(
    name: String,
    topCategory: String?,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
) {
    val colors = SporTheme.colors
    val ink = if (selected) colors.onRust else colors.ink
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(name, style = SporTheme.type.regionLabel, color = ink)
        if (topCategory != null) {
            Text(
                topCategory.uppercase(tr.com.spormap.core.model.TurkishLocale),
                style = SporTheme.type.regionCategory,
                color = ink.copy(alpha = 0.75f),
            )
        }
    }
}
