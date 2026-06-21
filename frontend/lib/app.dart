import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/providers/auth_provider.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/characters/character_list_screen.dart';
import 'features/characters/character_create_screen.dart';
import 'features/characters/character_sheet_screen.dart';
import 'features/admin_panel/admin_panel_screen.dart';
import 'features/gm_panel/gm_panel_screen.dart';

final _routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.asData?.value != null;
      final isLoginPage = state.matchedLocation == '/login';

      if (!isLoggedIn && !isLoginPage) return '/login';
      if (isLoggedIn && isLoginPage) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/',
        builder: (_, __) => const CharacterListScreen(),
        routes: [
          GoRoute(path: 'new', builder: (_, __) => const CharacterCreateScreen()),
          GoRoute(
            path: 'characters/:id',
            builder: (_, state) => CharacterSheetScreen(characterId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(path: '/gm', builder: (_, __) => const GmPanelScreen()),
      GoRoute(path: '/admin', builder: (_, __) => const AdminPanelScreen()),
    ],
  );
});

class GameOfBrazaApp extends ConsumerWidget {
  const GameOfBrazaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);

    return MaterialApp.router(
      title: 'GameOfBraza',
      theme: AppTheme.dark(),
      routerConfig: router,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('ru', 'RU')],
      locale: const Locale('ru', 'RU'),
      debugShowCheckedModeBanner: false,
    );
  }
}
