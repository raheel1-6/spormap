package tr.com.spormap

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import tr.com.spormap.core.designsystem.theme.SporHaritasiTheme
import tr.com.spormap.navigation.SporNavHost

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            SporHaritasiTheme {
                SporNavHost()
            }
        }
    }
}
