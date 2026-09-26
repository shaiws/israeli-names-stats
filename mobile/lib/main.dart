import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:http/http.dart' as http;

/// Published snapshot from the companion GitHub Pages site (same repo).
const dataBase =
    'https://shaiws.github.io/israeli-names-stats/data';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NamesStatsApp());
}

class NamesStatsApp extends StatelessWidget {
  const NamesStatsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'שמות ילודים בישראל',
      debugShowCheckedModeBanner: false,
      locale: const Locale('he'),
      supportedLocales: const [Locale('he'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7C3AED),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      builder: (context, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child ?? const SizedBox.shrink(),
      ),
      home: const NamesHomePage(),
    );
  }
}

class Meta {
  final int cbsMinYear;
  final int cbsMaxYear;
  final String thresholdNote;
  final String footer;
  final Map<String, String> sectorHe;

  Meta({
    required this.cbsMinYear,
    required this.cbsMaxYear,
    required this.thresholdNote,
    required this.footer,
    required this.sectorHe,
  });

  factory Meta.fromJson(Map<String, dynamic> j) => Meta(
        cbsMinYear: j['cbsMinYear'] as int,
        cbsMaxYear: j['cbsMaxYear'] as int,
        thresholdNote: '${j['thresholdNote'] ?? ''}',
        footer: '${j['footer'] ?? ''}',
        sectorHe: Map<String, String>.from(
          (j['sectorHe'] as Map?)?.map((k, v) => MapEntry('$k', '$v')) ?? {},
        ),
      );
}

class NameListItem {
  final String name;
  final int total;
  NameListItem({required this.name, required this.total});
  factory NameListItem.fromJson(Map<String, dynamic> j) =>
      NameListItem(name: '${j['name']}', total: (j['total'] as num).toInt());
}

class NameSeriesPoint {
  final int y;
  final int all;
  final int m;
  final int f;
  NameSeriesPoint({
    required this.y,
    required this.all,
    required this.m,
    required this.f,
  });
  factory NameSeriesPoint.fromJson(Map<String, dynamic> j) => NameSeriesPoint(
        y: (j['y'] as num).toInt(),
        all: (j['all'] as num).toInt(),
        m: (j['M'] as num?)?.toInt() ?? 0,
        f: (j['F'] as num?)?.toInt() ?? 0,
      );
}

class NameData {
  final int total;
  final int peakYear;
  final int peakN;
  final List<NameSeriesPoint> series;
  NameData({
    required this.total,
    required this.peakYear,
    required this.peakN,
    required this.series,
  });
  factory NameData.fromJson(Map<String, dynamic> j) => NameData(
        total: (j['total'] as num).toInt(),
        peakYear: (j['peakYear'] as num).toInt(),
        peakN: (j['peakN'] as num).toInt(),
        series: ((j['series'] as List?) ?? [])
            .map((e) => NameSeriesPoint.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );
}

class YearData {
  final int year;
  final int total;
  final int distinct;
  final List<Map<String, dynamic>> topAll;
  final List<Map<String, dynamic>> topM;
  final List<Map<String, dynamic>> topF;

  YearData({
    required this.year,
    required this.total,
    required this.distinct,
    required this.topAll,
    required this.topM,
    required this.topF,
  });

  factory YearData.fromJson(Map<String, dynamic> j) {
    final top = j['top'] as Map<String, dynamic>? ?? {};
    List<Map<String, dynamic>> list(String k) =>
        ((top[k] as List?) ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
    return YearData(
      year: (j['year'] as num).toInt(),
      total: (j['total'] as num).toInt(),
      distinct: (j['distinct'] as num).toInt(),
      topAll: list('all'),
      topM: list('M'),
      topF: list('F'),
    );
  }
}

class NamesRepository {
  Meta? meta;
  List<NameListItem>? nameList;
  Map<String, NameData>? byName;
  Map<String, YearData>? years;

  Future<void> ensureMeta() async {
    if (meta != null) return;
    final res = await http.get(Uri.parse('$dataBase/meta.json'));
    if (res.statusCode != 200) throw Exception('meta ${res.statusCode}');
    meta = Meta.fromJson(jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>);
  }

  Future<void> ensureNameList() async {
    if (nameList != null) return;
    final res = await http.get(Uri.parse('$dataBase/nameList.json'));
    if (res.statusCode != 200) throw Exception('nameList ${res.statusCode}');
    final list = jsonDecode(utf8.decode(res.bodyBytes)) as List;
    nameList = list
        .map((e) => NameListItem.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<void> ensureByName() async {
    if (byName != null) return;
    final res = await http.get(Uri.parse('$dataBase/byName.json'));
    if (res.statusCode != 200) throw Exception('byName ${res.statusCode}');
    final map = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    byName = map.map(
      (k, v) => MapEntry(k, NameData.fromJson(Map<String, dynamic>.from(v as Map))),
    );
  }

  Future<void> ensureYears() async {
    if (years != null) return;
    final res = await http.get(Uri.parse('$dataBase/years.json'));
    if (res.statusCode != 200) throw Exception('years ${res.statusCode}');
    final map = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    years = map.map(
      (k, v) => MapEntry(k, YearData.fromJson(Map<String, dynamic>.from(v as Map))),
    );
  }
}

final repo = NamesRepository();

class NamesHomePage extends StatefulWidget {
  const NamesHomePage({super.key});

  @override
  State<NamesHomePage> createState() => _NamesHomePageState();
}

class _NamesHomePageState extends State<NamesHomePage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _boot();
  }

  Future<void> _boot() async {
    try {
      await repo.ensureMeta();
      await repo.ensureNameList();
      setState(() => _loading = false);
    } catch (e) {
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('שמות ילודים בישראל'),
        backgroundColor: cs.primaryContainer,
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'חיפוש שם'),
            Tab(text: 'לפי שנה'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('שגיאה בטעינת נתונים:\n$_error'),
                ))
              : Column(
                  children: [
                    if (repo.meta != null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                        child: Text(
                          'למ״ס ${repo.meta!.cbsMinYear}–${repo.meta!.cbsMaxYear}. '
                          '${repo.meta!.thresholdNote}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    Expanded(
                      child: TabBarView(
                        controller: _tabs,
                        children: const [
                          _NameSearchTab(),
                          _YearTab(),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _NameSearchTab extends StatefulWidget {
  const _NameSearchTab();

  @override
  State<_NameSearchTab> createState() => _NameSearchTabState();
}

class _NameSearchTabState extends State<_NameSearchTab> {
  final _controller = TextEditingController();
  List<NameListItem> _matches = const [];
  NameData? _selected;
  String? _selectedName;
  bool _loadingDetail = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onQuery(String q) {
    final list = repo.nameList ?? const [];
    final needle = q.trim();
    if (needle.isEmpty) {
      setState(() {
        _matches = const [];
        _selected = null;
        _selectedName = null;
      });
      return;
    }
    final matches = list
        .where((n) => n.name.contains(needle))
        .take(40)
        .toList();
    setState(() {
      _matches = matches;
      _selected = null;
      _selectedName = null;
    });
  }

  Future<void> _pick(NameListItem item) async {
    setState(() {
      _loadingDetail = true;
      _error = null;
      _selectedName = item.name;
    });
    try {
      await repo.ensureByName();
      setState(() {
        _selected = repo.byName?[item.name];
        _loadingDetail = false;
      });
    } catch (e) {
      setState(() {
        _loadingDetail = false;
        _error = '$e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        TextField(
          controller: _controller,
          decoration: const InputDecoration(
            labelText: 'חיפוש שם',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: _onQuery,
        ),
        const SizedBox(height: 8),
        if (_matches.isNotEmpty)
          Card(
            child: Column(
              children: [
                for (final m in _matches)
                  ListTile(
                    title: Text(m.name),
                    subtitle: Text('${m.total} ילודים (מצטבר)'),
                    onTap: () => _pick(m),
                  ),
              ],
            ),
          ),
        if (_loadingDetail) const LinearProgressIndicator(),
        if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        if (_selected != null && _selectedName != null) ...[
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(_selectedName!, style: Theme.of(context).textTheme.headlineSmall),
                  Text('סה״כ: ${_selected!.total} · שיא: ${_selected!.peakN} ב־${_selected!.peakYear}'),
                  const Divider(),
                  Text('מגמה לפי שנה', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  for (final p in _selected!.series.reversed.take(30))
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          SizedBox(width: 56, child: Text('${p.y}')),
                          Expanded(child: Text('הכל ${p.all} · בנים ${p.m} · בנות ${p.f}')),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _YearTab extends StatefulWidget {
  const _YearTab();

  @override
  State<_YearTab> createState() => _YearTabState();
}

class _YearTabState extends State<_YearTab> {
  int? _year;
  YearData? _data;
  bool _loading = false;
  String? _error;
  String _sex = 'all'; // all | M | F

  @override
  void initState() {
    super.initState();
    _year = repo.meta?.cbsMaxYear;
    if (_year != null) _load(_year!);
  }

  Future<void> _load(int year) async {
    setState(() {
      _loading = true;
      _error = null;
      _year = year;
    });
    try {
      await repo.ensureYears();
      setState(() {
        _data = repo.years?['$year'];
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
  }

  List<Map<String, dynamic>> get _top {
    final d = _data;
    if (d == null) return const [];
    switch (_sex) {
      case 'M':
        return d.topM;
      case 'F':
        return d.topF;
      default:
        return d.topAll;
    }
  }

  @override
  Widget build(BuildContext context) {
    final minY = repo.meta?.cbsMinYear ?? 1949;
    final maxY = repo.meta?.cbsMaxYear ?? 2024;
    final years = [for (var y = maxY; y >= minY; y--) y];
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        DropdownButtonFormField<int>(
          value: _year,
          decoration: const InputDecoration(
            labelText: 'שנה',
            border: OutlineInputBorder(),
          ),
          items: [
            for (final y in years)
              DropdownMenuItem(value: y, child: Text('$y')),
          ],
          onChanged: (y) {
            if (y != null) _load(y);
          },
        ),
        const SizedBox(height: 8),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'all', label: Text('הכל')),
            ButtonSegment(value: 'M', label: Text('בנים')),
            ButtonSegment(value: 'F', label: Text('בנות')),
          ],
          selected: {_sex},
          onSelectionChanged: (s) => setState(() => _sex = s.first),
        ),
        if (_loading) const LinearProgressIndicator(),
        if (_error != null) Text(_error!),
        if (_data != null) ...[
          const SizedBox(height: 8),
          Text('סה״כ ${_data!.total} · ${_data!.distinct} שמות ייחודיים'),
          const SizedBox(height: 8),
          for (final row in _top.take(50))
            ListTile(
              dense: true,
              title: Text('${row['name']}'),
              trailing: Text('${row['n']}'),
            ),
        ],
      ],
    );
  }
}
