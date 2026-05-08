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
      frameLayout: 'strip',
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
      body: Row(
        children: [
          // Left Side: Live Photo Strip Preview Area
          Expanded(
            flex: 4,
            child: Container(
              color: const Color(0xFFF0EFE9),
              padding: const EdgeInsets.all(16),
              child: Center(
                child: _isRendering
                    ? const CircularProgressIndicator(color: pink)
                    : _mergedImageBytes != null
                        ? InteractiveViewer(
                            child: Image.memory(
                              _mergedImageBytes!,
                              fit: BoxFit.contain,
                            ),
                          )
                        : const Text('No Preview Available'),
              ),
            ),
          ),

          // Right Side: Sidebar Controls Scrollable Row
          Expanded(
            flex: 5,
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(left: BorderSide(color: ink, width: 3)),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 1. TYPOGRAPHY
                    _buildSectionHeader(t('frame.typography')),
                    _buildHorizontalScrollRow(
                      items: fonts,
                      selectedId: _frameFont,
                      onSelected: (id) {
                        setState(() => _frameFont = id);
                        _triggerLiveMerge();
                      },
                    ),
                    const SizedBox(height: 20),

                    // 2. PHOTO FILTERS
                    _buildSectionHeader(t('frame.photoFilter')),
                    _buildHorizontalScrollRow(
                      items: filters,
                      selectedId: _photoFilter,
                      onSelected: (id) {
                        setState(() => _photoFilter = id);
                        _triggerLiveMerge();
                      },
                    ),
                    const SizedBox(height: 20),

                    // 3. FILM GRAIN SLIDER
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
                    const SizedBox(height: 20),

                    // 4. CAMERA GLARE PRESETS
                    _buildSectionHeader(t('frame.glare')),
                    _buildHorizontalScrollRow(
                      items: glares,
                      selectedId: _frameGlare,
                      onSelected: (id) {
                        setState(() => _frameGlare = id);
                        _triggerLiveMerge();
                      },
                    ),
                    const SizedBox(height: 20),

                    // 5. FRAME & TEXT COLOR SWATCHES
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
                            width: 32,
                            height: 32,
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
                    const SizedBox(height: 20),

                    // 6. LOCATION EDIT FIELDS
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
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          fontFamily: 'Gaegu',
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: Color(0xFF1A1A2E),
        ),
      ),
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
      height: 36,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          final isSelected = selectedId == item['id'];

          return Container(
            margin: const EdgeInsets.only(right: 6),
            child: InkWell(
              onTap: () => onSelected(item['id']!),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected ? yellow : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: ink, width: 1.5),
                ),
                child: Text(
                  item['label']!,
                  style: const TextStyle(
                    fontFamily: 'Gaegu',
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
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
