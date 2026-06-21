import 'package:flutter/material.dart';

class AppTheme {
  static const _primaryColor = Color(0xFFc0392b);
  static const _backgroundColor = Color(0xFF1a1a2e);
  static const _surfaceColor = Color(0xFF16213e);
  static const _cardColor = Color(0xFF0f3460);

  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: _primaryColor,
        secondary: Color(0xFFe74c3c),
        surface: _surfaceColor,
        background: _backgroundColor,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: Colors.white,
        onBackground: Colors.white,
      ),
      scaffoldBackgroundColor: _backgroundColor,
      cardColor: _cardColor,
      cardTheme: const CardThemeData(
        color: _cardColor,
        elevation: 4,
        margin: EdgeInsets.all(4),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: _surfaceColor,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: _primaryColor,
        unselectedLabelColor: Colors.white54,
        indicatorColor: _primaryColor,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _surfaceColor,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Colors.white12)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: _primaryColor)),
        labelStyle: const TextStyle(color: Colors.white54),
        hintStyle: const TextStyle(color: Colors.white38),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primaryColor,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      chipTheme: const ChipThemeData(
        backgroundColor: _cardColor,
        labelStyle: TextStyle(color: Colors.white),
        side: BorderSide.none,
      ),
    );
  }
}
