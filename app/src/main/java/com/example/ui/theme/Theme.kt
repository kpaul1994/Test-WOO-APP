package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

enum class ThemeMode(val label: String) {
    SYSTEM("System"),
    LIGHT("Light"),
    DARK("Dark")
}

private val LightColorScheme = lightColorScheme(
    primary = ObsidianPrimary,
    onPrimary = AlabasterBg,
    primaryContainer = CashmerePrimaryContainer,
    onPrimaryContainer = ObsidianPrimary,
    secondary = TerracottaSecondary,
    onSecondary = Color.White,
    secondaryContainer = TerracottaContainer,
    onSecondaryContainer = TerracottaOnContainer,
    tertiary = BotanicalTertiary,
    onTertiary = Color.White,
    tertiaryContainer = BotanicalContainer,
    onTertiaryContainer = BotanicalOnContainer,
    background = AlabasterBg,
    onBackground = EspressoOnSurface,
    surface = PorcelainSurface,
    onSurface = EspressoOnSurface,
    surfaceVariant = SandSurfaceVariant,
    onSurfaceVariant = TaupeOnSurfaceVariant,
    surfaceContainerLow = SandSurfaceVariant,
    surfaceContainer = SandSurfaceContainer,
    outline = WarmOutline,
    outlineVariant = WarmOutlineVariant,
    error = ErrorCrimson,
    onError = Color.White,
    errorContainer = ErrorContainerLight,
    onErrorContainer = Color(0xFF410E0B)
)

private val DarkColorScheme = darkColorScheme(
    primary = WarmIvoryPrimary,
    onPrimary = ObsidianPrimary,
    primaryContainer = DarkCashmereContainer,
    onPrimaryContainer = WarmIvoryPrimary,
    secondary = DarkTerracottaSecondary,
    onSecondary = ObsidianPrimary,
    secondaryContainer = DarkTerracottaContainer,
    onSecondaryContainer = DarkTerracottaOnContainer,
    tertiary = DarkBotanicalTertiary,
    onTertiary = ObsidianPrimary,
    tertiaryContainer = DarkBotanicalContainer,
    onTertiaryContainer = DarkBotanicalOnContainer,
    background = DarkObsidianBg,
    onBackground = IvoryOnSurface,
    surface = DarkEspressoSurface,
    onSurface = IvoryOnSurface,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = MutedSandOnSurfaceVariant,
    surfaceContainerLow = DarkEspressoSurface,
    surfaceContainer = DarkSurfaceContainer,
    outline = DarkOutline,
    outlineVariant = DarkOutlineVariant,
    error = ErrorDark,
    onError = Color(0xFF601410),
    errorContainer = ErrorContainerDark,
    onErrorContainer = ErrorDark
)

val MercatoShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

@Composable
fun MercatoTheme(
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val darkTheme = when (themeMode) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }

    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MercatoTypography,
        shapes = MercatoShapes,
        content = content
    )
}
