class Track {
  final String id;
  final String title;
  final String artist;
  final String thumb;
  final int seconds;

  const Track({
    required this.id,
    required this.title,
    required this.artist,
    required this.thumb,
    required this.seconds,
  });

  String get durationText {
    if (seconds <= 0) return '';
    final m = seconds ~/ 60;
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'artist': artist,
        'thumb': thumb,
        'seconds': seconds,
      };

  factory Track.fromJson(Map<String, dynamic> j) => Track(
        id: j['id'] as String,
        title: (j['title'] ?? '') as String,
        artist: (j['artist'] ?? '') as String,
        thumb: (j['thumb'] ?? '') as String,
        seconds: (j['seconds'] ?? 0) as int,
      );

  @override
  bool operator ==(Object other) => other is Track && other.id == id;

  @override
  int get hashCode => id.hashCode;
}
