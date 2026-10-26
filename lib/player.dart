import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';
import 'yt.dart';

enum Repeat { off, all, one }

class PlayerModel extends ChangeNotifier {
  final YtSource yt = YtSource();
  final AudioPlayer player = AudioPlayer();
  final Random _rnd = Random();

  List<Track> queue = [];
  int index = -1;
  bool loading = false;
  String? error;
  bool shuffle = false;
  Repeat repeat = Repeat.off;
  bool autoplay = true;

  List<Track> liked = [];
  List<Track> recent = [];
  List<String> history = [];

  int _req = 0;
  SharedPreferences? _prefs;

  Track? get current => (index >= 0 && index < queue.length) ? queue[index] : null;
  bool get playing => player.playing;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    liked = _readList('liked');
    recent = _readList('recent');
    history = _prefs!.getStringList('history') ?? [];
    shuffle = _prefs!.getBool('shuffle') ?? false;
    autoplay = _prefs!.getBool('autoplay') ?? true;
    repeat = Repeat.values[_prefs!.getInt('repeat') ?? 0];

    player.playerStateStream.listen((s) {
      if (s.processingState == ProcessingState.completed) {
        _onCompleted();
      }
      notifyListeners();
    });
    notifyListeners();
  }

  List<Track> _readList(String key) {
    final raw = _prefs?.getString(key);
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List)
          .map((e) => Track.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  void _writeList(String key, List<Track> list) {
    _prefs?.setString(key, jsonEncode(list.map((t) => t.toJson()).toList()));
  }

  // ---------- library ----------
  bool isLiked(Track t) => liked.contains(t);

  void toggleLike(Track t) {
    if (liked.contains(t)) {
      liked.remove(t);
    } else {
      liked.insert(0, t);
    }
    _writeList('liked', liked);
    notifyListeners();
  }

  void _addRecent(Track t) {
    recent.remove(t);
    recent.insert(0, t);
    if (recent.length > 50) recent = recent.sublist(0, 50);
    _writeList('recent', recent);
  }

  void addSearch(String q) {
    q = q.trim();
    if (q.isEmpty) return;
    history.remove(q);
    history.insert(0, q);
    if (history.length > 15) history = history.sublist(0, 15);
    _prefs?.setStringList('history', history);
    notifyListeners();
  }

  void clearHistory() {
    history = [];
    _prefs?.setStringList('history', history);
    notifyListeners();
  }

  // ---------- queue ----------
  Future<void> playList(List<Track> list, int i) async {
    queue = List.of(list);
    index = i;
    await _load();
  }

  void playNext(Track t) {
    if (current == null) {
      playList([t], 0);
      return;
    }
    queue.remove(t);
    queue.insert(index + 1, t);
    notifyListeners();
  }

  void addToQueue(Track t) {
    if (current == null) {
      playList([t], 0);
      return;
    }
    if (!queue.contains(t)) queue.add(t);
    notifyListeners();
  }

  void jumpTo(int i) {
    if (i < 0 || i >= queue.length) return;
    index = i;
    _load();
  }

  void removeAt(int i) {
    if (i == index || i < 0 || i >= queue.length) return;
    queue.removeAt(i);
    if (i < index) index--;
    notifyListeners();
  }

  Future<void> _load() async {
    final t = current;
    if (t == null) return;
    final req = ++_req;
    loading = true;
    error = null;
    _addRecent(t);
    notifyListeners();

    final tag = MediaItem(
      id: t.id,
      title: t.title,
      artist: t.artist,
      artUri: t.thumb.isEmpty ? null : Uri.tryParse(t.thumb),
      duration: t.seconds > 0 ? Duration(seconds: t.seconds) : null,
    );

    try {
      await player.stop();
      final cached = await yt.cachedFile(t.id);
      bool ok = false;
      if (await cached.exists()) {
        try {
          await player.setAudioSource(AudioSource.file(cached.path, tag: tag));
          ok = true;
        } catch (_) {}
      }
      if (!ok) {
        try {
          final url = await yt.streamUrl(t.id);
          if (req != _req) return;
          await player
              .setAudioSource(AudioSource.uri(url, tag: tag))
              .timeout(const Duration(seconds: 15));
          ok = true;
        } catch (_) {
          if (req != _req) return;
          final f = await yt.download(t.id);
          if (req != _req) return;
          await player.setAudioSource(AudioSource.file(f.path, tag: tag));
          ok = true;
        }
      }
      if (req != _req) return;
      loading = false;
      notifyListeners();
      unawaited(player.play());
    } catch (e) {
      if (req != _req) return;
      loading = false;
      error = 'Не удалось воспроизвести трек';
      notifyListeners();
    }
  }

  void _onCompleted() {
    if (repeat == Repeat.one) {
      player.seek(Duration.zero);
      player.play();
      return;
    }
    next();
  }

  Future<void> next() async {
    if (queue.isEmpty) return;
    if (shuffle && queue.length > 1) {
      int n;
      do {
        n = _rnd.nextInt(queue.length);
      } while (n == index);
      index = n;
    } else if (index + 1 < queue.length) {
      index++;
    } else if (repeat == Repeat.all) {
      index = 0;
    } else if (autoplay && current != null) {
      final more = (await yt.related(current!)).where((t) => !queue.contains(t)).take(10);
      if (more.isEmpty) {
        await player.pause();
        await player.seek(Duration.zero);
        return;
      }
      queue.addAll(more);
      index++;
    } else {
      await player.pause();
      await player.seek(Duration.zero);
      notifyListeners();
      return;
    }
    await _load();
  }

  Future<void> previous() async {
    if (player.position > const Duration(seconds: 3) || index <= 0) {
      await player.seek(Duration.zero);
      return;
    }
    index--;
    await _load();
  }

  void toggle() {
    if (current == null) return;
    if (error != null) {
      _load();
      return;
    }
    player.playing ? player.pause() : player.play();
  }

  void toggleShuffle() {
    shuffle = !shuffle;
    _prefs?.setBool('shuffle', shuffle);
    notifyListeners();
  }

  void cycleRepeat() {
    repeat = Repeat.values[(repeat.index + 1) % Repeat.values.length];
    _prefs?.setInt('repeat', repeat.index);
    notifyListeners();
  }

  void setAutoplay(bool v) {
    autoplay = v;
    _prefs?.setBool('autoplay', v);
    notifyListeners();
  }
}
