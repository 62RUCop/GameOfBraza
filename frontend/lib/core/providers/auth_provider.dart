import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../models/models.dart';

const _kAccessToken = 'access_token';
const _kRefreshToken = 'refresh_token';

// ── Singleton API client ──────────────────────────────────────────────────────

// Base URL can be overridden via dart-define: --dart-define=API_URL=http://...
const _kBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:8000',
);

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(_kBaseUrl));

// ── Auth state ────────────────────────────────────────────────────────────────

class AuthNotifier extends AsyncNotifier<Account?> {
  @override
  Future<Account?> build() async {
    final prefs = await SharedPreferences.getInstance();
    final access = prefs.getString(_kAccessToken);
    final refresh = prefs.getString(_kRefreshToken);
    if (access == null) return null;

    final client = ref.read(apiClientProvider);
    client.setBearer(access);

    try {
      return await client.me();
    } on Exception {
      // Token may be expired — try refresh
      if (refresh != null) {
        try {
          final tokens = await client.refresh(refresh);
          await _saveTokens(tokens);
          client.setBearer(tokens.accessToken);
          return await client.me();
        } on Exception {
          await _clearTokens();
          client.clearBearer();
          return null;
        }
      }
      await _clearTokens();
      client.clearBearer();
      return null;
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    final client = ref.read(apiClientProvider);
    try {
      final tokens = await client.login(email, password);
      await _saveTokens(tokens);
      client.setBearer(tokens.accessToken);
      final account = await client.me();
      state = AsyncData(account);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }

  Future<void> logout() async {
    final client = ref.read(apiClientProvider);
    client.clearBearer();
    await _clearTokens();
    state = const AsyncData(null);
  }

  Future<void> refreshProfile() async {
    final client = ref.read(apiClientProvider);
    try {
      final account = await client.me();
      state = AsyncData(account);
    } catch (_) {}
  }

  Future<void> updateGmSkipConfirmation(bool value) async {
    final account = state.valueOrNull;
    if (account == null) return;
    final client = ref.read(apiClientProvider);
    final updated =
        await client.updateProfile(account.id, gmSkipConfirmation: value);
    state = AsyncData(updated);
  }

  Future<void> _saveTokens(TokenResponse tokens) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kAccessToken, tokens.accessToken);
    await prefs.setString(_kRefreshToken, tokens.refreshToken);
  }

  Future<void> _clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kAccessToken);
    await prefs.remove(_kRefreshToken);
  }
}

final authProvider =
    AsyncNotifierProvider<AuthNotifier, Account?>(AuthNotifier.new);
