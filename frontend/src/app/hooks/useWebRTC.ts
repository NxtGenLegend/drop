import { useState, useRef, useCallback } from 'react';

interface SignalingMessage {
  message_type: string;
  payload: string;
}

interface FileTransferProgress {
  fileName: string;
  progress: number;
  totalSize: number;
  transferredSize: number;
  isReceiving?: boolean;
}

interface ReceivedFile {
  name: string;
  size: number;
  mimeType: string;
  data: Uint8Array;
}

export const useWebRTC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transferProgress, setTransferProgress] = useState<FileTransferProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const sessionId = useRef<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const receivingFile = useRef<{
    name: string;
    size: number;
    mimeType: string;
    receivedSize: number;
    chunks: Uint8Array[];
  } | null>(null);

  const API_BASE = 'http://127.0.0.1:8080';

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && sessionId.current) {
        sendSignalingMessage({
          message_type: 'candidate',
          payload: JSON.stringify(event.candidate),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === 'connected');
      setIsConnecting(pc.connectionState === 'connecting');
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError('Connection failed');
        setIsConnecting(false);
      }
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      setupDataChannel(channel);
    };

    peerConnection.current = pc;
    return pc;
  }, []);

  // Setup data channel for file transfer
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    dataChannel.current = channel;

    channel.onopen = () => {
      console.log('Data channel opened');
      setIsConnected(true);
      setIsConnecting(false);
    };

    channel.onmessage = (event) => {
      handleIncomingData(event.data);
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
      setError('Data channel error');
    };
  }, []);

  // Handle incoming file data
  const handleIncomingData = useCallback((data: any) => {
    if (typeof data === 'string') {
      // This is metadata
      try {
        const metadata = JSON.parse(data);
        if (metadata.type === 'metadata') {
          receivingFile.current = {
            name: metadata.name,
            size: metadata.size,
            mimeType: metadata.mimeType,
            receivedSize: 0,
            chunks: [],
          };
          
          setTransferProgress({
            fileName: metadata.name,
            progress: 0,
            totalSize: metadata.size,
            transferredSize: 0,
            isReceiving: true,
          });
        }
      } catch (error) {
        console.error('Error parsing metadata:', error);
      }
    } else if (data instanceof ArrayBuffer && receivingFile.current) {
      // This is file chunk data
      const chunk = new Uint8Array(data);
      receivingFile.current.chunks.push(chunk);
      receivingFile.current.receivedSize += chunk.length;
      
      const progress = (receivingFile.current.receivedSize / receivingFile.current.size) * 100;
      
      setTransferProgress({
        fileName: receivingFile.current.name,
        progress,
        totalSize: receivingFile.current.size,
        transferredSize: receivingFile.current.receivedSize,
        isReceiving: true,
      });

      // Check if file is complete
      if (receivingFile.current.receivedSize >= receivingFile.current.size) {
        // Combine all chunks
        const totalSize = receivingFile.current.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const completeFile = new Uint8Array(totalSize);
        let offset = 0;
        
        for (const chunk of receivingFile.current.chunks) {
          completeFile.set(chunk, offset);
          offset += chunk.length;
        }

        // Add to received files
        const newFile: ReceivedFile = {
          name: receivingFile.current.name,
          size: receivingFile.current.size,
          mimeType: receivingFile.current.mimeType,
          data: completeFile,
        };

        setReceivedFiles(prev => [...prev, newFile]);
        setTransferProgress(null);
        receivingFile.current = null;
        
        console.log('File received successfully:', newFile.name);
      }
    }
  }, []);

  // Send signaling message to backend
  const sendSignalingMessage = useCallback(async (message: SignalingMessage) => {
    if (!sessionId.current) return;

    try {
      const response = await fetch(`${API_BASE}/api/session/${sessionId.current}/signal/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error('Failed to send signaling message');
      }
    } catch (error) {
      console.error('Error sending signaling message:', error);
      setError('Failed to send signaling message');
    }
  }, []);

  // Poll for signaling messages
  const startPolling = useCallback(() => {
    if (!sessionId.current) return;

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/session/${sessionId.current}/signal/receive`);
        if (response.ok) {
          const messages: SignalingMessage[] = await response.json();
          
          for (const message of messages) {
            await handleSignalingMessage(message);
          }
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    }, 1000);
  }, []);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(async (message: SignalingMessage) => {
    if (!peerConnection.current) return;

    try {
      switch (message.message_type) {
        case 'offer':
          const offer = JSON.parse(message.payload);
          await peerConnection.current.setRemoteDescription(offer);
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          
          sendSignalingMessage({
            message_type: 'answer',
            payload: JSON.stringify(answer),
          });
          break;

        case 'answer':
          const answerDesc = JSON.parse(message.payload);
          await peerConnection.current.setRemoteDescription(answerDesc);
          break;

        case 'candidate':
          const candidate = JSON.parse(message.payload);
          await peerConnection.current.addIceCandidate(candidate);
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      setError('Failed to handle signaling message');
    }
  }, [sendSignalingMessage]);

  // Create a new sharing session (sender)
  const createSession = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Create session on backend
      const response = await fetch(`${API_BASE}/api/session/create`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { session_id } = await response.json();
      sessionId.current = session_id;

      // Initialize WebRTC
      const pc = initializePeerConnection();
      
      // Create data channel for file transfer
      const channel = pc.createDataChannel('fileTransfer', {
        ordered: true,
      });
      setupDataChannel(channel);

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer through signaling server
      await sendSignalingMessage({
        message_type: 'offer',
        payload: JSON.stringify(offer),
      });

      // Start polling for answers
      startPolling();

      return session_id;
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session');
      setIsConnecting(false);
      throw error;
    }
  }, [initializePeerConnection, setupDataChannel, sendSignalingMessage, startPolling]);

  // Join an existing session (receiver)
  const joinSession = useCallback(async (code: string) => {
    try {
      setIsConnecting(true);
      setError(null);

      sessionId.current = code;

      // Initialize WebRTC
      initializePeerConnection();

      // Start polling for offers
      startPolling();

      return code;
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session');
      setIsConnecting(false);
      throw error;
    }
  }, [initializePeerConnection, startPolling]);

  // Send file through data channel
  const sendFile = useCallback(async (file: File) => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const CHUNK_SIZE = 16384; // 16KB chunks
    const totalSize = file.size;
    let transferredSize = 0;

    setTransferProgress({
      fileName: file.name,
      progress: 0,
      totalSize,
      transferredSize: 0,
      isReceiving: false,
    });

    // Send file metadata first
    const metadata = {
      type: 'metadata',
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };
    dataChannel.current.send(JSON.stringify(metadata));

    // Send file in chunks
    const reader = new FileReader();
    let offset = 0;

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = () => {
      if (reader.result && dataChannel.current) {
        dataChannel.current.send(reader.result as ArrayBuffer);
        
        transferredSize += (reader.result as ArrayBuffer).byteLength;
        const progress = (transferredSize / totalSize) * 100;

        setTransferProgress({
          fileName: file.name,
          progress,
          totalSize,
          transferredSize,
          isReceiving: false,
        });

        offset += CHUNK_SIZE;
        
        if (offset < totalSize) {
          readNextChunk();
        } else {
          // Transfer complete
          setTransferProgress(null);
          console.log('File transfer completed');
        }
      }
    };

    readNextChunk();
  }, []);

  // Download received file
  const downloadFile = useCallback((file: ReceivedFile) => {
    const blob = new Blob([file.data], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    if (dataChannel.current) {
      dataChannel.current.close();
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsConnected(false);
    setIsConnecting(false);
    setTransferProgress(null);
    setReceivedFiles([]);
    sessionId.current = null;
    receivingFile.current = null;
  }, []);

  return {
    isConnected,
    isConnecting,
    transferProgress,
    error,
    receivedFiles,
    createSession,
    joinSession,
    sendFile,
    downloadFile,
    cleanup,
  };
}; 