import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../models/models.dart';

final characterListProvider = FutureProvider<List<CharacterListItem>>((ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/characters');
  final list = response.data as List<dynamic>;
  return list.map((e) => CharacterListItem.fromJson(e as Map<String, dynamic>)).toList();
});

final characterProvider = FutureProvider.family<Character, String>((ref, id) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/characters/$id');
  return Character.fromJson(response.data as Map<String, dynamic>);
});
