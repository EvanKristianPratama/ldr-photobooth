import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:uuid/uuid.dart';

class IncomingFileData {
  final Map<String, dynamic> meta;
  final List<Uint8List> chunks;

  IncomingFileData({required this.meta, required this.chunks});
}

class WebRTCService extends ChangeNotifier {
  final dynamic socket; // The Socket.io instance from RoomState
  final Function(String, int, Uint8List) onPhotoReceived; // callback for received photos

  final Map<String, RTCPeerConnection> _pcs = {};
  final Map<String, RTCDataChannel> _dcs = {};
  final Map<String, bool> _makingOffers = {};
  final Map<String, bool> _ignoreOffers = {};
  final Map<String, IncomingFileData> _incomingFiles = {};
  final Map<String, List<RTCIceCandidate>> _candidatesQueues = {};

  bool _socketOnly = false;
  String _status = 'Disconnected';

  // Getters
  String get status => _status;
  bool get socketOnly => _socketOnly;

  WebRTCService({
    required this.socket,
    required this.onPhotoReceived,
  }) {
    _registerSocketListeners();
  }

  void _registerSocketListeners() {
    socket?.on('webrtc:offer', (data) async {
      final sdp = data['sdp'];
      final from = data['from'];
      if (sdp != null && from != null) {
        await _handleOffer(sdp['sdp'], from);
      }
    });

    socket?.on('webrtc:answer', (data) async {
      final sdp = data['sdp'];
      final from = data['from'];
      if (sdp != null && from != null) {
        await _handleAnswer(sdp['sdp'], from);
      }
    });

    socket?.on('webrtc:candidate', (data) async {
      final candidate = data['candidate'];
      final from = data['from'];
      if (candidate != null && from != null) {
        await _handleCandidate(candidate, from);
      }
    });
  }

  void enableSocketFallback(String reason) {
    _socketOnly = true;
    _status = 'Socket fallback: $reason';
    _pcs.forEach((_, pc) => pc.close());
    _pcs.clear();
    _dcs.clear();
    notifyListeners();
  }

  Future<RTCPeerConnection> _getOrCreatePC(String remoteId) async {
    if (_pcs.containsKey(remoteId)) return _pcs[remoteId]!;

    final Map<String, dynamic> configuration = {
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'}
      ]
    };

    final pc = await createPeerConnection(configuration);

    pc.onIceCandidate = (RTCIceCandidate candidate) {
      socket?.emit('webrtc:candidate', {
        'to': remoteId,
        'candidate': {
          'candidate': candidate.candidate,
          'sdpMid': candidate.sdpMid,
          'sdpMLineIndex': candidate.sdpMLineIndex,
        }
      });
    };

    pc.onDataChannel = (RTCDataChannel channel) {
      _setupDataChannel(remoteId, channel);
    };

    pc.onConnectionState = (RTCPeerConnectionState state) {
      if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
        _status = 'Connected to ${remoteId.substring(0, remoteId.length > 4 ? 4 : remoteId.length)}';
        notifyListeners();
      } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed ||
                 state == RTCPeerConnectionState.RTCPeerConnectionStateDisconnected ||
                 state == RTCPeerConnectionState.RTCPeerConnectionStateClosed) {
        _pcs.remove(remoteId);
        _dcs.remove(remoteId);
      }
    };

    _pcs[remoteId] = pc;
    return pc;
  }

  void _setupDataChannel(String peerId, RTCDataChannel dc) {
    _dcs[peerId] = dc;
    dc.onMessage = (RTCDataChannelMessage message) {
      _handleDataChannelMessage(peerId, message);
    };
    dc.onDataChannelState = (RTCDataChannelState state) {
      if (state == RTCDataChannelState.RTCDataChannelStateClosed) {
        _dcs.remove(peerId);
      }
    };
  }

  void _handleDataChannelMessage(String peerId, RTCDataChannelMessage message) {
    if (message.isBinary) {
      final fileData = _incomingFiles[peerId];
      if (fileData != null) {
        fileData.chunks.add(message.binary);
      }
    } else {
      try {
        final msg = json.decode(message.text);
        if (msg['type'] == 'meta') {
          _incomingFiles[peerId] = IncomingFileData(
            meta: msg,
            chunks: [],
          );
        } else if (msg['type'] == 'done') {
          final fileData = _incomingFiles[peerId];
          if (fileData != null) {
            final int index = fileData.meta['index'] ?? 0;
            
            // Combine all chunks into one single Uint8List
            final totalBytes = fileData.chunks.fold<int>(0, (sum, chunk) => sum + chunk.length);
            final resultBytes = Uint8List(totalBytes);
            int offset = 0;
            for (final chunk in fileData.chunks) {
              resultBytes.setRange(offset, offset + chunk.length, chunk);
              offset += chunk.length;
            }

            onPhotoReceived(peerId, index, resultBytes);
            _incomingFiles.remove(peerId);
          }
        }
      } catch (_) {}
    }
  }

  Future<void> connectPeers(List<String> others, bool socketOnly) async {
    if (socketOnly) {
      enableSocketFallback('socket-only-mode');
      return;
    }

    final String myId = socket?.id ?? '';
    if (myId.isEmpty) return;

    for (final remoteId in others) {
      if (_pcs.containsKey(remoteId)) continue;

      try {
        final pc = await _getOrCreatePC(remoteId);
        final RTCDataChannelInit init = RTCDataChannelInit();
        final dc = await pc.createDataChannel('ldr-channel', init);
        _setupDataChannel(remoteId, dc);

        _makingOffers[remoteId] = true;
        final offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        _makingOffers[remoteId] = false;

        socket?.emit('webrtc:offer', {
          'to': remoteId,
          'sdp': {'sdp': offer.sdp, 'type': offer.type}
        });
      } catch (err) {
        _makingOffers[remoteId] = false;
        debugPrint('WebRTC Offer Error: $err');
      }
    }
  }

  Future<void> sendPhotoToPeer(Uint8List imageBytes, int index, int chunkSize) async {
    if (_socketOnly) {
      _sendViaSocketFallback(imageBytes, index);
      return;
    }

    const uuid = Uuid();
    final fileId = uuid.v4();

    for (final entry in _dcs.entries) {
      final peerId = entry.key;
      final dc = entry.value;

      try {
        dc.send(RTCDataChannelMessage(json.encode({
          'type': 'meta',
          'id': fileId,
          'size': imageBytes.length,
          'index': index,
        })));

        int offset = 0;
        while (offset < imageBytes.length) {
          int end = offset + chunkSize;
          if (end > imageBytes.length) end = imageBytes.length;
          final chunk = imageBytes.sublist(offset, end);

          dc.send(RTCDataChannelMessage.fromBinary(chunk));
          offset += chunk.length;
          
          // Small delay to prevent network congestion
          await Future.delayed(const Duration(milliseconds: 5));
        }

        dc.send(RTCDataChannelMessage(json.encode({
          'type': 'done',
          'id': fileId,
        })));
      } catch (_) {
        _sendViaSocketFallback(imageBytes, index);
      }
    }
  }

  void _sendViaSocketFallback(Uint8List imageBytes, int index) {
    socket?.emit('photo:send', {
      'index': index,
      'image': base64Encode(imageBytes),
    });
  }

  Future<void> _handleOffer(String sdpText, String from) async {
    try {
      final pc = await _getOrCreatePC(from);
      final String myId = socket?.id ?? '';
      final isPolite = myId.compareTo(from) > 0;
      final offerCollision = pc.signalingState != RTCSignalingState.RTCSignalingStateStable || (_makingOffers[from] ?? false);

      _ignoreOffers[from] = !isPolite && offerCollision;
      if (_ignoreOffers[from] == true) return;

      final RTCSessionDescription description = RTCSessionDescription(sdpText, 'offer');
      await pc.setRemoteDescription(description);
      await _processCandidatesQueue(from);

      final answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit('webrtc:answer', {
        'to': from,
        'sdp': {'sdp': answer.sdp, 'type': answer.type}
      });
    } catch (_) {}
  }

  Future<void> _handleAnswer(String sdpText, String from) async {
    try {
      final pc = _pcs[from];
      if (pc != null && _ignoreOffers[from] != true) {
        if (pc.signalingState == RTCSignalingState.RTCSignalingStateStable) return;
        final RTCSessionDescription description = RTCSessionDescription(sdpText, 'answer');
        await pc.setRemoteDescription(description);
        await _processCandidatesQueue(from);
      }
    } catch (_) {}
  }

  Future<void> _handleCandidate(Map<String, dynamic> rawCandidate, String from) async {
    final pc = _pcs[from];
    final RTCIceCandidate candidate = RTCIceCandidate(
      rawCandidate['candidate'],
      rawCandidate['sdpMid'],
      rawCandidate['sdpMLineIndex'],
    );

    if (pc != null) {
      try {
        final remoteDesc = await pc.getRemoteDescription();
        if (remoteDesc == null) {
          _candidatesQueues.putIfAbsent(from, () => []).add(candidate);
          return;
        }
        await pc.addCandidate(candidate);
      } catch (_) {}
    }
  }

  Future<void> _processCandidatesQueue(String peerId) async {
    final pc = _pcs[peerId];
    if (pc == null) return;
    
    final remoteDesc = await pc.getRemoteDescription();
    if (remoteDesc == null) return;

    final queue = _candidatesQueues[peerId] ?? [];
    while (queue.isNotEmpty) {
      final candidate = queue.removeAt(0);
      try {
        await pc.addCandidate(candidate);
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _pcs.forEach((_, pc) => pc.close());
    _pcs.clear();
    _dcs.clear();
    super.dispose();
  }
}
