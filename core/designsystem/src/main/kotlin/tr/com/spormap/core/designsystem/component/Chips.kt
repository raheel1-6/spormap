package tr.com.spormap.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tr.com.spormap.core.designsystem.theme.SporTheme

/** Visual variants of the filter chips in the panel's wrapping chip row. */
sealed interface SporChipStyle {
    /** Category chips and "Tümü". */
    data object Plain : SporChipStyle

    /** Highlight chips ("En İyiler 4,5+", "Açık Hava") with a tinted background. */
    data class Highlight(val tint: Color) : SporChipStyle

    /** Dashed "+N" chip that expands the full category list. */
    data object More : SporChipStyle
}

private val ChipShape = RoundedCornerShape(50)

@Composable
fun SporChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    count: String? = null,
    style: SporChipStyle = SporChipStyle.Plain,
) {
    val colors = SporTheme.colors
    val (bg, fg) = when {
        selected -> colors.rustDark to colors.onRust
        style is SporChipStyle.Highlight -> style.tint to colors.ink
        else -> Color.Transparent to colors.ink
    }
    val borderColor = colors.paperRule
    Box(
        modifier
            .minimumInteractiveComponentSize()
            .semantics {
                role = Role.Checkbox
                this.selected = selected
            }
            .clip(ChipShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            Modifier
                .clip(ChipShape)
                .background(bg)
                .then(
                    when {
                        style is SporChipStyle.More -> Modifier.drawBehind {
                            drawRoundRect(
                                color = borderColor,
                                cornerRadius = CornerRadius(size.height / 2),
                                style = Stroke(
                                    width = 1.dp.toPx(),
                                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx())),
                                ),
                            )
                        }

                        selected -> Modifier

                        else -> Modifier.border(1.dp, borderColor, ChipShape)
                    },
                )
                .padding(horizontal = 12.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(label, style = SporTheme.type.chip, color = fg)
            if (count != null) {
                Text(
                    "  $count",
                    style = SporTheme.type.chip.copy(fontWeight = FontWeight.Bold),
                    color = fg.copy(alpha = 0.8f),
                )
            }
        }
    }
}
