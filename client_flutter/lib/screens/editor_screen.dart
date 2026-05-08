import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../constants/translations.dart';
import '../services/frame_merger.dart';
import '../services/room_state.dart';

class EditorScreen extends StatefulWidget {
  final RoomState roomState;
  final List<Uint8List> capturedPhotos;
  final String locale;

  const EditorScreen({
    super.key,
    required this.roomState,
    required this.capturedPhotos,
    required this.locale,
  });

  @override
  State<EditorScreen> createState() => _EditorScreenState();
}

class _EditorScreenState extends State<EditorScreen> {
  // Editor State matching useFrame.js
  String _frameColor = '#ffffff';
  String _frameTextColor = '#1a1a2e';
  String _photoFilter = 'none';
  int _frameNoise = 15; // default slider noise
  String _frameGlare = 'none';
  String _frameFont = "'Quicksand', sans-serif";
  String _orientation = 'portrait';
  String _layout = 'strip'; // default matching print style
  
  final TextEditingController _locLeftController = TextEditingController(text: 'JAKARTA');
  final TextEditingController _locRightController = TextEditingController(text: 'TOKYO');
  final String _frameDate = '09/05/2026';

  Uint8List? _mergedImageBytes;
  bool _isRendering = false;

  @override
  void initState() {
    super.initState();
    _triggerLiveMerge();
  }

  Future<void> _triggerLiveMerge() async {
    setState(() {
      _isRendering = true;
    });

    final bytes = await FrameMerger.mergePhotos(
      count: widget.capturedPhotos.length,
      photoList: widget.capturedPhotos,
      frameColor: _frameColor,
      frameTextColor: _frameTextColor,
      photoFilter: _photoFilter,
      frameNoise: _frameNoise,
      frameGlare: _frameGlare,
      orientation: _orientation,
      frameLayout: _layout,
      locTextLeft: _locLeftController.text,
      locTextRight: _locRightController.text,
      frameDate: _frameDate,
    );

    if (mounted) {
      setState(() {
        _mergedImageBytes = bytes;
        _isRendering = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const Color ink = Color(0xFF1A1A2E);
    const Color yellow = Color(0xFFFFD93D);
    const Color pink = Color(0xFFFF6B9D);
    const Color teal = Color(0xFF06D6A0);

    String t(String key) => AppTranslations.translate(key, widget.locale);

    final fonts = [
      {'id': 'Modern', 'label': 'Modern'},
      {'id': 'Doodle', 'label': 'Doodle'},
      {'id': 'Crayon', 'label': 'Crayon'},
      {'id': 'Calculator', 'label': 'Calculator'},
      {'id': 'LCD Retro', 'label': 'LCD Retro'},
      {'id': 'Pixel', 'label': 'Pixel'},
      {'id': 'Typewriter', 'label': 'Typewriter'},
      {'id': 'Retro Neon', 'label': 'Retro Neon'},
      {'id': 'Script', 'label': 'Script'},
      {'id': 'Elegant', 'label': 'Elegant'},
    ];

    final filters = [
      {'id': 'none', 'label': 'None'},
      {'id': 'bw', 'label': 'B&W'},
      {'id': 'sepia', 'label': 'Sepia'},
      {'id': 'vintage', 'label': 'Vintage'},
      {'id': 'warm', 'label': 'Warm'},
      {'id': 'cold', 'label': 'Cold'},
    ];

    final glares = [
      {'id': 'none', 'label': 'None'},
      {'id': 'warm', 'label': 'Warm'},
      {'id': 'retro', 'label': 'Retro'},
      {'id': 'aurora', 'label': 'Aurora'},
      {'id': 'fire', 'label': 'Fire'},
      {'id': 'nebula', 'label': 'Nebula'},
      {'id': 'sunset', 'label': 'Sunset'},
      {'id': 'vintage', 'label': 'Vintage Wash'},
      {'id': 'rainbow', 'label': 'Rainbow'},
      {'id': 'cyberpunk', 'label': 'Cyberpunk'},
    ];

    final colorSwatches = [
      {'bg': '#ffffff', 'text': '#1a1a2e'},
      {'bg': '#1a1a2e', 'text': '#fffdf5'},
      {'bg': '#ffd93d', 'text': '#1a1a2e'},
      {'bg': '#ff6b9d', 'text': '#1a1a2e'},
      {'bg': '#06d6a0', 'text': '#1a1a2e'},
      {'bg': '#c77dff', 'text': '#1a1a2e'},
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: yellow,
        elevation: 0,
        shape: const Border(bottom: BorderSide(color: ink, width: 3)),
        title: Text(
          t('frame.editFrame'),
          style: const TextStyle(
            fontFamily: 'Gaegu',
            fontWeight: FontWeight.bold,
            color: ink,
          ),
        ),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isMobile = constraints.maxWidth < 750;

          // ── PREVIEW PANEL ──
          final Widget previewPanel = Container(
            color: const Color(0xFFE5F4F8), // Soft premium baby blue from screenshot
            padding: const EdgeInsets.all(24),
            child: Center(
              child: _isRendering
                  ? const CircularProgressIndicator(color: pink)
                  : _mergedImageBytes != null
                      ? Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: ink.withOpacity(0.12),
                                offset: const Offset(0, 12),
                                blurRadius: 24,
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: InteractiveViewer(
                              child: Image.memory(
                                _mergedImageBytes!,
                                fit: BoxFit.contain,
                              ),
                            ),
                          ),
                        )
                      : const Text('No Preview Available'),
            ),
          );

          // ── CONTROLS PANEL ──
          final Widget controlsPanel = Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: isMobile
                  ? const Border(top: BorderSide(color: ink, width: 3))
                  : const Border(left: BorderSide(color: ink, width: 3)),
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Edit Frame Title Header
                  Row(
                    children: [
                      Text(
                        'Edit Frame',
                        style: TextStyle(
                          fontFamily: 'Gaegu',
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: ink,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        '✦',
                        style: TextStyle(
                          fontSize: 22,
                          color: ink,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 2.5,
                    color: ink,
                  ),
                  const SizedBox(height: 24),

                  // 1. PRINT STYLE
                  _buildSectionHeader('PRINT STYLE'),
                  _buildSegmentedControl(
                    items: const [
                      {'id': 'strip', 'label': 'Strip'},
                      {'id': 'wide', 'label': 'Wide'},
                    ],
                    selectedId: _layout,
                    onSelected: (id) {
                      setState(() => _layout = id);
                      _triggerLiveMerge();
                    },
                  ),
                  const SizedBox(height: 24),

                  // 2. ORIENTATIONS
                  _buildSectionHeader('ORIENTATIONS'),
                  _buildSegmentedControl(
                    items: const [
                      {'id': 'portrait', 'label': 'Portrait'},
                      {'id': 'landscape', 'label': 'Landscape'},
                    ],
                    selectedId: _orientation,
                    onSelected: (id) {
                      setState(() => _orientation = id);
                      _triggerLiveMerge();
                    },
                  ),
                  const SizedBox(height: 24),

                  // 3. TYPOGRAPHY
                  _buildSectionHeader(t('frame.typography')),
                  _buildHorizontalScrollRow(
                    items: fonts,
                    selectedId: _frameFont,
                    onSelected: (id) {
                      setState(() => _frameFont = id);
                      _triggerLiveMerge();
                    },
                  ),
                  const SizedBox(height: 24),

                  // 4. PHOTO FILTER
                  _buildSectionHeader(t('frame.photoFilter')),
                  _buildHorizontalScrollRow(
                    items: filters,
                    selectedId: _photoFilter,
                    onSelected: (id) {
                      setState(() => _photoFilter = id);
                      _triggerLiveMerge();
                    },
                  ),
                  const SizedBox(height: 24),

                  // 5. FILM GRAIN SLIDER
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildSectionHeader(t('frame.grain')),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: ink,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '$_frameNoise%',
                          style: const TextStyle(
                            fontFamily: 'Gaegu',
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    value: _frameNoise.toDouble(),
                    min: 0,
                    max: 100,
                    activeColor: yellow,
                    inactiveColor: const Color(0xFFDDDDDD),
                    onChanged: (val) {
                      setState(() => _frameNoise = val.round());
                    },
                    onChangeEnd: (val) {
                      _triggerLiveMerge();
                    },
                  ),
                  const SizedBox(height: 24),

                  // 6. CAMERA GLARE PRESETS
                  _buildSectionHeader(t('frame.glare')),
                  _buildHorizontalScrollRow(
                    items: glares,
                    selectedId: _frameGlare,
                    onSelected: (id) {
                      setState(() => _frameGlare = id);
                      _triggerLiveMerge();
                    },
                  ),
                  const SizedBox(height: 24),

                  // 7. FRAME & TEXT COLOR SWATCHES
                  _buildSectionHeader(t('frame.color')),
                  Row(
                    children: colorSwatches.map((color) {
                      final bg = color['bg']!;
                      final text = color['text']!;
                      final isSelected = _frameColor == bg;

                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            _frameColor = bg;
                            _frameTextColor = text;
                          });
                          _triggerLiveMerge();
                        },
                        child: Container(
                          margin: const EdgeInsets.only(right: 10),
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: _parseHexColor(bg),
                            border: Border.all(
                              color: isSelected ? pink : ink,
                              width: isSelected ? 3 : 1.5,
                            ),
                            shape: BoxShape.circle,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),

                  // 8. LOCATION EDIT FIELDS
                  _buildSectionHeader(t('frame.locations')),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _locLeftController,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                          decoration: const InputDecoration(
                            labelText: 'Left Text',
                            border: OutlineInputBorder(),
                          ),
                          onSubmitted: (_) => _triggerLiveMerge(),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _locRightController,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                          decoration: const InputDecoration(
                            labelText: 'Right Text',
                            border: OutlineInputBorder(),
                          ),
                          onSubmitted: (_) => _triggerLiveMerge(),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 36),

                  // DOWNLOAD SHUTTER ACTION BUTTON
                  InkWell(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          backgroundColor: ink,
                          content: Text(
                            t('common.success'),
                            style: const TextStyle(fontWeight: FontWeight.bold, color: yellow),
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: pink,
                        border: Border.all(color: ink, width: 3),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: const [
                          BoxShadow(color: ink, offset: Offset(4, 4), blurRadius: 0)
                        ],
                      ),
                      child: Text(
                        t('step.result').toUpperCase() + " STRIP ✦",
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontFamily: 'Gaegu',
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'by evan kristian',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Gaegu',
                      fontSize: 14,
                      color: Color(0xFFC77DFF),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          );

          if (isMobile) {
            return Column(
              children: [
                Expanded(
                  flex: 10,
                  child: previewPanel,
                ),
                Expanded(
                  flex: 12,
                  child: controlsPanel,
                ),
              ],
            );
          } else {
            return Row(
              children: [
                Expanded(
                  flex: 4,
                  child: previewPanel,
                ),
                Expanded(
                  flex: 5,
                  child: controlsPanel,
                ),
              ],
            );
          }
        },
      ),
    );
  }

  Widget _buildSectionHeader(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          fontFamily: 'Gaegu',
          fontSize: 15,
          letterSpacing: 0.5,
          fontWeight: FontWeight.bold,
          color: Color(0xFF888888),
        ),
      ),
    );
  }

  Widget _buildSegmentedControl({
    required List<Map<String, String>> items,
    required String selectedId,
    required ValueChanged<String> onSelected,
  }) {
    const Color ink = Color(0xFF1A1A2E);
    const Color yellow = Color(0xFFFFD93D);

    return Row(
      children: items.map((item) {
        final isSelected = selectedId == item['id'];
        return Expanded(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            height: 48,
            child: InkWell(
              onTap: () => onSelected(item['id']!),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected ? yellow : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ink, width: 2.5),
                  boxShadow: const [
                    BoxShadow(
                      color: ink,
                      offset: Offset(3, 3),
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: Text(
                  item['label']!,
                  style: const TextStyle(
                    fontFamily: 'Gaegu',
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: ink,
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildHorizontalScrollRow({
    required List<Map<String, String>> items,
    required String selectedId,
    required ValueChanged<String> onSelected,
  }) {
    const Color ink = Color(0xFF1A1A2E);
    const Color yellow = Color(0xFFFFD93D);

    return SizedBox(
      height: 52,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          final isSelected = selectedId == item['id'];

          // Determine font family for typography items
          String fontFamily = 'Gaegu';
          if (item['id'] == 'Calculator') fontFamily = 'Calculator';

          return Container(
            margin: const EdgeInsets.only(right: 12, bottom: 6),
            child: InkWell(
              onTap: () => onSelected(item['id']!),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected ? yellow : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ink, width: 2.5),
                  boxShadow: const [
                    BoxShadow(
                      color: ink,
                      offset: Offset(3, 3),
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: Text(
                  item['label']!,
                  style: TextStyle(
                    fontFamily: fontFamily,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: ink,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Color _parseHexColor(String hex) {
    String cleanHex = hex.replaceAll('#', '');
    if (cleanHex.length == 6) {
      cleanHex = 'FF$cleanHex';
    }
    return Color(int.parse(cleanHex, radix: 16));
  }
}
