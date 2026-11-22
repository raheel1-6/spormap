package tr.com.spormap.core.model

import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Test

class NumberFormatsTest {
    @Test
    fun `rating uses Turkish decimal comma by default`() {
        assertEquals("4,9", formatRating(4.9))
        assertEquals("5,0", formatRating(5.0))
    }

    @Test
    fun `rating rounds half up on the decimal value`() {
        assertEquals("4,9", formatRating(4.85))
        assertEquals("4,8", formatRating(4.84))
    }

    @Test
    fun `rating uses dot in English`() {
        assertEquals("4.9", formatRating(4.9, Locale.ENGLISH))
    }

    @Test
    fun `count is grouped per locale`() {
        assertEquals("1.234", formatCount(1234))
        assertEquals("1,234", formatCount(1234, Locale.ENGLISH))
        assertEquals("87", formatCount(87))
    }
}
