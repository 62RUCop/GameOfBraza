import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/providers/auth_provider.dart';
import 'features/auth/login_screen.dart';
import 'features/characters/character_create_screen.dart';
import 'features/characters/character_list_screen.dart';
import 'features/characters/character_sheet_screen.dart';
import 'features/gm_panel/gm_panel_screen.dart';
import 'features/admin_panel/admin_panel_screen.dart';
import 'core/theme/app_theme.dart';

// ── Router ────────────────────────────────────────────────────────────────────

final _routerProvider = Provider<GoRouter>((ref) {
  final authListenable = _AuthListenable(ref);

  return GoRouter(
    refreshListenable: authListenable,
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final loggedIn = authState.valueOrNull != null;
      final isLoading = authState.isLoading;
      final isLogin = state.matchedLocation == '/login';

      if (isLoading) return null;
      if (!loggedIn && !isLogin) return '/login';
      if (loggedIn && isLogin) return '/characters';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/characters',
        builder: (_, __) => const CharacterListScreen(),
      ),
      GoRoute(
        path: '/characters/new',
        builder: (_, __) => const CharacterCreateScreen(),
      ),
      GoRoute(
        path: '/characters/:id',
        builder: (_, state) =>
            CharacterSheetScreen(characterId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/gm',
        builder: (_, __) => const GmPanelScreen(),
        redirect: (context, state) {
          final auth = ref.read(authProvider).valueOrNull;
          if (auth == null || !auth.isGmOrAdmin) return '/characters';
          return null;
        },
      ),
      GoRoute(
        path: '/admin',
        builder: (_, __) => const AdminPanelScreen(),
        redirect: (context, state) {
          final auth = ref.read(authProvider).valueOrNull;
          if (auth == null || !auth.isAdmin) return '/characters';
          return null;
        },
      ),
    ],
    initialLocation: '/characters',
  );
});

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
}

// ── App widget ────────────────────────────────────────────────────────────────

class GameOfBrazaApp extends ConsumerWidget {
  const GameOfBrazaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);

    return MaterialApp.router(
      title: 'Game of Braza',
      theme: AppTheme.dark,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
