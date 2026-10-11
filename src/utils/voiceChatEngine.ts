import { callServer } from "../serverApi";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
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
  private broadcastChannel: {
    postMessage: (data: any) => void;
    close: () => void;
  } | null = null;
  private cleanupSignaling: (() => void)[] = [];
  private pendingIce = new Map<string, RTCIceCandidateInit[]>();
  private micPending = false;
  private permissions = new Map<
    string,
    { active: boolean; canSpeak: boolean; muted: boolean; banned: boolean }
  >();
  private allowed(uid: string) {
    const p = this.permissions.get(uid);
    return !!p?.active && !!p.canSpeak && !p.muted && !p.banned;
  }
  public resumeAudio() {
    this.audioCtx?.resume().catch(console.warn);
    this.remoteAudioElements.forEach((a) => a.play().catch(console.warn));
  }
  private lastSpeakingAt = 0;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteAudioElements = new Map<string, HTMLAudioElement>();
  private peerStatusMap = new Map<string, PeerAudioStatus>();
  private onPeerSpeakingCallback:
    | ((peers: Map<string, PeerAudioStatus>) => void)
    | null = null;
  private onLocalVolumeCallback: ((vol: number) => void) | null = null;
  private isDestroyed: boolean = false;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  };

  constructor(roomId: string, myUid: string, myDisplayName: string) {
    this.roomId = roomId;
    this.myUid = myUid;
    this.myDisplayName = myDisplayName;
    void this.initializeNetwork();
  }

  private async initializeNetwork() {
    try {
      const config = (await callServer("getVoiceConfig", {})) as {
        iceServers?: RTCIceServer[];
      };
      if (Array.isArray(config.iceServers))
        this.rtcConfig.iceServers?.push(...config.iceServers);
    } catch {
      console.warn(
        "TURN is unavailable; using STUN. Restricted networks may not connect.",
      );
    }
    if (!this.isDestroyed) this.initSignaling();
  }

  private initSignaling() {
    // Guests can browse; cross-device voice requires an authenticated account.
    if (auth.currentUser?.uid !== this.myUid) return;
    const stopMembers = onSnapshot(
      collection(db, "rooms", this.roomId, "members"),
      (snapshot) => {
        this.permissions.clear();
        snapshot.forEach((d) => this.permissions.set(d.id, d.data() as any));
        if (!this.allowed(this.myUid)) this.setMute(true);
        this.remoteAudioElements.forEach((audio, uid) => {
          audio.muted = !this.allowed(uid);
        });
        this.peerStatusMap.forEach((status, uid) => {
          if (!this.allowed(uid)) {
            status.isMuted = true;
            status.isSpeaking = false;
          }
        });
      },
      () => {
        this.permissions.clear();
        this.setMute(true);
        this.remoteAudioElements.forEach((a) => (a.muted = true));
      },
    );
    this.cleanupSignaling.push(stopMembers);
    const signals = collection(db, "rooms", this.roomId, "signals");
    const presence = collection(db, "rooms", this.roomId, "presence");
    const me = doc(presence, this.myUid);
    this.broadcastChannel = {
      postMessage: (data: any) => {
        if (this.isDestroyed) return;
        const targets = data.to ? [data.to] : [...this.peerConnections.keys()];
        for (const to of targets) {
          const payload = JSON.parse(JSON.stringify(data));
          void addDoc(signals, {
            ...payload,
            to,
            from: this.myUid,
            createdAt: serverTimestamp(),
          }).catch(console.warn);
        }
      },
      close: () => {
        this.cleanupSignaling.splice(0).forEach((stop) => stop());
        void deleteDoc(me).catch(console.warn);
      },
    };
    const stopSignals = onSnapshot(
      query(signals, where("to", "==", this.myUid)),
      (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type !== "added") continue;
          const data = change.doc.data();
          if (
            data.createdAt &&
            Date.now() - data.createdAt.toMillis() > 120000
          ) {
            void deleteDoc(change.doc.ref).catch(console.warn);
            continue;
          }
          void this.handleSignalingMessage(data)
            .finally(() => deleteDoc(change.doc.ref))
            .catch(console.warn);
        }
      },
      console.warn,
    );
    const stopPresence = onSnapshot(
      presence,
      (snapshot) => {
        const active = new Set<string>();
        snapshot.forEach((d) => {
          const peer = d.data();
          if (
            d.id === this.myUid ||
            (peer.updatedAt && Date.now() - peer.updatedAt.toMillis() > 90000)
          )
            return;
          active.add(d.id);
          // One deterministic offerer prevents simultaneous-offer collisions.
          if (this.myUid < d.id && !this.peerConnections.has(d.id))
            void this.handleSignalingMessage({
              type: "p2p_join",
              from: d.id,
              name: peer.name,
            });
        });
        for (const uid of this.peerConnections.keys())
          if (!active.has(uid)) this.removePeer(uid);
      },
      console.warn,
    );
    const heartbeat = () => {
      void setDoc(me, {
        name: this.myDisplayName,
        avatar: auth.currentUser?.photoURL || "😎",
        updatedAt: serverTimestamp(),
      }).catch(console.warn);
    };
    heartbeat();
    const timer = setInterval(heartbeat, 30000);
    this.cleanupSignaling.push(stopSignals, stopPresence, () =>
      clearInterval(timer),
    );
  }

  private removePeer(uid: string) {
    this.peerConnections.get(uid)?.close();
    this.peerConnections.delete(uid);
    const audio = this.remoteAudioElements.get(uid);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
    }
    this.remoteAudioElements.delete(uid);
    this.peerStatusMap.delete(uid);
    this.pendingIce.delete(uid);
    this.onPeerSpeakingCallback?.(new Map(this.peerStatusMap));
  }

  private async flushIce(uid: string, pc: RTCPeerConnection) {
    const queued = this.pendingIce.get(uid) || [];
    this.pendingIce.delete(uid);
    for (const candidate of queued) await pc.addIceCandidate(candidate);
  }

  public setCallbacks(
    onLocalVolume: (vol: number) => void,
    onPeerSpeaking: (peers: Map<string, PeerAudioStatus>) => void,
  ) {
    this.onLocalVolumeCallback = onLocalVolume;
    this.onPeerSpeakingCallback = onPeerSpeaking;
  }

  public async startMicrophone(): Promise<boolean> {
    if (
      this.isDestroyed ||
      auth.currentUser?.uid !== this.myUid ||
      !this.allowed(this.myUid)
    )
      return false;
    if (this.micStream) {
      this.setMute(false);
      return true;
    }
    if (this.micPending) return false;
    this.micPending = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Microphone unsupported");

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (this.isDestroyed || !this.allowed(this.myUid)) {
        this.micStream.getTracks().forEach((t) => t.stop());
        this.micStream = null;
        return false;
      }
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === "suspended") {
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
          const audioSender = senders.find((s) => s.track?.kind === "audio");
          if (audioSender) {
            audioSender.replaceTrack(audioTrack);
          } else {
            const sender = pc
              .getTransceivers()
              .find((t) => t.receiver.track.kind === "audio")?.sender;
            if (sender) void sender.replaceTrack(audioTrack);
          }
        });
      }

      // Notify peers that mic is active
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: "p2p_mic_status",
          from: this.myUid,
          isMuted: false,
        });
      }

      return true;
    } catch (err) {
      console.warn("Could not acquire microphone stream:", err);
      return false;
    } finally {
      this.micPending = false;
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
      if (
        this.broadcastChannel &&
        normalized > 12 &&
        Date.now() - this.lastSpeakingAt > 1500
      ) {
        this.lastSpeakingAt = Date.now();
        this.broadcastChannel.postMessage({
          type: "p2p_speaking",
          from: this.myUid,
          name: this.myDisplayName,
          volume: normalized,
        });
      }

      this.animFrameId = requestAnimationFrame(monitor);
    };

    monitor();
  }

  private async createPeerConnection(
    peerUid: string,
    peerName: string,
  ): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(peerUid))
      return this.peerConnections.get(peerUid)!;
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

    if (!this.micStream) pc.addTransceiver("audio", { direction: "sendrecv" });

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: "p2p_ice",
          from: this.myUid,
          to: peerUid,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote audio stream from peer
    pc.ontrack = (event) => {
      if (event.track) {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        let audioEl = this.remoteAudioElements.get(peerUid);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          this.remoteAudioElements.set(peerUid, audioEl);
        }
        audioEl.muted = !this.allowed(peerUid);
        audioEl.srcObject = remoteStream;
        audioEl.play().catch(() => {});

        // Setup volume analysis on incoming audio stream
        this.monitorRemoteStreamVolume(peerUid, remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      const current = this.peerStatusMap.get(peerUid);
      if (current) {
        current.isConnected = pc.connectionState === "connected";
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
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
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
          p.isSpeaking = this.allowed(peerUid) && v > 12;
          p.isMuted = !this.allowed(peerUid);
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

    if (data.type === "p2p_leave") {
      this.removePeer(data.from);
      return;
    }
    if (data.type === "p2p_join") {
      // A new peer joined the room: create offer
      const pc = await this.createPeerConnection(
        data.from,
        data.name || "User",
      );
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.broadcastChannel?.postMessage({
          type: "p2p_offer",
          from: this.myUid,
          to: data.from,
          name: this.myDisplayName,
          sdp: offer,
        });
      } catch (err) {
        console.warn("Create offer note:", err);
      }
    } else if (data.type === "p2p_offer" && data.to === this.myUid) {
      // Received offer from peer: create answer
      let pc = this.peerConnections.get(data.from);
      if (!pc) {
        pc = await this.createPeerConnection(data.from, data.name || "User");
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await this.flushIce(data.from, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.broadcastChannel?.postMessage({
          type: "p2p_answer",
          from: this.myUid,
          to: data.from,
          sdp: answer,
        });
      } catch (err) {
        console.warn("Handle offer note:", err);
      }
    } else if (data.type === "p2p_answer" && data.to === this.myUid) {
      // Received answer from peer
      const pc = this.peerConnections.get(data.from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await this.flushIce(data.from, pc);
        } catch (err) {
          console.warn("Set remote description note:", err);
        }
      }
    } else if (data.type === "p2p_ice" && data.to === this.myUid) {
      // Received ICE candidate
      const pc = this.peerConnections.get(data.from);
      if (pc) {
        try {
          if (pc.remoteDescription)
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          else
            this.pendingIce.set(data.from, [
              ...(this.pendingIce.get(data.from) || []),
              data.candidate,
            ]);
        } catch (err) {
          console.warn("Add ICE candidate note:", err);
        }
      }
    } else if (data.type === "p2p_speaking") {
      if (!this.allowed(data.from)) return;
      const p = this.peerStatusMap.get(data.from) || {
        uid: data.from,
        displayName: data.name || "User",
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
    } else if (data.type === "p2p_mic_status") {
      const p = this.peerStatusMap.get(data.from);
      if (p) {
        p.isMuted = !this.allowed(data.from) || data.isMuted;
        this.peerStatusMap.set(data.from, p);
        if (this.onPeerSpeakingCallback) {
          this.onPeerSpeakingCallback(new Map(this.peerStatusMap));
        }
      }
    }
  }

  public setMute(muted: boolean) {
    if (!muted && !this.allowed(this.myUid)) muted = true;
    this.isMicOn = !muted;
    if (!muted && this.volumeAnalyser) {
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      this.startLocalVolumeMonitoring();
    }
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: "p2p_mic_status",
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
          type: "p2p_leave",
          from: this.myUid,
        });
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
  }
}
