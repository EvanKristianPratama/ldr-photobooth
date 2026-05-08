import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../constants/translations.dart';
import '../services/room_state.dart';
import 'editor_screen.dart';

class CaptureScreen extends StatefulWidget {
  final RoomState roomState;
  final String locale;

  const CaptureScreen({
    super.key,
    required this.roomState,
    required this.locale,
  });

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  CameraController? _cameraController;
  bool _isCameraInitialized = false;

  int _currentShot = 1;
  int _countdown = 6;
  Timer? _timer;
  bool _showFlash = false;
  final List<Uint8List> _capturedPhotos = [];
  String _alertText = '';

  @override
  void initState() {
    super.initState();
    _initLocalCamera();
  }

  Future<void> _initLocalCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isNotEmpty) {
        // Find front camera if possible
        final frontCam = cameras.firstWhere(
          (c) => c.lensDirection == CameraLensDirection.front,
          orElse: () => cameras.first,
        );

        _cameraController = CameraController(
          frontCam,
          ResolutionPreset.medium,
          enableAudio: false,
        );

        await _cameraController!.initialize();
        if (mounted) {
          setState(() {
            _isCameraInitialized = true;
          });
          _startCountdownSequence();
        }
      }
    } catch (e) {
      debugPrint('Camera Initialization Error: $e');
    }
  }

  void _startCountdownSequence() {
    _countdown = 6;
    _alertText = AppTranslations.translate('capture.prepare', widget.locale);

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }

      setState(() {
        if (_countdown > 1) {
          _countdown--;
          if (_countdown <= 2) {
            _alertText = AppTranslations.translate('capture.smile', widget.locale);
          }
        } else {
          // Take picture
          timer.cancel();
          _triggerShutterCapture();
        }
      });
    });
  }

  Future<void> _triggerShutterCapture() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;

    try {
      // Trigger camera flash screen effect
      setState(() {
        _showFlash = true;
      });

      final XFile rawFile = await _cameraController!.takePicture();
      final Uint8List bytes = await rawFile.readAsBytes();
      _capturedPhotos.add(bytes);

      // Hide flash screen after 150ms
      await Future.delayed(const Duration(milliseconds: 150));
      if (!mounted) return;

      setState(() {
        _showFlash = false;
      });

      if (_currentShot < 4) {
        setState(() {
          _currentShot++;
        });
        _startCountdownSequence();
      } else {
        // Complete! Move to Frame Select Screen
        _timer?.cancel();
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => EditorScreen(
              roomState: widget.roomState,
              capturedPhotos: _capturedPhotos,
              locale: widget.locale,
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Photo Capture Error: $e');
      // Retry
      _startCountdownSequence();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const Color ink = Color(0xFF1A1A2E);
    const Color yellow = Color(0xFFFFD93D);
    const Color pink = Color(0xFFFF6B9D);

    return Scaffold(
      backgroundColor: ink,
      body: Stack(
        children: [
          // 1. Camera Stream Viewport
          Center(
            child: _isCameraInitialized && _cameraController != null
                ? AspectRatio(
                    aspectRatio: _cameraController!.value.aspectRatio,
                    child: CameraPreview(_cameraController!),
                  )
                : const Center(
                    child: CircularProgressIndicator(color: yellow),
                  ),
          ),

          // 2. Translucent Screen Flash Overlay
          if (_showFlash)
            Positioned.fill(
              child: Container(
                color: Colors.white,
              ),
            ),

          // 3. Shutter Alert Banner Top
          Positioned(
            top: 60,
            left: 24,
            right: 24,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
              decoration: BoxDecoration(
                color: pink,
                border: Border.all(color: ink, width: 3),
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [
                  BoxShadow(color: ink, offset: Offset(3, 3), blurRadius: 0)
                ],
              ),
              child: Text(
                _alertText,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'Gaegu',
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),

          // 4. Countdown Timer Overlay Centered
          Center(
            child: Text(
              '$_countdown',
              style: TextStyle(
                fontFamily: 'Gaegu',
                fontSize: 180,
                fontWeight: FontWeight.w900,
                color: Colors.white.withOpacity(0.15),
              ),
            ),
          ),

          // 5. Progress Indicators Bottom Row
          Positioned(
            bottom: 60,
            left: 24,
            right: 24,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  decoration: BoxDecoration(
                    color: yellow,
                    border: Border.all(color: ink, width: 2.5),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'SHOT $_currentShot / 4',
                    style: const TextStyle(
                      fontFamily: 'Gaegu',
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: ink,
                    ),
                  ),
                ),
                // Bullet Dots progress list
                Row(
                  children: List.generate(4, (index) {
                    final isDone = index < _currentShot - 1;
                    final isCurrent = index == _currentShot - 1;
                    return Container(
                      margin: const EdgeInsets.only(left: 8),
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: isDone
                            ? const Color(0xFF06D6A0)
                            : isCurrent
                                ? yellow
                                : Colors.white.withOpacity(0.3),
                        shape: BoxShape.circle,
                        border: Border.all(color: ink, width: 2),
                      ),
                    );
                  }),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}
