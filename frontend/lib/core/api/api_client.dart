import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _baseUrl = String.fromEnvironment('API_URL', defaultValue: 'http://localhost:8000');

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(baseUrl: _baseUrl, connectTimeout: const Duration(seconds: 10)));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        final prefs = await SharedPreferences.getInstance();
        final refreshToken = prefs.getString('refresh_token');
        if (refreshToken != null) {
          try {
            final dio2 = Dio(BaseOptions(baseUrl: _baseUrl));
            final response = await dio2.post('/auth/refresh', data: {'refresh_token': refreshToken});
            final newToken = response.data['access_token'];
            await prefs.setString('access_token', newToken);
            error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
            final retry = await dio.fetch(error.requestOptions);
            return handler.resolve(retry);
          } catch (_) {
            await prefs.remove('access_token');
            await prefs.remove('refresh_token');
          }
        }
      }
      handler.next(error);
    },
  ));

  return dio;
});
