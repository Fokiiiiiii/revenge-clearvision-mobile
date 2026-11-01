package dev.foki.clearvision
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ColorsTest {
    @Test fun `preserves all ARGB bits`() {
        assertEquals(mapOf("dark:EMBED_BACKGROUND" to 0x80112233.toInt()), validateColors(mapOf("dark:EMBED_BACKGROUND" to 2148606515.0)))
        assertEquals(emptyMap(), validateColors(emptyMap<String, Int>()))
        assertEquals(mapOf("dark:EMBED_RADIUS" to 12.5), validateColors(mapOf("dark:EMBED_RADIUS" to 12.5)))
    }
    @Test fun `rejects malformed bridge values before replacing colors`() {
        for (input in listOf(null, listOf(1), mapOf("bad" to 1), mapOf("dark:TEXT_DEFAULT" to -1), mapOf("dark:TEXT_DEFAULT" to 1.5), mapOf("dark:TEXT_DEFAULT" to Double.NaN), mapOf("dark:TEXT_DEFAULT" to 4294967296.0))) {
            assertFailsWith<Exception> { validateColors(input) }
        }
    }
}
