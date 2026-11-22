package tr.com.spormap.core.designsystem.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import tr.com.spormap.core.designsystem.theme.SporTheme

/**
 * One line of the menu card:  Venue Name ˢ ·········· 4,9 (312)
 *                             Caddebostan, Kadıköy
 *
 * Numbers arrive pre-formatted (locale-aware, see core:model NumberFormats).
 */
@Composable
fun VenueRow(
    name: String,
    rating: String,
    reviewCount: String,
    subline: String,
    accessibilityLabel: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    badges: List<String> = emptyList(),
) {
    val colors = SporTheme.colors
    val type = SporTheme.type
    Column(
        modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clickable(onClick = onClick)
            .clearAndSetSemantics {
                contentDescription = accessibilityLabel
                role = Role.Button
            }
            .padding(vertical = 6.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = buildAnnotatedString {
                    append(name)
                    badges.forEach { badge ->
                        append(" ")
                        withStyle(
                            SpanStyle(
                                fontFamily = type.badge.fontFamily,
                                fontWeight = type.badge.fontWeight,
                                fontSize = type.badge.fontSize,
                                color = colors.accent,
                                baselineShift = BaselineShift.Superscript,
                            ),
                        ) { append(badge) }
                    }
                },
                style = type.venueName,
                color = colors.ink,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f, fill = false),
            )
            DotLeader(
                Modifier
                    .weight(1f)
                    .padding(start = 6.dp, end = 6.dp, bottom = 6.dp),
            )
            Text(rating, style = type.rating, color = colors.ink)
            Text(" ($reviewCount)", style = type.reviewCount, color = colors.inkMuted)
        }
        Text(subline, style = type.venueSubline, color = colors.inkMuted)
    }
}
