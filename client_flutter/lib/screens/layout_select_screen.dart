import 'package:flutter/material.dart';
import '../services/room_state.dart';
import '../constants/translations.dart';
import 'capture_screen.dart';

class LayoutSelectScreen extends StatefulWidget {
  final RoomState roomState;
  final String locale;
  final bool isSolo;

  const LayoutSelectScreen({
    super.key,
    required this.roomState,
    required this.locale,
    this.isSolo = false,
  });

  @override
  State<LayoutSelectScreen> createState() => _LayoutSelectScreenState();
}

class _LayoutSelectScreenState extends State<LayoutSelectScreen> {
  String _selectedLayout = 'layout4'; // Default to Quad Strip

  final List<Map<String, dynamic>> _layouts = [
    {
      'id': 'layout1',
      'name': 'Single',
      'count': 1,
      'slots': 1,
    },
    {
      'id': 'layout2',
      'name': 'Duo Strip',
      'count': 2,
      'slots': 2,
    },
    {
      'id': 'layout3',
      'name': 'Classic Strip',
      'count': 3,
      'slots': 3,
    },
    {
      'id': 'layout4',
      'name': 'Quad Strip',
      'count': 4,
      'slots': 4,
    },
  ];

  @override
  Widget build(BuildContext context) {
    const Color ink = Color(0xFF1A1A2E);
    const Color yellow = Color(0xFFFFD93D);
    const Color pink = Color(0xFFFF6B9D);
    const Color teal = Color(0xFF06D6A0);

    String t(String key) => AppTranslations.translate(key, widget.locale);

    return Scaffold(
      backgroundColor: const Color(0xFFFFFDF5),
      appBar: AppBar(
        backgroundColor: yellow,
        elevation: 0,
        shape: const Border(
          bottom: BorderSide(color: ink, width: 3),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: ink),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          t('layout.title'),
          style: const TextStyle(
            fontFamily: 'Gaegu',
            fontWeight: FontWeight.bold,
            fontSize: 22,
            color: ink,
          ),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 10),
              Text(
                t('layout.title').toUpperCase(),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'Gaegu',
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: ink,
                ),
              ),
              const SizedBox(height: 24),

              // Layout grid
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 0.85,
                  ),
                  itemCount: _layouts.length,
                  itemBuilder: (context, index) {
                    final layout = _layouts[index];
                    final isSelected = _selectedLayout == layout['id'];

                    return InkWell(
                      onTap: () {
                        setState(() {
                          _selectedLayout = layout['id'] as String;
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        decoration: BoxDecoration(
                          color: isSelected ? yellow : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: ink, width: 3),
                          boxShadow: const [
                            BoxShadow(
                              color: ink,
                              offset: Offset(4, 4),
                              blurRadius: 0,
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            // Layout Visual Slots Preview
                            Expanded(
                              child: Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFAF8F5),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: ink, width: 1.5),
                                ),
                                padding: const EdgeInsets.all(8),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: List.generate(
                                    layout['slots'] as int,
                                    (i) => Expanded(
                                      child: Container(
                                        margin: const EdgeInsets.symmetric(vertical: 2),
                                        decoration: BoxDecoration(
                                          color: ink,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              layout['name'] as String,
                              style: const TextStyle(
                                fontFamily: 'Gaegu',
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: ink,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${layout['count']} ${layout['count'] > 1 ? t('layout.photosPlural') : t('layout.photos')}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF666677),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 20),

              // Mulai Sesi / Start Button
              InkWell(
                onTap: () {
                  if (widget.isSolo) {
                    widget.roomState.startSoloSession();
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (context) => CaptureScreen(
                          roomState: widget.roomState,
                          locale: widget.locale,
                        ),
                      ),
                    );
                  } else {
                    widget.roomState.emitSessionStart(_selectedLayout);
                    Navigator.pop(context); // Go back to Waiting Room which listens & pushes CaptureScreen
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: teal,
                    border: Border.all(color: ink, width: 3),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: const [
                      BoxShadow(color: ink, offset: Offset(4, 4), blurRadius: 0)
                    ],
                  ),
                  child: Text(
                    t('layout.start').toUpperCase() + " ✦",
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'Gaegu',
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: ink,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}
