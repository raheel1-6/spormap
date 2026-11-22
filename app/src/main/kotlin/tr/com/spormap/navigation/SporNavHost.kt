package tr.com.spormap.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import kotlinx.serialization.Serializable
import tr.com.spormap.showcase.ThemeShowcaseScreen

/** Type-safe routes. M2 replaces the showcase with the map; M6 adds venue detail + deep links. */
@Serializable
data object ShowcaseRoute

@Composable
fun SporNavHost() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = ShowcaseRoute) {
        composable<ShowcaseRoute> { ThemeShowcaseScreen() }
    }
}
