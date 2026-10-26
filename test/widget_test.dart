import 'package:dotify/models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Track json roundtrip', () {
    const t = Track(id: 'abc', title: 'Song', artist: 'Artist', thumb: '', seconds: 125);
    final r = Track.fromJson(t.toJson());
    expect(r, t);
    expect(r.durationText, '2:05');
  });
}
