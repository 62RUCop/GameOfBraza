import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../models/models.dart';

final authProvider = AsyncNotifierProvider<AuthNotifier, Account?>(() => AuthNotifier());

class AuthNotifier extends AsyncNotifier<Account?> {
  @override
  Future<Account?> build() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    if (token == null) return null;
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/auth/me');
      return Account.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.post('/auth/login', data: {'email': email, 'password': password});
      final data = response.data as Map<String, dynamic>;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('access_token', data['access_token'] as String);
      await prefs.setString('refresh_token', data['refresh_token'] as String);

      final meResponse = await dio.get('/auth/me');
      final account = Account.fromJson(meResponse.data as Map<String, dynamic>);
      state = AsyncData(account);
    } on DioException catch (e) {
      final msg = e.response?.data?['detail'] ?? 'Ошибка входа';
      state = AsyncError(msg, StackTrace.current);
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    state = const AsyncData(null);
  }
}
