import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:uuid/uuid.dart';
import 'package:http/http.dart' as http;

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
      displayName: json['displayName'] ?? '',
      isYou: json['id'] == selfId,
    );
  }
}

class RoomState extends ChangeNotifier {
  io.Socket? _socket;
  final String serverUrl;

  List<RoomParticipant> _participants = [];
  String _selfId = '';
  String _status = 'Disconnected';
  String _roomCode = '';
  String _displayName = '';
  bool _showToast = false;
  String _step = 'join';

  // Getters
  io.Socket? get socket => _socket;
  List<RoomParticipant> get participants => _participants;
  String get selfId => _selfId;
  String get status => _status;
  String get roomCode => _roomCode;
  String get displayName => _displayName;
  bool get showToast => _showToast;
  String get step => _step;

  RoomState({required this.serverUrl}) {
    _initSocket();
  }

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

  void _initSocket() {
    _socket = io.io(serverUrl, io.OptionBuilder()
      .setTransports(['websocket', 'polling'])
      .enableReconnection()
      .setReconnectionAttempts(5)
      .setReconnectionDelay(1000)
      .setTimeout(10000)
      .build()
    );

    _socket?.onConnect((_) {
      _status = 'Connected';
      _selfId = _socket?.id ?? '';
      notifyListeners();
    });

    _socket?.onConnectError((err) {
      _status = 'Connection Error: $err';
      notifyListeners();
    });

    _socket?.onDisconnect((reason) {
      _status = 'Disconnected: $reason';
      notifyListeners();
    });

    _socket?.on('room:error', (data) {
      _status = 'Room Error: ${data['message'] ?? data}';
      _step = 'join';
      notifyListeners();
    });

    _socket?.on('room:joined', (data) {
      final String? serverSelfId = data['selfId'];
      if (serverSelfId != null) {
        _selfId = serverSelfId;
      }

      final List<dynamic>? joined = data['participants'];
      if (joined != null) {
        _participants = joined
            .map((p) => RoomParticipant.fromJson(p, _selfId))
            .toList();
      }
      notifyListeners();
    });
  }

  void generateRoomCode() {
    const uuid = Uuid();
    _roomCode = uuid.v4().split('-')[0].toUpperCase();
    notifyListeners();
  }

  bool joinRoom({int groupSize = 2}) {
    if (_displayName.trim().isEmpty) return false;
    if (_roomCode.trim().isEmpty) return false;

    _socket?.emit('room:join', {
      'code': _roomCode,
      'displayName': _displayName,
    });
    
    _step = 'room';
    notifyListeners();
    return true;
  }

  void leaveRoom() {
    _socket?.emit('room:leave');
    _participants.clear();
    _step = 'join';
    notifyListeners();
  }

  void emitLayout(String layout) {
    _socket?.emit('session:layout', layout);
  }

  void emitGroupSize(int size) {
    _socket?.emit('room:group-size', size);
  }

  void emitSessionStart(String layout) {
    _socket?.emit('session:start', {'layout': layout});
  }

  Future<void> requestAndSendLocation(double lat, double lng, double accuracy) async {
    if (_socket == null || _selfId.isEmpty) return;

    String? city;
    String? country;

    // 1. Try BigDataCloud Reverse Geocoding API
    try {
      final url = Uri.parse(
        'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=$lat&longitude=$lng&localityLanguage=en'
      );
      final res = await http.get(url);
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        city = data['city'] ?? data['locality'] ?? data['principalSubdivision'];
        country = data['countryName'];
      }
    } catch (_) {}

    // 2. Fallback to GeocodeMaps API
    if (city == null && country == null) {
      try {
        final url = Uri.parse('https://geocode.maps.co/reverse?lat=$lat&lon=$lng');
        final res = await http.get(url);
        if (res.statusCode == 200) {
          final data = json.decode(res.body);
          final addr = data['address'] ?? {};
          city = addr['city'] ?? addr['town'] ?? addr['village'] ?? addr['county'] ?? addr['state'];
          country = addr['country'];
        }
      } catch (_) {}
    }

    _socket?.emit('location:update', {
      'lat': lat,
      'lng': lng,
      'accuracy': accuracy,
      'city': city,
      'country': country,
    });
  }

  @override
  void dispose() {
    _socket?.dispose();
    super.dispose();
  }
}
