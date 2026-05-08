import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

/// RoomParticipant model
class RoomParticipant {
  final String id;
  final String displayName;
  final bool isYou;

  RoomParticipant({
    required this.id,
    required this.displayName,
    required this.isYou,
  });

  factory RoomParticipant.fromJson(Map<String, dynamic> json, String selfId) {
    return RoomParticipant(
      id: json['id'] ?? '',
      displayName: json['displayName'] ?? json['name'] ?? 'Unknown',
      isYou: (json['id'] ?? '') == selfId,
    );
  }
}

/// Platform-independent WebSocket channel adapter — mirrors client/lib/SocketAdapter.js exactly.
/// Connects to: wss://<server>/ws?room=ROOMCODE
/// Message format: { "type": "event:name", "payload": { ... } }
class RoomState extends ChangeNotifier {
  final String serverUrl;

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  bool _connected = false;
  bool _isConnecting = false;
  bool _isManualClose = false;
  String? _pendingRoomCode;
  String _selfId = '';
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 5;

  List<RoomParticipant> _participants = [];
  String _status = 'Disconnected';
  String _roomCode = '';
  String _displayName = '';
  bool _showToast = false;
  String _step = 'join';
  String _sessionLayout = 'layout4';

  // Pending emits queue (before connection opens)
  final List<Map<String, dynamic>> _pendingEmits = [];

  // Event listeners map
  final Map<String, List<Function(dynamic)>> _listeners = {};

  // Getters
  bool get isConnected => _connected;
  List<RoomParticipant> get participants => _participants;
  String get selfId => _selfId;
  String get status => _status;
  String get roomCode => _roomCode;
  String get displayName => _displayName;
  bool get showToast => _showToast;
  String get step => _step;
  String get sessionLayout => _sessionLayout;

  RoomState({required this.serverUrl});

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC STATE SETTERS
  // ─────────────────────────────────────────────────────────────────

  void setStep(String newStep) {
    _step = newStep;
    notifyListeners();
  }

  void setDisplayName(String name) {
    _displayName = name;
    notifyListeners();
  }

  void setRoomCode(String code) {
    _roomCode = code.toUpperCase();
    notifyListeners();
  }

  void generateRoomCode() {
    const uuid = Uuid();
    _roomCode = uuid.v4().split('-')[0].toUpperCase();
    notifyListeners();
  }

  // ─────────────────────────────────────────────────────────────────
  // SOLO SESSION (no WebSocket needed)
  // ─────────────────────────────────────────────────────────────────

  void startSoloSession() {
    _displayName = 'YOU';
    _selfId = 'you';
    _participants = [
      RoomParticipant(id: 'you', displayName: 'YOU', isYou: true),
    ];
    _step = 'countdown';
    notifyListeners();
  }

  // ─────────────────────────────────────────────────────────────────
  // CROSS-PLATFORM WEBSOCKET CONNECTION
  // ─────────────────────────────────────────────────────────────────

  /// Connects to wss://<server>/ws?room=<roomCode>
  /// Called when the user emits 'room:join'
  void _connect(String roomCode) {
    if (_channel != null) return;
    if (_isConnecting) return;

    _pendingRoomCode = roomCode;
    _isConnecting = true;
    _isManualClose = false;

    final wsUrl = _buildWsUrl(roomCode);
    debugPrint('[Socket] Connecting to: $wsUrl');

    try {
      final channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _channel = channel;
      _isConnecting = false;
      _reconnectAttempts = 0;
      _connected = true;
      _selfId = const Uuid().v4();
      _status = 'Connected';
      notifyListeners();

      // Flush pending emits
      for (final item in List.from(_pendingEmits)) {
        _sendRaw(item['event'] as String, item['data']);
      }
      _pendingEmits.clear();

      // Listen for incoming messages
      _subscription = channel.stream.listen(
        (raw) {
          _handleRawMessage(raw);
        },
        onDone: () {
          debugPrint('[Socket] Disconnected');
          _connected = false;
          _channel = null;
          _subscription = null;
          _status = 'Disconnected';
          notifyListeners();
          if (!_isManualClose) _scheduleReconnect();
        },
        onError: (e) {
          debugPrint('[Socket] Error: $e');
          _connected = false;
          _channel = null;
          _subscription = null;
          _status = 'Connection Error';
          notifyListeners();
          if (!_isManualClose) _scheduleReconnect();
        },
      );
    } catch (e) {
      debugPrint('[Socket] Connect failed: $e');
      _isConnecting = false;
      _status = 'Connection Failed';
      notifyListeners();
      _scheduleReconnect();
    }
  }

  String _buildWsUrl(String roomCode) {
    final uri = Uri.parse(serverUrl);
    final scheme = uri.scheme == 'https' ? 'wss' : 'ws';
    return Uri(
      scheme: scheme,
      host: uri.host,
      port: uri.hasPort ? uri.port : null,
      path: '/ws',
      queryParameters: {'room': roomCode},
    ).toString();
  }

  void _handleRawMessage(dynamic raw) {
    try {
      final decoded = jsonDecode(raw as String) as Map<String, dynamic>;
      final type = decoded['type'] as String? ?? '';
      final payload = decoded['payload'];
      _dispatchEvent(type, payload);
    } catch (e) {
      debugPrint('[Socket] Parse error: $e');
    }
  }

  void _dispatchEvent(String event, dynamic payload) {
    switch (event) {
      case 'room:joined':
        final data = payload as Map<String, dynamic>? ?? {};
        final serverSelfId = data['selfId'] as String?;
        if (serverSelfId != null) _selfId = serverSelfId;
        final joined = data['participants'] as List<dynamic>?;
        if (joined != null) {
          _participants = joined
              .map((p) => RoomParticipant.fromJson(
                    Map<String, dynamic>.from(p as Map),
                    _selfId,
                  ))
              .toList();
        }
        notifyListeners();
        break;
      case 'room:update':
        final data = payload as Map<String, dynamic>? ?? {};
        final updated = data['participants'] as List<dynamic>?;
        if (updated != null) {
          _participants = updated
              .map((p) => RoomParticipant.fromJson(
                    Map<String, dynamic>.from(p as Map),
                    _selfId,
                  ))
              .toList();
        }
        notifyListeners();
        break;
      case 'session:start':
        final data = payload as Map<String, dynamic>? ?? {};
        _sessionLayout = data['layout'] as String? ?? 'layout4';
        _step = 'countdown';
        notifyListeners();
        break;
      case 'room:error':
        _status = 'Room Error';
        _step = 'join';
        notifyListeners();
        break;
    }

    // Also fire any registered external listeners (for WebRTC, etc.)
    final handlers = _listeners[event] ?? [];
    for (final h in handlers) {
      try {
        h(payload);
      } catch (e) {
        debugPrint('[Socket] Handler error for $event: $e');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // EMIT SYSTEM
  // ─────────────────────────────────────────────────────────────────

  void emit(String event, dynamic data) {
    // Special: room:join triggers connection
    if (event == 'room:join') {
      final code = (data as Map<String, dynamic>?)?['code'] as String? ?? _roomCode;
      _connect(code);
      _pendingEmits.add({'event': event, 'data': data});
      return;
    }

    if (_channel == null) {
      _pendingEmits.add({'event': event, 'data': data});
      return;
    }

    _sendRaw(event, data);
  }

  void _sendRaw(String event, dynamic data) {
    _channel?.sink.add(jsonEncode({'type': event, 'payload': data}));
  }

  // ─────────────────────────────────────────────────────────────────
  // EVENT LISTENER REGISTRATION (for WebRTC service)
  // ─────────────────────────────────────────────────────────────────

  void on(String event, Function(dynamic) handler) {
    _listeners.putIfAbsent(event, () => []).add(handler);
  }

  void off(String event, Function(dynamic) handler) {
    _listeners[event]?.remove(handler);
  }

  // ─────────────────────────────────────────────────────────────────
  // JOIN ROOM (called from JoinScreen button)
  // ─────────────────────────────────────────────────────────────────

  bool joinRoom() {
    if (_displayName.trim().isEmpty || _roomCode.trim().isEmpty) return false;
    emit('room:join', {
      'code': _roomCode,
      'displayName': _displayName,
    });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────
  // SESSION CONTROL
  // ─────────────────────────────────────────────────────────────────

  void emitSessionStart(String layout) {
    emit('session:start', {'layout': layout});
  }

  void setSessionLayout(String layout) {
    _sessionLayout = layout;
    notifyListeners();
  }

  // ─────────────────────────────────────────────────────────────────
  // RECONNECT LOGIC
  // ─────────────────────────────────────────────────────────────────

  void _scheduleReconnect() {
    if (_pendingRoomCode == null) return;
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('[Socket] Max reconnect attempts reached');
      return;
    }

    final delay = Duration(
      milliseconds: min(1000 * pow(2, _reconnectAttempts).toInt(), 30000),
    );
    debugPrint('[Socket] Reconnecting in ${delay.inMilliseconds}ms (attempt ${_reconnectAttempts + 1})');

    Future.delayed(delay, () {
      _reconnectAttempts++;
      _connect(_pendingRoomCode!);
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────

  @override
  void dispose() {
    _isManualClose = true;
    _subscription?.cancel();
    _channel?.sink.close();
    super.dispose();
  }
}
