package dev.foki.clearvision

internal fun validateColors(value: Any?): Map<String, Number> {
    val source = value as? Map<*, *> ?: error("Expected a color map")
    require(source.size <= 4096) { "Too many native colors" }
    return source.entries.associate { (key, value) ->
        require(key is String && key.matches(Regex("(dark|light|darker|midnight):[A-Z][A-Z0-9_]*"))) { "Invalid color key" }
        val number = (value as? Number)?.toDouble() ?: error("Expected a numeric ARGB color")
        val dimension = key.endsWith(":EMBED_RADIUS") || key.endsWith(":EMBED_BORDER_WIDTH")
        if (dimension) {
            require(number.isFinite() && number >= 0 && number <= 1024) { "Invalid embed dimension" }
            key to number
        } else {
            require(number.isFinite() && number >= 0 && number <= 4294967295.0 && number == number.toLong().toDouble()) { "Invalid ARGB color" }
            key to number.toLong().toInt()
        }
    }
}
