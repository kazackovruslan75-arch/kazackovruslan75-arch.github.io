import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';

import 'models.dart';

/// YouTube / YouTube Music source: search + audio streams. No API keys needed.
class YtSource {
  final YoutubeExplode _yt = YoutubeExplode();

  static String _cleanTitle(String t) => t
      .replaceAll(RegExp(r'\s*[\(\[](official|lyric|audio|video|music video|mv|hd|4k)[^\)\]]*[\)\]]',
          caseSensitive: false), '')
      .trim();

  static String _cleanArtist(String a) =>
      a.replaceAll(RegExp(r'\s*-\s*Topic$'), '').replaceAll(RegExp(r'VEVO$'), '').trim();

  Track _fromVideo(Video v) => Track(
        id: v.id.value,
        title: _cleanTitle(v.title),
        artist: _cleanArtist(v.author),
        thumb: v.thumbnails.highResUrl,
        seconds: v.duration?.inSeconds ?? 0,
      );

  Future<List<Track>> search(String query) async {
    final res = await _yt.search.search(query);
    return res
        .where((v) => !v.isLive && (v.duration == null || v.duration!.inMinutes < 20))
        .map(_fromVideo)
        .toList();
  }

  Future<List<Track>> related(Track t) async {
    try {
      final video = await _yt.videos.get(t.id);
      final rel = await _yt.videos.getRelatedVideos(video);
      if (rel == null) return [];
      return rel
          .where((v) => !v.isLive && (v.duration == null || v.duration!.inMinutes < 15))
          .map(_fromVideo)
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<AudioOnlyStreamInfo> _bestAudio(String id) async {
    final manifest = await _yt.videos.streamsClient.getManifest(
      id,
      ytClients: [YoutubeApiClient.ios, YoutubeApiClient.androidVr],
    );
    final all = manifest.audioOnly.toList();
    if (all.isEmpty) throw Exception('Нет аудиопотока');
    // iOS AVPlayer plays AAC (mp4/m4a), not WebM/Opus.
    final mp4 = all.where((s) => s.container == StreamContainer.mp4).toList();
    final list = mp4.isNotEmpty ? mp4 : all;
    list.sort((a, b) => b.bitrate.compareTo(a.bitrate));
    return list.first;
  }

  Future<Uri> streamUrl(String id) async => (await _bestAudio(id)).url;

  Future<File> cachedFile(String id) async {
    final dir = await getTemporaryDirectory();
    return File('${dir.path}/audio_$id.m4a');
  }

  /// Downloads audio to a local file (fallback when direct streaming fails).
  Future<File> download(String id) async {
    final file = await cachedFile(id);
    if (await file.exists() && await file.length() > 10000) return file;
    final info = await _bestAudio(id);
    final tmp = File('${file.path}.part');
    final sink = tmp.openWrite();
    await _yt.videos.streamsClient.get(info).pipe(sink);
    await tmp.rename(file.path);
    return file;
  }
}
