import 'package:flutter/material.dart';
import '../constants/translations.dart';
import '../services/room_state.dart';
import 'waiting_screen.dart';

class JoinScreen extends StatefulWidget {
  final RoomState roomState;
  final String locale;

  const JoinScreen({
    super.key,
    required this.roomState,
    required this.locale,
  });

  @override
  State<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends State<JoinScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _codeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _nameController.text = widget.roomState.displayName;
    _codeController.text = widget.roomState.roomCode;
  }

  @override
  Widget build(BuildContext context) {
    const Color ink = Color(0xFF1A1A2E);
    const Color yellow = Color(0xFFFFD93D);
    const Color pink = Color(0xFFFF6B9D);

    String t(String key) => AppTranslations.translate(key, widget.locale);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: yellow,
        elevation: 0,
        shape: const Border(bottom: BorderSide(color: ink, width: 3)),
        title: Text(
          t('join.title'),
          style: const TextStyle(
            fontFamily: 'Gaegu',
            fontWeight: FontWeight.bold,
            color: ink,
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Center(
          child: SingleChildScrollView(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: ink, width: 3),
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(color: ink, offset: Offset(5, 5), blurRadius: 0)
                ],
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    t('join.yourName'),
                    style: const TextStyle(
                      fontFamily: 'Gaegu',
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _nameController,
                    onChanged: (val) => widget.roomState.setDisplayName(val),
                    style: const TextStyle(fontWeight: FontWeight.bold, color: ink),
                    decoration: InputDecoration(
                      hintText: t('join.namePlaceholder'),
                      filled: true,
                      fillColor: const Color(0xFFFFFDF5),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: ink, width: 2.5),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: pink, width: 2.5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    t('join.roomCode'),
                    style: const TextStyle(
                      fontFamily: 'Gaegu',
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _codeController,
                          onChanged: (val) => widget.roomState.setRoomCode(val),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: ink),
                          decoration: InputDecoration(
                            hintText: t('join.codePlaceholder'),
                            filled: true,
                            fillColor: const Color(0xFFFFFDF5),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: ink, width: 2.5),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: pink, width: 2.5),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      IconButton(
                        onPressed: () {
                          widget.roomState.generateRoomCode();
                          _codeController.text = widget.roomState.roomCode;
                        },
                        icon: const Icon(Icons.autorenew, color: ink),
                        style: IconButton.styleFrom(
                          backgroundColor: yellow,
                          side: const BorderSide(color: ink, width: 2),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 32),
                  InkWell(
                    onTap: () {
                      if (widget.roomState.joinRoom()) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => WaitingScreen(
                              roomState: widget.roomState,
                              locale: widget.locale,
                            ),
                          ),
                        );
                      }
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
                        t('join.enterButton'),
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
      ),
    );
  }
}
