import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:just_audio_background/just_audio_background.dart';

import 'models.dart';
import 'player.dart';

final PlayerModel model = PlayerModel();
final ValueNotifier<String?> searchRequest = ValueNotifier<String?>(null);

const kBg = Color(0xFF0E0E10);
const kSurface = Color(0xFF1A1A1F);
const kSurface2 = Color(0xFF26262C);
const kAccent = Color(0xFFA78BFA);
const kMuted = Color(0xFF9A9AA3);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.dotify.audio',
    androidNotificationChannelName: 'Dotify',
    androidNotificationOngoing: true,
  );
  await model.init();
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
  runApp(const DotifyApp());
}

class DotifyApp extends StatelessWidget {
  const DotifyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final base = ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
      fontFamily: 'Inter',
      scaffoldBackgroundColor: kBg,
      colorScheme: const ColorScheme.dark(
        primary: kAccent,
        secondary: kAccent,
        surface: kSurface,
      ),
    );
    return MaterialApp(
      title: 'Dotify',
      debugShowCheckedModeBanner: false,
      theme: base.copyWith(
        appBarTheme: const AppBarTheme(backgroundColor: kBg, elevation: 0, centerTitle: false),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: kBg,
          indicatorColor: kAccent.withValues(alpha: 0.18),
          labelTextStyle: WidgetStateProperty.all(
              const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
        ),
      ),
      home: const RootScreen(),
    );
  }
}

// ======================= ROOT =======================
class RootScreen extends StatefulWidget {
  const RootScreen({super.key});

  @override
  State<RootScreen> createState() => _RootScreenState();
}

class _RootScreenState extends State<RootScreen> {
  int tab = 0;

  @override
  void initState() {
    super.initState();
    searchRequest.addListener(() {
      if (searchRequest.value != null && tab != 1) setState(() => tab = 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(
          index: tab,
          children: const [HomeScreen(), SearchScreen(), LibraryScreen()],
        ),
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const MiniPlayer(),
          NavigationBar(
            selectedIndex: tab,
            height: 64,
            onDestinationSelected: (i) => setState(() => tab = i),
            destinations: const [
              NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Главная'),
              NavigationDestination(icon: Icon(Icons.search), label: 'Поиск'),
              NavigationDestination(
                  icon: Icon(Icons.favorite_border), selectedIcon: Icon(Icons.favorite), label: 'Медиатека'),
            ],
          ),
        ],
      ),
    );
  }
}

// ======================= HOME =======================
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  static const moods = [
    'Хиты 2026',
    'Русский рэп',
    'Phonk',
    'Lo-fi chill',
    'Рок',
    'Поп хиты',
    'Электроника',
    'Музыка для тренировки',
  ];

  String get greeting {
    final h = DateTime.now().hour;
    if (h < 6) return 'Доброй ночи';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: model,
      builder: (context, _) => ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Row(children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.asset('assets/images/logo.png', width: 36, height: 36),
            ),
            const SizedBox(width: 10),
            const Text('Dotify', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(height: 20),
          Text(greeting, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final m in moods)
                ActionChip(
                  label: Text(m),
                  backgroundColor: kSurface,
                  side: BorderSide.none,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  onPressed: () => searchRequest.value = m,
                ),
            ],
          ),
          if (model.liked.isNotEmpty) ...[
            const SizedBox(height: 24),
            _SectionTitle('Любимые треки', onAll: () => model.playList(model.liked, 0)),
            const SizedBox(height: 10),
            _Carousel(tracks: model.liked.take(15).toList()),
          ],
          const SizedBox(height: 24),
          if (model.recent.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(16)),
              child: const Column(children: [
                Icon(Icons.music_note, size: 40, color: kAccent),
                SizedBox(height: 8),
                Text('Найдите любой трек во вкладке «Поиск»',
                    textAlign: TextAlign.center, style: TextStyle(color: kMuted)),
              ]),
            )
          else ...[
            _SectionTitle('Недавно прослушанные', onAll: () => model.playList(model.recent, 0)),
            const SizedBox(height: 6),
            for (int i = 0; i < model.recent.length && i < 20; i++)
              TrackTile(track: model.recent[i], list: model.recent, index: i),
          ],
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  final VoidCallback? onAll;
  const _SectionTitle(this.text, {this.onAll});

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(child: Text(text, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
        if (onAll != null)
          IconButton(
            onPressed: onAll,
            icon: const Icon(Icons.play_circle_fill, color: kAccent, size: 32),
          ),
      ]);
}

class _Carousel extends StatelessWidget {
  final List<Track> tracks;
  const _Carousel({required this.tracks});

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 180,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: tracks.length,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (context, i) {
            final t = tracks[i];
            return GestureDetector(
              onTap: () => model.playList(tracks, i),
              child: SizedBox(
                width: 130,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Cover(url: t.thumb, size: 130, radius: 12),
                  const SizedBox(height: 6),
                  Text(t.title, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  Text(t.artist, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: kMuted, fontSize: 12)),
                ]),
              ),
            );
          },
        ),
      );
}

// ======================= SEARCH =======================
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final ctrl = TextEditingController();
  final focus = FocusNode();
  List<Track> results = [];
  bool busy = false;
  String? err;
  int _req = 0;

  @override
  void initState() {
    super.initState();
    searchRequest.addListener(_onExternal);
  }

  void _onExternal() {
    final q = searchRequest.value;
    if (q == null) return;
    ctrl.text = q;
    searchRequest.value = null;
    _search(q);
  }

  @override
  void dispose() {
    searchRequest.removeListener(_onExternal);
    ctrl.dispose();
    focus.dispose();
    super.dispose();
  }

  Future<void> _search(String q) async {
    q = q.trim();
    if (q.isEmpty) return;
    focus.unfocus();
    model.addSearch(q);
    final req = ++_req;
    setState(() {
      busy = true;
      err = null;
    });
    try {
      final r = await model.yt.search(q);
      if (req != _req || !mounted) return;
      setState(() {
        results = r;
        busy = false;
      });
    } catch (e) {
      if (req != _req || !mounted) return;
      setState(() {
        busy = false;
        err = 'Ошибка поиска. Проверьте интернет.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: TextField(
          controller: ctrl,
          focusNode: focus,
          textInputAction: TextInputAction.search,
          onSubmitted: _search,
          decoration: InputDecoration(
            hintText: 'Трек, исполнитель, альбом',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => setState(() {
                ctrl.clear();
                results = [];
              }),
            ),
            filled: true,
            fillColor: kSurface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
          ),
        ),
      ),
      Expanded(child: _body()),
    ]);
  }

  Widget _body() {
    if (busy) return const Center(child: CircularProgressIndicator());
    if (err != null) {
      return Center(child: Text(err!, style: const TextStyle(color: kMuted)));
    }
    if (results.isEmpty) {
      return ListenableBuilder(
        listenable: model,
        builder: (context, _) {
          if (model.history.isEmpty) {
            return const Center(
                child: Text('Ищите музыку на YouTube Music', style: TextStyle(color: kMuted)));
          }
          return ListView(children: [
            ListTile(
              title: const Text('Недавние запросы', style: TextStyle(fontWeight: FontWeight.w700)),
              trailing: TextButton(onPressed: model.clearHistory, child: const Text('Очистить')),
            ),
            for (final h in model.history)
              ListTile(
                leading: const Icon(Icons.history, color: kMuted),
                title: Text(h),
                onTap: () {
                  ctrl.text = h;
                  _search(h);
                },
              ),
          ]);
        },
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: results.length,
      itemBuilder: (context, i) => TrackTile(track: results[i], list: results, index: i),
    );
  }
}

// ======================= LIBRARY =======================
class LibraryScreen extends StatelessWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: model,
      builder: (context, _) {
        final liked = model.liked;
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            const Text('Медиатека', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: const LinearGradient(colors: [Color(0xFF5B3FD6), Color(0xFF2A2340)]),
              ),
              child: Row(children: [
                const Icon(Icons.favorite, size: 40),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Любимые треки', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    Text('${liked.length} трек(ов)', style: const TextStyle(color: Colors.white70)),
                  ]),
                ),
                if (liked.isNotEmpty) ...[
                  IconButton(
                    icon: const Icon(Icons.shuffle),
                    onPressed: () {
                      if (!model.shuffle) model.toggleShuffle();
                      final l = List.of(liked)..shuffle();
                      model.playList(l, 0);
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.play_circle_fill, size: 40),
                    onPressed: () => model.playList(liked, 0),
                  ),
                ],
              ]),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Автовоспроизведение'),
              subtitle: const Text('Похожие треки, когда очередь закончится',
                  style: TextStyle(color: kMuted, fontSize: 12)),
              value: model.autoplay,
              onChanged: model.setAutoplay,
            ),
            if (liked.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(
                    child: Text('Нажмите ♥ у трека, чтобы добавить его сюда',
                        style: TextStyle(color: kMuted))),
              ),
            for (int i = 0; i < liked.length; i++) TrackTile(track: liked[i], list: liked, index: i),
          ],
        );
      },
    );
  }
}

// ======================= WIDGETS =======================
class Cover extends StatelessWidget {
  final String url;
  final double size;
  final double radius;
  const Cover({super.key, required this.url, required this.size, this.radius = 8});

  @override
  Widget build(BuildContext context) {
    final ph = Container(
      width: size,
      height: size,
      color: kSurface2,
      child: Icon(Icons.music_note, color: kMuted, size: size * 0.4),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: url.isEmpty
          ? ph
          : Image.network(
              url,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => ph,
              loadingBuilder: (c, child, p) => p == null ? child : ph,
            ),
    );
  }
}

class TrackTile extends StatelessWidget {
  final Track track;
  final List<Track> list;
  final int index;
  const TrackTile({super.key, required this.track, required this.list, required this.index});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: model,
      builder: (context, _) {
        final isCur = model.current == track;
        return InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () => model.playList(list, index),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(children: [
              Cover(url: track.thumb, size: 52),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(track.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontWeight: FontWeight.w600, color: isCur ? kAccent : Colors.white)),
                  const SizedBox(height: 2),
                  Text(
                    [track.artist, track.durationText].where((s) => s.isNotEmpty).join(' • '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: kMuted, fontSize: 13),
                  ),
                ]),
              ),
              if (model.isLiked(track))
                const Padding(
                  padding: EdgeInsets.only(left: 4),
                  child: Icon(Icons.favorite, color: kAccent, size: 18),
                ),
              IconButton(
                icon: const Icon(Icons.more_vert, color: kMuted),
                onPressed: () => showTrackMenu(context, track),
              ),
            ]),
          ),
        );
      },
    );
  }
}

void showTrackMenu(BuildContext context, Track t) {
  showModalBottomSheet(
    context: context,
    backgroundColor: kSurface,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) => SafeArea(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        ListTile(
          leading: Cover(url: t.thumb, size: 48),
          title: Text(t.title, maxLines: 1, overflow: TextOverflow.ellipsis),
          subtitle: Text(t.artist, style: const TextStyle(color: kMuted)),
        ),
        const Divider(height: 1),
        ListTile(
          leading: Icon(model.isLiked(t) ? Icons.favorite : Icons.favorite_border),
          title: Text(model.isLiked(t) ? 'Убрать из любимых' : 'Добавить в любимые'),
          onTap: () {
            model.toggleLike(t);
            Navigator.pop(ctx);
          },
        ),
        ListTile(
          leading: const Icon(Icons.playlist_play),
          title: const Text('Играть следующим'),
          onTap: () {
            model.playNext(t);
            Navigator.pop(ctx);
          },
        ),
        ListTile(
          leading: const Icon(Icons.queue_music),
          title: const Text('Добавить в очередь'),
          onTap: () {
            model.addToQueue(t);
            Navigator.pop(ctx);
          },
        ),
        ListTile(
          leading: const Icon(Icons.radio),
          title: const Text('Радио по треку'),
          onTap: () async {
            Navigator.pop(ctx);
            final rel = await model.yt.related(t);
            model.playList([t, ...rel.where((x) => x != t)], 0);
          },
        ),
      ]),
    ),
  );
}

// ======================= MINI PLAYER =======================
class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: model,
      builder: (context, _) {
        final t = model.current;
        if (t == null) return const SizedBox.shrink();
        return GestureDetector(
          onTap: () => Navigator.of(context).push(
            PageRouteBuilder(
              opaque: false,
              pageBuilder: (_, __, ___) => const FullPlayer(),
              transitionsBuilder: (_, a, __, child) => SlideTransition(
                position: Tween(begin: const Offset(0, 1), end: Offset.zero)
                    .animate(CurvedAnimation(parent: a, curve: Curves.easeOutCubic)),
                child: child,
              ),
            ),
          ),
          child: Container(
            margin: const EdgeInsets.fromLTRB(8, 0, 8, 6),
            decoration: BoxDecoration(color: kSurface2, borderRadius: BorderRadius.circular(12)),
            clipBehavior: Clip.antiAlias,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 4, 6),
                child: Row(children: [
                  Cover(url: t.thumb, size: 42, radius: 6),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(t.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      Text(model.error ?? t.artist,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              color: model.error != null ? Colors.redAccent : kMuted, fontSize: 12)),
                    ]),
                  ),
                  IconButton(
                    icon: Icon(model.isLiked(t) ? Icons.favorite : Icons.favorite_border,
                        color: model.isLiked(t) ? kAccent : Colors.white),
                    onPressed: () => model.toggleLike(t),
                  ),
                  model.loading
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
                        )
                      : IconButton(
                          iconSize: 30,
                          icon: Icon(model.playing ? Icons.pause : Icons.play_arrow),
                          onPressed: model.toggle,
                        ),
                ]),
              ),
              const _ThinProgress(),
            ]),
          ),
        );
      },
    );
  }
}

class _ThinProgress extends StatelessWidget {
  const _ThinProgress();

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Duration>(
      stream: model.player.positionStream,
      builder: (context, snap) {
        final pos = snap.data ?? Duration.zero;
        final dur = model.player.duration ?? Duration.zero;
        final v = dur.inMilliseconds > 0 ? (pos.inMilliseconds / dur.inMilliseconds).clamp(0.0, 1.0) : 0.0;
        return LinearProgressIndicator(
          value: v,
          minHeight: 2,
          backgroundColor: Colors.white12,
          valueColor: const AlwaysStoppedAnimation(Colors.white),
        );
      },
    );
  }
}

// ======================= FULL PLAYER =======================
String fmt(Duration d) {
  final m = d.inMinutes;
  final s = (d.inSeconds % 60).toString().padLeft(2, '0');
  return '$m:$s';
}

class FullPlayer extends StatelessWidget {
  const FullPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: model,
      builder: (context, _) {
        final t = model.current;
        if (t == null) return const Scaffold(backgroundColor: kBg);
        final w = MediaQuery.of(context).size.width - 48;
        return Scaffold(
          backgroundColor: kBg,
          body: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFF2E2552), kBg],
              ),
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(children: [
                  Row(children: [
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_down, size: 32),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Expanded(
                      child: Text('Сейчас играет',
                          textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.queue_music),
                      onPressed: () => showQueue(context),
                    ),
                  ]),
                  const Spacer(),
                  GestureDetector(
                    onHorizontalDragEnd: (d) {
                      final v = d.primaryVelocity ?? 0;
                      if (v < -300) model.next();
                      if (v > 300) model.previous();
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 30, offset: Offset(0, 12))],
                      ),
                      child: Cover(url: t.thumb, size: w, radius: 18),
                    ),
                  ),
                  const Spacer(),
                  Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(t.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text(t.artist, style: const TextStyle(color: kMuted, fontSize: 16)),
                      ]),
                    ),
                    IconButton(
                      iconSize: 30,
                      icon: Icon(model.isLiked(t) ? Icons.favorite : Icons.favorite_border,
                          color: model.isLiked(t) ? kAccent : Colors.white),
                      onPressed: () => model.toggleLike(t),
                    ),
                  ]),
                  if (model.error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text('${model.error!} — нажмите ▶ ещё раз',
                          style: const TextStyle(color: Colors.redAccent)),
                    ),
                  const SizedBox(height: 12),
                  const _SeekBar(),
                  const SizedBox(height: 8),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    IconButton(
                      icon: Icon(Icons.shuffle, color: model.shuffle ? kAccent : Colors.white70),
                      onPressed: model.toggleShuffle,
                    ),
                    IconButton(iconSize: 40, icon: const Icon(Icons.skip_previous), onPressed: model.previous),
                    Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      child: model.loading
                          ? const Padding(
                              padding: EdgeInsets.all(22),
                              child: CircularProgressIndicator(strokeWidth: 3, color: Colors.black),
                            )
                          : IconButton(
                              iconSize: 40,
                              color: Colors.black,
                              icon: Icon(model.playing ? Icons.pause : Icons.play_arrow),
                              onPressed: model.toggle,
                            ),
                    ),
                    IconButton(iconSize: 40, icon: const Icon(Icons.skip_next), onPressed: model.next),
                    IconButton(
                      icon: Icon(model.repeat == Repeat.one ? Icons.repeat_one : Icons.repeat,
                          color: model.repeat == Repeat.off ? Colors.white70 : kAccent),
                      onPressed: model.cycleRepeat,
                    ),
                  ]),
                  const SizedBox(height: 32),
                ]),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SeekBar extends StatefulWidget {
  const _SeekBar();

  @override
  State<_SeekBar> createState() => _SeekBarState();
}

class _SeekBarState extends State<_SeekBar> {
  double? dragValue;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Duration>(
      stream: model.player.positionStream,
      builder: (context, snap) {
        final pos = snap.data ?? Duration.zero;
        var dur = model.player.duration ?? Duration.zero;
        if (dur == Duration.zero && model.current != null) {
          dur = Duration(seconds: model.current!.seconds);
        }
        final max = dur.inMilliseconds.toDouble().clamp(1.0, double.infinity);
        final value = (dragValue ?? pos.inMilliseconds.toDouble()).clamp(0.0, max);
        return Column(children: [
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 4,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
              activeTrackColor: Colors.white,
              inactiveTrackColor: Colors.white24,
              thumbColor: Colors.white,
            ),
            child: Slider(
              min: 0,
              max: max,
              value: value,
              onChanged: (v) => setState(() => dragValue = v),
              onChangeEnd: (v) {
                model.player.seek(Duration(milliseconds: v.round()));
                setState(() => dragValue = null);
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(fmt(Duration(milliseconds: value.round())), style: const TextStyle(color: kMuted, fontSize: 12)),
              Text(fmt(dur), style: const TextStyle(color: kMuted, fontSize: 12)),
            ]),
          ),
        ]);
      },
    );
  }
}

void showQueue(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: kSurface,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      maxChildSize: 0.95,
      builder: (ctx, scroll) => ListenableBuilder(
        listenable: model,
        builder: (ctx, _) => ListView.builder(
          controller: scroll,
          itemCount: model.queue.length + 1,
          itemBuilder: (ctx, i) {
            if (i == 0) {
              return const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Очередь', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              );
            }
            final idx = i - 1;
            final t = model.queue[idx];
            final cur = idx == model.index;
            return ListTile(
              leading: Cover(url: t.thumb, size: 44),
              title: Text(t.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: cur ? kAccent : Colors.white, fontWeight: FontWeight.w600)),
              subtitle: Text(t.artist, style: const TextStyle(color: kMuted)),
              trailing: cur
                  ? const Icon(Icons.graphic_eq, color: kAccent)
                  : IconButton(icon: const Icon(Icons.close, color: kMuted), onPressed: () => model.removeAt(idx)),
              onTap: () => model.jumpTo(idx),
            );
          },
        ),
      ),
    ),
  );
}
