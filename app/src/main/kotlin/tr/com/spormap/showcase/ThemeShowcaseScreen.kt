package tr.com.spormap.showcase

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import tr.com.spormap.R
import tr.com.spormap.core.designsystem.component.Breadcrumb
import tr.com.spormap.core.designsystem.component.Crumb
import tr.com.spormap.core.designsystem.component.DotGridBackground
import tr.com.spormap.core.designsystem.component.Eyebrow
import tr.com.spormap.core.designsystem.component.Ornament
import tr.com.spormap.core.designsystem.component.PanelTitle
import tr.com.spormap.core.designsystem.component.PaperPanel
import tr.com.spormap.core.designsystem.component.RegionLabel
import tr.com.spormap.core.designsystem.component.SectionHeader
import tr.com.spormap.core.designsystem.component.SporChip
import tr.com.spormap.core.designsystem.component.SporChipStyle
import tr.com.spormap.core.designsystem.component.VenueRow
import tr.com.spormap.core.designsystem.theme.SporHaritasiTheme
import tr.com.spormap.core.designsystem.theme.SporTheme
import tr.com.spormap.core.model.formatCount
import tr.com.spormap.core.model.formatRating

/**
 * M1 placeholder: every design-system piece on one screen with obviously fake sample data,
 * so the look can be reviewed before the real map exists. Replaced by the map in M2.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ThemeShowcaseScreen() {
    val colors = SporTheme.colors
    var selectedChip by rememberSaveable { mutableStateOf("all") }

    Box(Modifier.fillMaxSize()) {
        DotGridBackground(Modifier.fillMaxSize())

        Column(
            Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Choropleth swatches: unselected pastels, selected rust, focused-parent outline.
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                RegionSwatch("Moda", "Halı Saha", colors.pastels.sage)
                RegionSwatch("Fenerbahçe", "Tenis", colors.selectedRegion, selected = true)
                RegionSwatch("Göztepe", "Fitness", colors.pastels.dustyPink, outlined = true)
            }

            PaperPanel(Modifier.fillMaxWidth()) {
                Eyebrow(listOf("İstanbul", "Kadıköy"))
                Spacer(Modifier.height(4.dp))
                PanelTitle("Caddebostan")
                Spacer(Modifier.height(8.dp))
                Ornament()
                Spacer(Modifier.height(12.dp))

                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    SporChip(stringResource(R.string.chip_all), selectedChip == "all", { selectedChip = "all" })
                    SporChip(
                        stringResource(R.string.chip_best, formatRating(4.5)),
                        selectedChip == "best",
                        { selectedChip = "best" },
                        count = "12",
                        style = SporChipStyle.Highlight(colors.pastels.olive),
                    )
                    SporChip(
                        stringResource(R.string.chip_outdoor),
                        selectedChip == "outdoor",
                        { selectedChip = "outdoor" },
                        count = "7",
                        style = SporChipStyle.Highlight(colors.pastels.sage),
                    )
                    SporChip("Halı Saha", selectedChip == "pitch", { selectedChip = "pitch" })
                    SporChip("Tenis", selectedChip == "tennis", { selectedChip = "tennis" })
                    SporChip("+9", false, {}, style = SporChipStyle.More)
                }

                SectionHeader("Halı Saha")
                SampleRow("Örnek Halı Saha A", 4.86, 312, "Caddebostan", listOf("A"))
                SampleRow("Örnek Spor Tesisi B", 4.6, 1234, "Caddebostan", listOf("B"))
                SectionHeader("Tenis")
                SampleRow("Örnek Tenis Kulübü C", 4.4, 87, "Caddebostan")

                Spacer(Modifier.height(12.dp))
                Text(
                    stringResource(R.string.showcase_footer),
                    style = SporTheme.type.footer,
                    color = colors.inkMuted,
                )
            }

            Breadcrumb(
                crumbs = listOf(
                    Crumb("tr", "Türkiye", enabled = false),
                    Crumb("istanbul", "İstanbul"),
                    Crumb("anadolu", "Anadolu Yakası"),
                    Crumb("kadikoy", "Kadıköy"),
                    Crumb("caddebostan", "Caddebostan"),
                ),
                onCrumbClick = {},
                currentLabel = stringResource(R.string.a11y_current_level),
            )
        }
    }
}

@Composable
private fun RegionSwatch(name: String, category: String, fill: Color, selected: Boolean = false, outlined: Boolean = false) {
    val colors = SporTheme.colors
    val shape = RoundedCornerShape(10.dp)
    Box(
        Modifier
            .size(width = 108.dp, height = 72.dp)
            .then(if (outlined) Modifier.border(3.dp, colors.outlineRust, shape) else Modifier)
            .background(fill, shape),
        contentAlignment = Alignment.Center,
    ) {
        RegionLabel(name, category, selected = selected)
    }
}

@Composable
private fun SampleRow(name: String, rating: Double, count: Int, mahalle: String, badges: List<String> = emptyList()) {
    val r = formatRating(rating)
    val c = formatCount(count)
    VenueRow(
        name = name,
        rating = r,
        reviewCount = c,
        subline = mahalle,
        badges = badges,
        accessibilityLabel = stringResource(R.string.a11y_venue_row, name, r, c, mahalle),
        onClick = {},
    )
}

@Preview(name = "Light", widthDp = 400, heightDp = 900)
@Composable
private fun ShowcaseLightPreview() = SporHaritasiTheme(darkTheme = false) { ThemeShowcaseScreen() }

@Preview(name = "Dark", widthDp = 400, heightDp = 900)
@Composable
private fun ShowcaseDarkPreview() = SporHaritasiTheme(darkTheme = true) { ThemeShowcaseScreen() }
