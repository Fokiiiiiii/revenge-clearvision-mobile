@file:JvmName("ClearVision")
package dev.foki.clearvision

import android.content.res.ColorStateList
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import io.github.revenge.plugins.plugin
import io.github.revenge.xposed.api.registerNativeMethod
import java.lang.reflect.Method
import java.lang.reflect.Modifier
import java.util.WeakHashMap

@Volatile private var colors: Map<String, Number> = emptyMap()
private val hooks = mutableListOf<XC_MethodHook.Unhook>()
private val tokenNames = mutableSetOf<String>()
private val embeds = WeakHashMap<View, Drawable.ConstantState?>()
private val textColors = WeakHashMap<TextView, ColorStateList>()
@Volatile private var active = false

private fun mode(name: String): String = when {
    name.contains("Light") -> "light"
    name.contains("Onyx") -> "midnight"
    name.contains("Dark") -> "darker"
    else -> "dark"
}

private fun token(method: Method) = method.name.removePrefix("get")
    .replace(Regex("([a-z0-9])([A-Z])"), "$1_$2").uppercase()

private fun styleEmbed(view: View, variant: String) {
    if (!embeds.containsKey(view)) embeds[view] = view.background?.constantState
    val drawable = (embeds[view]?.newDrawable()?.mutate() as? GradientDrawable) ?: GradientDrawable()
    val density = view.resources.displayMetrics.density
    colors["$variant:EMBED_BACKGROUND"]?.let { drawable.setColor(it.toInt()) }
    colors["$variant:EMBED_RADIUS"]?.let { drawable.cornerRadius = it.toFloat() * density }
    colors["$variant:EMBED_BORDER_COLOR"]?.let {
        val width = colors["$variant:EMBED_BORDER_WIDTH"]?.toFloat() ?: 1f
        drawable.setStroke(kotlin.math.round(width * density).toInt(), it.toInt())
    }
    view.background = drawable
    fun text(node: View) {
        if (node is TextView) {
            val name = runCatching { node.resources.getResourceEntryName(node.id) }.getOrDefault("")
            val key = if (name.contains("title", true)) "EMBED_TITLE" else "EMBED_TEXT"
            if (!textColors.containsKey(node)) textColors[node] = node.textColors
            colors["$variant:$key"]?.let { node.setTextColor(it.toInt()) } ?: node.setTextColor(textColors[node])
        }
        if (node is ViewGroup) for (index in 0 until node.childCount) text(node.getChildAt(index))
    }
    text(view)
}

val clearVision = plugin {
    start {
        active = true
        val hooked = mutableSetOf<Method>()
        val classes = listOf("AshTheme", "DarkTheme", "OnyxTheme", "LightTheme", "AshThemeExperiment", "DarkThemeExperiment", "OnyxThemeExperiment", "LightThemeExperiment")
        for (name in classes) {
            val type = runCatching { classLoader.loadClass("com.discord.theme.$name") }.getOrNull() ?: continue
            for (method in type.methods) {
                if (Modifier.isStatic(method.modifiers) || !method.name.startsWith("get") || method.parameterCount != 0 || method.returnType != Int::class.javaPrimitiveType || !hooked.add(method)) continue
                val key = token(method)
                tokenNames += key
                hooks += XposedBridge.hookMethod(method, object : XC_MethodHook() {
                    override fun beforeHookedMethod(param: MethodHookParam) {
                        colors["${mode(param.thisObject.javaClass.simpleName)}:$key"]?.let { param.result = it.toInt() }
                    }
                })
            }
        }
        val themeGetter = classLoader.loadClass("com.discord.theme.ThemeManagerKt").getDeclaredMethod("getTheme")
        fun currentMode() = mode(themeGetter.invoke(null).javaClass.simpleName)
        val embedClass = classLoader.loadClass("com.discord.chat.presentation.message.view.EmbedView")
        for (method in embedClass.declaredMethods.filter { it.name.startsWith("setEmbed") && !it.name.contains('$') }) {
            hooks += XposedBridge.hookMethod(method, object : XC_MethodHook() {
                override fun afterHookedMethod(param: MethodHookParam) {
                    val view = param.thisObject as View
                    view.post { if (active) { styleEmbed(view, currentMode()) } }
                }
            })
        }
        registerNativeMethod("clearvision.describe") { mapOf("tokens" to tokenNames.toList(), "hooks" to hooks.size) }
        registerNativeMethod("clearvision.apply") { args ->
            check(active) { "ClearVision native plugin is stopped" }
            colors = validateColors(args.firstOrNull())
            withAppActivity { activity -> activity.runOnUiThread { embeds.keys.toList().forEach { styleEmbed(it, currentMode()) } } }
            mapOf("colors" to colors.size, "hooks" to hooks.size)
        }
        log.i("Native theme hooks ready: ${hooks.size}, ${tokenNames.size} roles")
        if (startedLate) requireReload()
    }
    stop {
        active = false
        colors = emptyMap()
        hooks.forEach { it.unhook() }
        hooks.clear()
        tokenNames.clear()
        withAppActivity { activity -> activity.runOnUiThread {
            embeds.forEach { (view, state) -> view.background = state?.newDrawable() }
            textColors.forEach { (view, color) -> view.setTextColor(color) }
            embeds.clear()
            textColors.clear()
        } }
        requireReload()
    }
}
