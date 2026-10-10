// WebRTC P2P Real-time Voice Chat Engine
// True Peer-to-Peer audio mesh connecting participants in a voice room

export interface PeerAudioStatus {
  uid: string;
  displayName: string;
  volume: number;
  isSpeaking: boolean;
  isMuted: boolean;
  isConnected: boolean;
}

export class VoiceChatEngine {
  private roomId: string;
  private myUid: string;
  private myDisplayName: string;
  private isMicOn: boolean = false;
  private micStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private volumeAnalyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteAudioElements = new Map<string, HTMLAudioElement>();
  private peerStatusMap = new Map<string, PeerAudioStatus>();
  private onPeerSpeakingCallback: ((peers: Map<string, PeerAudioStatus>) => void) | null = null;
  private onLocalVolumeCallback: ((vol: number) => void) | null = null;
  private isDestroyed: boolean = false;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  constructor(roomId: string, myUid: string, myDisplayName: string) {
    this.roomId = roomId;
    this.myUid = myUid;
    this.myDisplayName = myDisplayName;
    this.initSignaling();
  }

  private initSignaling() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(`shakil_p2p_voice_${this.roomId}`);
        this.broadcastChannel.onmessage = async (event) => {
          await this.handleSignalingMessage(event.data);
        };

        // Announce presence in the room
        this.broadcastChannel.postMessage({
          type: 'p2p_join',
          from: this.myUid,
          name: this.myDisplayName,
        });
      }
    } catch (e) {
      console.warn('P2P Signaling init note:', e);
    }
  }

  public setCallbacks(
    onLocalVolume: (vol: number) => void,
    onPeerSpeaking: (peers: Map<string, PeerAudioStatus>) => void
  ) {
    this.onLocalVolumeCallback = onLocalVolume;
    this.onPeerSpeakingCallback = onPeerSpeaking;
  }

  public async startMicrophone(): Promise<boolean> {
    if (this.isDestroyed) return false;
    try {
      if (!navigator.mediaDevices?.getUserMedia) return false;

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.volumeAnalyser = this.audioCtx.createAnalyser();
      this.volumeAnalyser.fftSize = 256;
      this.volumeAnalyser.smoothingTimeConstant = 0.3;

      const sourceNode = this.audioCtx.createMediaStreamSource(this.micStream);
      sourceNode.connect(this.volumeAnalyser);

      this.isMicOn = true;
      this.startLocalVolumeMonitoring();

      // Attach audio track to all active peer connections
      const audioTrack = this.micStream.getAudioTracks()[0];
      if (audioTrack) {
        this.peerConnections.forEach((pc) => {
          const senders = pc.getSenders();
          const audioSender = senders.find((s) => s.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(audioTrack);
          } else {
            pc.addTrack(audioTrack, this.micStream!);
          }
        });
      }

      // Notify peers that mic is active
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'p2p_mic_status',
          from: this.myUid,
          isMuted: false,
        });
      }

      return true;
    } catch (err) {
      console.warn('Could not acquire microphone stream:', err);
      return false;
    }
  }

  private startLocalVolumeMonitoring() {
    if (!this.volumeAnalyser) return;
    const dataArray = new Uint8Array(this.volumeAnalyser.frequencyBinCount);

    const monitor = () => {
      if (!this.isMicOn || !this.volumeAnalyser || this.isDestroyed) return;

      this.volumeAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(100, Math.round((avg / 128) * 100));

      if (this.onLocalVolumeCallback) {
        this.onLocalVolumeCallback(normalized);
      }

      // Broadcast speaking status to other room peers
      if (this.broadcastChannel && normalized > 12) {
        this.broadcastChannel.postMessage({
          type: 'p2p_speaking',
          from: this.myUid,
          name: this.myDisplayName,
          volume: normalized,
        });
      }

      this.animFrameId = requestAnimationFrame(monitor);
    };

    monitor();
  }

  private async createPeerConnection(peerUid: string, peerName: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerUid, pc);

    const status: PeerAudioStatus = {
      uid: peerUid,
      displayName: peerName,
      volume: 0,
      isSpeaking: false,
      isMuted: false,
      isConnected: false,
    };
    this.peerStatusMap.set(peerUid, status);

    // Add local mic track if available
    if (this.micStream) {
      const audioTrack = this.micStream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, this.micStream);
      }
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'p2p_ice',
          from: this.myUid,
          to: peerUid,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote audio stream from peer
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        let audioEl = this.remoteAudioElements.get(peerUid);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          this.remoteAudioElements.set(peerUid, audioEl);
        }
        audioEl.srcObject = event.streams[0];
        audioEl.play().catch(() => {});

        // Setup volume analysis on incoming audio stream
        this.monitorRemoteStreamVolume(peerUid, event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const current = this.peerStatusMap.get(peerUid);
      if (current) {
        current.isConnected = pc.connectionState === 'connected';
        this.peerStatusMap.set(peerUid, current);
        if (this.onPeerSpeakingCallback) {
          this.onPeerSpeakingCallback(new Map(this.peerStatusMap));
        }
      }
    };

    return pc;
  }

  private monitorRemoteStreamVolume(peerUid: string, stream: MediaStream) {
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      const remoteSource = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      remoteSource.connect(analyser);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const checkVol = () => {
        if (this.isDestroyed || !this.peerConnections.has(peerUid)) return;
        analyser.getByteFrequencyData(buf);
        let s = 0;
        for (let i = 0; i < buf.length; i++) s += buf[i];
        const v = Math.min(100, Math.round((s / buf.length / 128) * 100));

        const p = this.peerStatusMap.get(peerUid);
        if (p) {
          p.volume = v;
          p.isSpeaking = v > 12;
          this.peerStatusMap.set(peerUid, p);
          if (this.onPeerSpeakingCallback) {
            this.onPeerSpeakingCallback(new Map(this.peerStatusMap));
          }
        }
        requestAnimationFrame(checkVol);
      };
      checkVol();
    } catch {}
  }

  private async handleSignalingMessage(data: any) {
    if (!data || data.from === this.myUid) return;

    if (data.type === 'p2p_join') {
      // A new peer joined the room: create offer
      const pc = await this.createPeerConnection(data.from, data.name || 'User');
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.broadcastChannel?.postMessage({
          type: 'p2p_offer',
          from: this.myUid,
          to: data.from,
          name: this.myDisplayName,
          sdp: offer,
        });
      } catch (err) {
        console.warn('Create offer note:', err);
      }
    } else if (data.type === 'p2p_offer' && data.to === this.myUid) {
      // Received offer from peer: create answer
      let pc = this.peerConnections.get(data.from);
      if (!pc) {
        pc = await this.createPeerConnection(data.from, data.name || 'User');
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.broadcastChannel?.postMessage({
          type: 'p2p_answer',
          from: this.myUid,
          to: data.from,
          sdp: answer,
        });
      } catch (err) {
        console.warn('Handle offer note:', err);
      }
    } else if (data.type === 'p2p_answer' && data.to === this.myUid) {
      // Received answer from peer
      const pc = this.peerConnections.get(data.from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (err) {
          console.warn('Set remote description note:', err);
        }
      }
    } else if (data.type === 'p2p_ice' && data.to === this.myUid) {
      // Received ICE candidate
      const pc = this.peerConnections.get(data.from);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn('Add ICE candidate note:', err);
        }
      }
    } else if (data.type === 'p2p_speaking') {
      const p = this.peerStatusMap.get(data.from) || {
        uid: data.from,
        displayName: data.name || 'User',
        volume: data.volume,
        isSpeaking: true,
        isMuted: false,
        isConnected: true,
      };
      p.volume = data.volume;
      p.isSpeaking = true;
      this.peerStatusMap.set(data.from, p);

      if (this.onPeerSpeakingCallback) {
        this.onPeerSpeakingCallback(new Map(this.peerStatusMap));
      }

      setTimeout(() => {
        const existing = this.peerStatusMap.get(data.from);
        if (existing) {
          existing.isSpeaking = false;
          existing.volume = 0;
          this.peerStatusMap.set(data.from, existing);
          if (this.onPeerSpeakingCallback) {
            this.onPeerSpeakingCallback(new Map(this.peerStatusMap));
          }
        }
      }, 700);
    } else if (data.type === 'p2p_mic_status') {
      const p = this.peerStatusMap.get(data.from);
      if (p) {
        p.isMuted = data.isMuted;
        this.peerStatusMap.set(data.from, p);
        if (this.onPeerSpeakingCallback) {
          this.onPeerSpeakingCallback(new Map(this.peerStatusMap));
        }
      }
    }
  }

  public setMute(muted: boolean) {
    this.isMicOn = !muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'p2p_mic_status',
        from: this.myUid,
        isMuted: muted,
      });
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.isMicOn = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    this.peerConnections.clear();

    this.remoteAudioElements.forEach((audio) => {
      try {
        audio.srcObject = null;
        audio.remove();
      } catch {}
    });
    this.remoteAudioElements.clear();

    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'p2p_leave',
          from: this.myUid,
        });
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
  }
}
