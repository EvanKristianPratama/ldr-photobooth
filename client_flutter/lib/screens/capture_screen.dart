import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;
import '../constants/translations.dart';
import '../services/room_state.dart';
import 'editor_screen.dart';

class CaptureScreen extends StatefulWidget {
  final RoomState roomState;
  final String locale;
  final bool isSolo;

  const CaptureScreen({
    super.key,
    required this.roomState,
    required this.locale,
    this.isSolo = true,
  });

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  CameraController? _cameraController;
  bool _isCameraInitialized = false;

  int _currentShot = 1;
  int _maxShots = 4;
  int _countdown = 6;
  Timer? _timer;
  bool _showFlash = false;
  final List<Uint8List> _capturedPhotos = [];
  String _alertText = '';

  @override
  void initState() {
    super.initState();
    // Clear any previous remote photos
    widget.roomState.clearRemotePhotos();

    // Parse max shots dynamically from the room's chosen session layout
    final layout = widget.roomState.sessionLayout;
    if (layout == 'layout1') {
      _maxShots = 1;
    } else if (layout == 'layout2') {
      _maxShots = 2;
    } else if (layout == 'layout3') {
      _maxShots = 3;
    } else {
      _maxShots = 4;
    }
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

  Uint8List _compressPhoto(Uint8List originalBytes) {
    try {
      final decoded = img.decodeImage(originalBytes);
      if (decoded == null) return originalBytes;

      // Downscale to 800px width (keeping aspect ratio) for super-fast mobile transfer
      img.Image resized = decoded;
      if (decoded.width > 800) {
        resized = img.copyResize(decoded, width: 800);
      }

      // Encode to JPEG with 70% quality (extremely small, lightweight, and super high quality!)
      return Uint8List.fromList(img.encodeJpg(resized, quality: 70));
    } catch (e) {
      debugPrint('[Compress] Error compressing photo: $e');
      return originalBytes;
    }
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

      // In Duo/Group (LDR) mode, broadcast captured photo to other peers with lightning compression
      if (!widget.isSolo) {
        try {
          final compressedBytes = _compressPhoto(bytes);
          final base64Photo = base64Encode(compressedBytes);
          widget.roomState.emit('photo:send', {
            'index': _currentShot - 1,
            'mime': 'image/jpeg',
            'base64': base64Photo,
          });
        } catch (e) {
          debugPrint('[Socket] Error emitting captured photo: $e');
        }
      }

      // Hide flash screen after 150ms
      await Future.delayed(const Duration(milliseconds: 150));
      if (!mounted) return;

      setState(() {
        _showFlash = false;
      });

      if (_currentShot < _maxShots) {
        setState(() {
          _currentShot++;
        });
        _startCountdownSequence();
      } else {
        _timer?.cancel();

        // In Duo/Group (LDR) mode, wait for other participant's photos to be synced
        if (!widget.isSolo) {
          setState(() {
            _alertText = 'SYNCING PHOTOS WITH PEERS...';
          });

          final remotePeersCount = widget.roomState.participants.length - 1;
          bool isSyncComplete() {
            if (widget.roomState.remotePhotos.length < remotePeersCount) return false;
            for (final peerPhotos in widget.roomState.remotePhotos.values) {
              if (peerPhotos.length < _maxShots) return false;
            }
            return true;
          }

          int attempts = 0;
          while (!isSyncComplete() && attempts < 150) { // Max 15 seconds wait
            await Future.delayed(const Duration(milliseconds: 100));
            attempts++;
          }
        }

        if (!mounted) return;

        // Complete! Move to Editor Screen
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
    const Color teal = Color(0xFF06D6A0);

    return Scaffold(
      backgroundColor: ink,
      body: Stack(
        children: [
          // 1. Full-screen Immersive Camera Preview (Just like a real camera app!)
          _isCameraInitialized && _cameraController != null
              ? Positioned.fill(
                  child: ClipRRect(
                    child: FittedBox(
                      fit: BoxFit.cover,
                      child: SizedBox(
                        width: _cameraController!.value.previewSize?.height ?? 1080,
                        height: _cameraController!.value.previewSize?.width ?? 1920,
                        child: CameraPreview(_cameraController!),
                      ),
                    ),
                  ),
                )
              : const Center(
                  child: CircularProgressIndicator(color: yellow),
                ),

          // 2. Translucent Screen Flash Overlay
          if (_showFlash)
            Positioned.fill(
              child: Container(
                color: Colors.white,
              ),
            ),

          // 3. Floating Alert Banner Top (Elegant pill shape, translucent)
          Positioned(
            top: 50,
            left: 20,
            right: 20,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white.withOpacity(0.15), width: 1),
                ),
                child: Text(
                  _alertText.toUpperCase(),
                  style: const TextStyle(
                    fontFamily: 'Gaegu',
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 1.0,
                  ),
                ),
              ),
            ),
          ),

          // 4. Centered Large Countdown with Drop Shadow
          Center(
            child: Text(
              '$_countdown',
              style: TextStyle(
                fontFamily: 'Gaegu',
                fontSize: 160,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                shadows: [
                  Shadow(
                    color: Colors.black.withOpacity(0.6),
                    offset: const Offset(4, 4),
                    blurRadius: 12,
                  ),
                ],
              ),
            ),
          ),

          // 5. Immersive Phone Camera Bottom Controls & Status HUD
          Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Translucent Shot Indicator Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withOpacity(0.1), width: 1),
                  ),
                  child: Text(
                    'SHOT $_currentShot / $_maxShots',
                    style: const TextStyle(
                      fontFamily: 'Gaegu',
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: yellow,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Camera Shutter Button & Progress Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Dynamic bullet progress indicators on the left side
                    SizedBox(
                      width: 80,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: List.generate(_maxShots, (index) {
                          final isDone = index < _currentShot - 1;
                          final isCurrent = index == _currentShot - 1;
                          return Container(
                            margin: const EdgeInsets.only(left: 6),
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: isDone
                                  ? teal
                                  : isCurrent
                                      ? yellow
                                      : Colors.white.withOpacity(0.4),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.black.withOpacity(0.3), width: 1),
                            ),
                          );
                        }),
                      ),
                    ),
                    
                    // Native Circular Shutter Button in the center
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 4),
                      ),
                      padding: const EdgeInsets.all(4),
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    
                    // Balanced placeholder on the right side
                    const SizedBox(width: 80),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
