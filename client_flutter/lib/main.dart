import 'package:flutter/material.dart';
import 'constants/translations.dart';

import 'services/room_state.dart';
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
    _roomState = RoomState(serverUrl: 'https://ldr-photobooth-server.evan.workers.dev'); // Connects to existing worker backend!
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
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'FUTU ✦ PHOTO',
              style: TextStyle(
                fontFamily: 'Gaegu',
                fontWeight: FontWeight.bold,
                fontSize: 26,
                color: ink,
              ),
            ),
            // Language Dropdown Selector
            Container(
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
      ),
      body: Stack(
        children: [
          // Background subtle neobrutalist decorations
          Positioned(
            left: -40,
            top: 60,
            child: Opacity(
              opacity: 0.08,
              child: Container(
                width: 150,
                height: 150,
                decoration: const BoxDecoration(
                  color: pink,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          Positioned(
            right: -20,
            bottom: 40,
            child: Opacity(
              opacity: 0.08,
              child: Container(
                width: 120,
                height: 120,
                decoration: const BoxDecoration(
                  color: teal,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          
          // Main Body Scrollable Layout
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Center(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Subtitle / Intro
                    Text(
                      t('hero.subtitle'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'Gaegu',
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: pink,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      t('hero.desc'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 16,
                        height: 1.4,
                        color: ink,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 40),

                    // SOLO MODE CARD
                    _buildNeobrutalistCard(
                      title: t('solo.title'),
                      desc: t('solo.desc'),
                      buttonText: t('solo.button'),
                      cardBg: Colors.white,
                      buttonBg: yellow,
                      buttonBorder: ink,
                      onTap: () {
                        roomState.startSoloSession();
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => CaptureScreen(
                              roomState: roomState,
                              locale: locale,
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 24),

                    // DUO MODE CARD
                    _buildNeobrutalistCard(
                      title: t('duo.title'),
                      desc: t('duo.desc'),
                      buttonText: t('duo.create') + " ✦",
                      cardBg: Colors.white,
                      buttonBg: pink,
                      buttonBorder: ink,
                      textColor: Colors.white,
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
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNeobrutalistCard({
    required String title,
    required String desc,
    required String buttonText,
    required Color cardBg,
    required Color buttonBg,
    required Color buttonBorder,
    Color textColor = const Color(0xFF1A1A2E),
    required VoidCallback onTap,
  }) {
    const Color ink = Color(0xFF1A1A2E);

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: ink, width: 3),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: ink,
            offset: Offset(5, 5),
            blurRadius: 0,
          )
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontFamily: 'Gaegu',
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: ink,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            desc,
            style: const TextStyle(
              fontSize: 14,
              height: 1.3,
              fontWeight: FontWeight.w500,
              color: Color(0xFF555566),
            ),
          ),
          const SizedBox(height: 20),
          // Action Shutter Button
          InkWell(
            onTap: onTap,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: buttonBg,
                border: Border.all(color: buttonBorder, width: 2.5),
                borderRadius: BorderRadius.circular(10),
                boxShadow: const [
                  BoxShadow(
                    color: ink,
                    offset: Offset(3, 3),
                    blurRadius: 0,
                  )
                ],
              ),
              child: Text(
                buttonText,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Gaegu',
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: textColor == Colors.white ? Colors.white : ink,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
