package tr.com.spormap.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import tr.com.spormap.core.designsystem.theme.SporTheme

/** One crumb. [enabled] = false for the future-expansion "Türkiye" crumb. */
data class Crumb(val id: String, val label: String, val enabled: Boolean = true)

/**
 * Pill bar at the bottom-left of the map. The last crumb is the current level (filled rust);
 * earlier enabled crumbs navigate up.
 */
@Composable
fun Breadcrumb(
    crumbs: List<Crumb>,
    onCrumbClick: (Crumb) -> Unit,
    modifier: Modifier = Modifier,
    currentLabel: String = "",
) {
    val colors = SporTheme.colors
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = colors.paper,
        shadowElevation = 4.dp,
    ) {
        Row(
            Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            crumbs.forEachIndexed { index, crumb ->
                val isCurrent = index == crumbs.lastIndex
                if (index > 0) {
                    Text("›", style = SporTheme.type.crumb, color = colors.inkMuted, modifier = Modifier.clearAndSetSemantics { })
                }
                val clickable = crumb.enabled && !isCurrent
                Box(
                    Modifier
                        .minimumInteractiveComponentSize()
                        .semantics {
                            role = Role.Button
                            if (isCurrent) stateDescription = currentLabel
                            if (!crumb.enabled) disabled()
                        }
                        .clip(RoundedCornerShape(50))
                        .then(if (clickable) Modifier.clickable { onCrumbClick(crumb) } else Modifier),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = crumb.label,
                        style = SporTheme.type.crumb,
                        color = when {
                            isCurrent -> colors.onRust
                            crumb.enabled -> colors.ink
                            else -> colors.inkMuted.copy(alpha = 0.6f)
                        },
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .then(if (isCurrent) Modifier.background(colors.rustDark) else Modifier)
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    )
                }
            }
        }
    }
}
