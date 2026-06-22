import 'package:flutter/material.dart';

class AppTheme {
  static const _primary = Color(0xFF7C4DFF);
  static const _secondary = Color(0xFF03DAC6);
  static const _error = Color(0xFFCF6679);
  static const _bg = Color(0xFF121218);
  static const _surface = Color(0xFF1E1E2A);
  static const _surfaceVariant = Color(0xFF2A2A3A);
  static const _onSurface = Color(0xFFE8E8F0);
  static const _onSurfaceMuted = Color(0xFF888899);

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: const ColorScheme.dark(
          primary: _primary,
          secondary: _secondary,
          error: _error,
          surface: _surface,
          onSurface: _onSurface,
          surfaceContainerHighest: _surfaceVariant,
        ),
        scaffoldBackgroundColor: _bg,
        cardTheme: CardThemeData(
          color: _surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: _surfaceVariant, width: 1),
          ),
          margin: EdgeInsets.zero,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: _surface,
          foregroundColor: _onSurface,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
        ),
        tabBarTheme: const TabBarThemeData(
          indicatorColor: _primary,
          labelColor: _primary,
          unselectedLabelColor: _onSurfaceMuted,
          dividerColor: _surfaceVariant,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: _surfaceVariant,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: _surfaceVariant),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: _primary),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: _primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            padding:
                const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(foregroundColor: _primary),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: _surfaceVariant,
          labelStyle: const TextStyle(color: _onSurface, fontSize: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(6),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        ),
        dividerTheme: const DividerThemeData(
          color: _surfaceVariant,
          thickness: 1,
          space: 1,
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: _surfaceVariant,
          contentTextStyle: const TextStyle(color: _onSurface),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          behavior: SnackBarBehavior.floating,
        ),
        progressIndicatorTheme:
            const ProgressIndicatorThemeData(color: _primary),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: _primary,
          foregroundColor: Colors.white,
        ),
        dialogTheme: DialogThemeData(
          backgroundColor: _surface,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        bottomSheetTheme: const BottomSheetThemeData(
          backgroundColor: _surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
        ),
        listTileTheme: const ListTileThemeData(
          textColor: _onSurface,
          iconColor: _onSurfaceMuted,
        ),
      );

  // ── Tier colors ───────────────────────────────────────────────────────────────

  static const tierColors = [
    Color(0xFF888899), // 0 – d4 (grey)
    Color(0xFF4CAF50), // 1 – d6 (green)
    Color(0xFF2196F3), // 2 – d12 (blue)
    Color(0xFFAB47BC), // 3 – d20 (purple)
    Color(0xFFFF9800), // 4 – d60 (orange)
    Color(0xFFCF6679), // 5 – d100 (red)
  ];

  static Color tierColor(int tier) =>
      tierColors[tier.clamp(0, tierColors.length - 1)];

  // ── HP/Mana/AP bar colors ─────────────────────────────────────────────────────

  static const hpColor = Color(0xFFE57373);
  static const manaColor = Color(0xFF64B5F6);
  static const apColor = Color(0xFF81C784);
  static const satietyColor = Color(0xFFFFB74D);

  static const onSurfaceMuted = _onSurfaceMuted;
  static const surfaceVariant = _surfaceVariant;
  static const primary = _primary;
}
