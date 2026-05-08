import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/translations.dart';
import '../services/room_state.dart';
import 'capture_screen.dart';
import 'layout_select_screen.dart';

class WaitingScreen extends StatefulWidget {
  final RoomState roomState;
  final String locale;

  const WaitingScreen({
    super.key,
    required this.roomState,
    required this.locale,
  });

  @override
  State<WaitingScreen> createState() => _WaitingScreenState();
}

class _WaitingScreenState extends State<WaitingScreen> {
  @override
  void initState() {
    super.initState();
    widget.roomState.addListener(_onRoomStateChanged);
  }

  @override
  void dispose() {
    widget.roomState.removeListener(_onRoomStateChanged);
    super.dispose();
  }

  void _onRoomStateChanged() {
    if (!mounted) return;
    if (widget.roomState.step == 'countdown') {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => CaptureScreen(
            roomState: widget.roomState,
            locale: widget.locale,
            isSolo: false,
          ),
        ),
      );
      return;
    }
    
    // Trigger real-time visual update of the participants list on any state change!
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    const Color ink = Color(0xFF1A1A2E);
    const Color yellow = Color(0xFFFFD93D);
    const Color pink = Color(0xFFFF6B9D);
    const Color teal = Color(0xFF06D6A0);

    String t(String key) => AppTranslations.translate(key, widget.locale);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: yellow,
        elevation: 0,
        shape: const Border(bottom: BorderSide(color: ink, width: 3)),
        title: Text(
          t('room.waitingTitle'),
          style: const TextStyle(
            fontFamily: 'Gaegu',
            fontWeight: FontWeight.bold,
            color: ink,
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: ink, width: 3),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(color: ink, offset: Offset(5, 5), blurRadius: 0)
                    ],
                  ),
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const Icon(Icons.hourglass_empty, size: 48, color: pink),
                      const SizedBox(height: 16),
                      Text(
                        t('room.codeLabel'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontFamily: 'Gaegu',
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: ink,
                        ),
                      ),
                      const SizedBox(height: 12),
                      GestureDetector(
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: widget.roomState.roomCode));
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
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
                          decoration: BoxDecoration(
                            color: yellow,
                            border: Border.all(color: ink, width: 2),
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: const [
                              BoxShadow(color: ink, offset: Offset(3, 3), blurRadius: 0)
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                widget.roomState.roomCode,
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 2.0,
                                  color: ink,
                                ),
                              ),
                              const SizedBox(width: 10),
                              const Icon(Icons.copy, size: 20, color: ink),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                // Participants connected badge list
                Text(
                  'CONNECTED USERS (${widget.roomState.participants.length})',
                  style: const TextStyle(
                    fontFamily: 'Gaegu',
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: ink,
                  ),
                ),
                const SizedBox(height: 10),
                ...widget.roomState.participants.map((p) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  decoration: BoxDecoration(
                    color: p.isYou ? yellow : teal,
                    border: Border.all(color: ink, width: 2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        p.displayName,
                        style: const TextStyle(fontWeight: FontWeight.bold, color: ink),
                      ),
                      if (p.isYou)
                        const Text(
                          'YOU',
                          style: TextStyle(fontFamily: 'Gaegu', fontWeight: FontWeight.bold, color: ink),
                        ),
                    ],
                  ),
                )),
                const SizedBox(height: 32),
                if (widget.roomState.participants.length >= 2)
                  InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => LayoutSelectScreen(
                            roomState: widget.roomState,
                            locale: widget.locale,
                            isSolo: false,
                          ),
                        ),
                      );
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
                        t('room.startCaptured'),
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}
