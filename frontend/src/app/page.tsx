'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ArrowUpTrayIcon, 
  ShareIcon, 
  QrCodeIcon, 
  DevicePhoneMobileIcon, 
  ComputerDesktopIcon, 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { useWebRTC } from './hooks/useWebRTC';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useWebRTC();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleFileSelect = useCallback((selectedFiles: FileList) => {
    const newFiles: FileItem[] = Array.from(selectedFiles).map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      file
    }));
    setFiles((prev: FileItem[]) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateShareCode = async () => {
    try {
      const sessionId = await createSession();
      setShareCode(sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleJoinSession = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinSession(joinCode);
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const handleSendFiles = async () => {
    if (!isConnected || files.length === 0) return;

    for (const fileItem of files) {
      try {
        await sendFile(fileItem.file);
      } catch (error) {
        console.error('Failed to send file:', error);
      }
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const resetSession = () => {
    cleanup();
    setShareCode('');
    setJoinCode('');
    setFiles([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="text-center py-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <ShareIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Drop</h1>
        </div>
        <p className="text-gray-600 text-lg">Share files instantly across any platform</p>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {(isConnecting || isConnected) && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <div className={`border rounded-lg p-4 flex items-center gap-3 ${
            isConnected 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            {isConnected ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            ) : (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            )}
            <p className={isConnected ? 'text-green-800' : 'text-blue-800'}>
              {isConnected ? 'Connected! Ready to transfer files.' : 'Connecting...'}
            </p>
            {isConnected && (
              <button
                onClick={resetSession}
                className="ml-auto px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm transition-colors"
              >
                New Session
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transfer Progress */}
      {transferProgress && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <CloudArrowUpIcon className={`w-5 h-5 ${transferProgress.isReceiving ? 'text-green-600' : 'text-blue-600'}`} />
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {transferProgress.isReceiving ? 'Receiving' : 'Sending'}: {transferProgress.fileName}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(transferProgress.transferredSize)} / {formatFileSize(transferProgress.totalSize)}
                </p>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {Math.round(transferProgress.progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  transferProgress.isReceiving ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${transferProgress.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Received Files */}
      {receivedFiles.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                Received Files ({receivedFiles.length})
              </h3>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {receivedFiles.map((file, index) => (
                <div key={index} className="px-6 py-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium text-green-600">
                        {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-48">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(file)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pb-12">
        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Send Files Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <ArrowUpTrayIcon className="w-6 h-6 text-blue-600" />
              Send Files
            </h2>

            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <ArrowUpTrayIcon className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drop files here or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-gray-500 mt-1">Support for any file type</p>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Selected Files ({files.length})</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {files.map((file) => (
                    <div key={file.id} className="px-6 py-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-48">{file.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share Button */}
            {files.length > 0 && !shareCode && !isConnecting && (
              <button
                onClick={generateShareCode}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                Create Share Link
              </button>
            )}

            {/* Send Files Button */}
            {isConnected && files.length > 0 && (
              <button
                onClick={handleSendFiles}
                disabled={transferProgress !== null}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                {transferProgress ? 'Sending...' : 'Send Files'}
              </button>
            )}

            {/* Share Code Display */}
            {shareCode && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <QrCodeIcon className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Share Code</h3>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-3xl font-mono font-bold text-gray-900 tracking-wider">{shareCode}</p>
        </div>
                <p className="text-gray-600 mb-4">Share this code with the recipient</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => navigator.clipboard.writeText(shareCode)}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Copy Code
                  </button>
                  <button
                    onClick={resetSession}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Receive Files Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <DevicePhoneMobileIcon className="w-6 h-6 text-purple-600" />
              Receive Files
            </h2>

            {/* Join Session */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Enter Share Code</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors font-mono text-center text-lg tracking-wider"
                  maxLength={6}
                  disabled={isConnecting || isConnected}
                />
                <button
                  onClick={handleJoinSession}
                  disabled={joinCode.length !== 6 || isConnecting || isConnected}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {isConnecting ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>

            {/* Device Compatibility */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Works On Any Device</h3>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <DevicePhoneMobileIcon className="w-10 h-10 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Mobile</p>
                </div>
                <div className="text-center">
                  <ComputerDesktopIcon className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Desktop</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold text-sm">WEB</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Browser</p>
                </div>
              </div>
              <p className="text-center text-gray-600 mt-4 text-sm">
                No app installation required • Secure peer-to-peer transfer
              </p>
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">No file size limits</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Direct peer-to-peer transfer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Cross-platform compatible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
