import 'package:flutter/material.dart';
import 'constants/translations.dart';

import 'services/room_state.dart';
import 'screens/layout_select_screen.dart';
import 'screens/join_screen.dart';
import 'screens/capture_screen.dart';

void main() {
  runApp(const LdrPhotoboothApp());
}

class LdrPhotoboothApp extends StatefulWidget {
  const LdrPhotoboothApp({super.key});

  @override
  State<LdrPhotoboothApp> createState() => _LdrPhotoboothAppState();
}

class _LdrPhotoboothAppState extends State<LdrPhotoboothApp> {
  String _locale = 'id'; // Default locale matches web's preferred default
  late final RoomState _roomState;

  @override
  void initState() {
    super.initState();
    _roomState = RoomState(serverUrl: 'https://ldr-photobooth.if2372047.workers.dev'); // Connects to the correct production Cloudflare Worker backend!
  }

  void _changeLocale(String newLocale) {
    setState(() {
      _locale = newLocale;
    });
  }

  @override
  Widget build(BuildContext context) {
    const Color cream = Color(0xFFFFFDF5);

    return MaterialApp(
      title: 'LDR Photobooth',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: cream,
        fontFamily: 'Nunito',
        useMaterial3: true,
      ),
      home: ModeSelectScreen(
        locale: _locale,
        onChangeLocale: _changeLocale,
        roomState: _roomState,
      ),
    );
  }
}

class ModeSelectScreen extends StatelessWidget {
  final String locale;
  final ValueChanged<String> onChangeLocale;
  final RoomState roomState;

  const ModeSelectScreen({
    super.key,
    required this.locale,
    required this.onChangeLocale,
    required this.roomState,
  });

  @override
  Widget build(BuildContext context) {
    // Color Palette Tokens
    const Color ink = Color(0xFF1A1A2E);
    const Color yellow = Color(0xFFFFD93D);
    const Color pink = Color(0xFFFF6B9D);
    const Color teal = Color(0xFF06D6A0);

    String t(String key) => AppTranslations.translate(key, locale);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: yellow,
        elevation: 0,
        shape: const Border(
          bottom: BorderSide(color: ink, width: 3),
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'LDR PHOTOBOOTH',
              style: TextStyle(
                fontFamily: 'Gaegu',
                fontWeight: FontWeight.bold,
                fontSize: 26,
                color: ink,
              ),
            ),
            const SizedBox(width: 10),
            AnimatedBuilder(
              animation: roomState,
              builder: (context, _) {
                final bool isConnected = roomState.status.toLowerCase().contains('connected');
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isConnected ? teal : pink,
                    border: Border.all(color: ink, width: 1.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isConnected ? 'LIVE' : 'CONNECTING...',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: ink,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: ink, width: 2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: locale,
                icon: const Icon(Icons.language, size: 18, color: ink),
                style: const TextStyle(
                  fontFamily: 'Gaegu',
                  fontWeight: FontWeight.bold,
                  color: ink,
                  fontSize: 14,
                ),
                onChanged: (val) {
                  if (val != null) onChangeLocale(val);
                },
                items: const [
                  DropdownMenuItem(value: 'en', child: Text('EN ')),
                  DropdownMenuItem(value: 'id', child: Text('ID ')),
                  DropdownMenuItem(value: 'ko', child: Text('KO ')),
                  DropdownMenuItem(value: 'ja', child: Text('JA ')),
                ],
              ),
            ),
          ),
        ],
      ),
      backgroundColor: const Color(0xFFFFFDF5),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 36),
              // Beautiful Clean Title Text from Screenshot
              const Text(
                'How would you like to take\nphotos today? ✌️',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Gaegu',
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  color: ink,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 40),

              // Button 1: Solo Mode
              _buildHomeButton(
                title: 'Solo Mode',
                icon: Icons.person_rounded,
                iconBg: const Color(0xFFE3F2FD),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => LayoutSelectScreen(
                        roomState: roomState,
                        locale: locale,
                        isSolo: true,
                      ),
                    ),
                  );
                },
              ),

              // Button 2: Group Mode (LDR)
              _buildHomeButton(
                title: 'Group Mode (LDR)',
                icon: Icons.people_alt_rounded,
                iconBg: const Color(0xFFE8F5E9),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => JoinScreen(
                        roomState: roomState,
                        locale: locale,
                      ),
                    ),
                  );
                },
              ),

              // Button 3: Community
              _buildHomeButton(
                title: 'Community',
                icon: Icons.auto_awesome_rounded,
                iconBg: const Color(0xFFFFFDE7),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: ink,
                      content: Text(
                        'Community Mode is coming soon! ✨',
                        style: TextStyle(fontFamily: 'Gaegu', fontWeight: FontWeight.bold, color: yellow),
                      ),
                    ),
                  );
                },
              ),

              const Spacer(),

              // Beautiful "by evan kristian" signature at bottom
              const Text(
                'by evan kristian',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Gaegu',
                  fontSize: 15,
                  color: Color(0xFFFFB7B2),
                  fontWeight: FontWeight.bold,
                  decoration: TextDecoration.underline,
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHomeButton({
    required String title,
    required IconData icon,
    required Color iconBg,
    required VoidCallback onTap,
  }) {
    const Color ink = Color(0xFF1A1A2E);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10),
      height: 90,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: ink, width: 3),
            boxShadow: const [
              BoxShadow(
                color: ink,
                offset: Offset(4, 4),
                blurRadius: 0,
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: iconBg,
                  shape: BoxShape.circle,
                  border: Border.all(color: ink, width: 2.5),
                ),
                child: Icon(icon, color: ink, size: 26),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontFamily: 'Gaegu',
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: ink,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
