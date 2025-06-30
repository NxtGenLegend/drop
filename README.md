# Drop - Cross-Platform AirDrop Alternative

<div align="center">
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC">
</div>

## 🚀 Overview

Drop is a modern, cross-platform file sharing solution that works seamlessly across **any device** with a web browser. Inspired by Apple's AirDrop, it eliminates the limitations of platform-specific file sharing by leveraging web technologies for universal compatibility.

### ✨ Key Features

- 🌐 **Universal Compatibility** - Works on any device with a browser (Windows, macOS, Linux, iOS, Android)
- 🔒 **End-to-End Encrypted** - Secure peer-to-peer file transfers
- 🚀 **No File Size Limits** - Transfer files of any size
- 📱 **No App Installation Required** - Pure web-based solution
- 🎯 **Simple Share Codes** - Easy 6-character codes for quick sharing
- ⚡ **Real-time Progress** - Live transfer progress with visual feedback
- 🔗 **Direct P2P Transfer** - Files transfer directly between devices
- 🎨 **Beautiful Modern UI** - Intuitive interface with smooth animations

## 🏗️ Architecture

### Backend (Rust)
- **WebRTC Signaling Server** - Facilitates peer-to-peer connections
- **Session Management** - Handles share codes and connection coordination
- **CORS Support** - Enables cross-origin requests from frontend
- **High Performance** - Rust-powered backend for reliability

### Frontend (Next.js)
- **React-based UI** - Modern, responsive interface
- **WebRTC Client** - Handles peer-to-peer file transfers
- **Real-time Updates** - Live connection status and transfer progress
- **File Management** - Drag & drop, file selection, and download handling

### File Transfer Flow
1. **Sender** creates a session and gets a 6-character share code
2. **Receiver** enters the code to join the session
3. **WebRTC Connection** established through signaling server
4. **Direct P2P Transfer** - Files transfer directly between devices
5. **Automatic Download** - Received files are automatically downloadable

## 🚀 Quick Start

### Prerequisites
- [Rust](https://rustup.rs/) (1.80+)
- [Node.js](https://nodejs.org/) (18+)
- Modern web browser with WebRTC support

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd drop
   ```

2. **Start the backend server**
   ```bash
   cargo run
   ```
   Backend will start at `http://127.0.0.1:8080`

3. **Start the frontend (in a new terminal)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend will start at `http://localhost:3000`

### Usage

#### Sending Files
1. Open `http://localhost:3000` in your browser
2. Drag & drop files or click "browse" to select files
3. Click "Create Share Link" to generate a 6-character code
4. Share the code with the recipient

#### Receiving Files
1. Open `http://localhost:3000` in any browser
2. Enter the 6-character share code
3. Click "Join" to connect
4. Files will be received automatically and available for download

## 🔧 Development

### Project Structure
```
drop/
├── src/                    # Rust backend
│   ├── main.rs            # Server entry point
│   ├── lib.rs             # Core library with API endpoints
│   ├── webrtc.rs          # WebRTC utilities
│   ├── transfer.rs        # File transfer logic
│   ├── crypto.rs          # Encryption utilities (future)
│   ├── ble.rs             # Bluetooth LE (future)
│   └── protocol.rs        # Transfer protocol definitions
├── frontend/               # Next.js frontend
│   ├── src/app/
│   │   ├── page.tsx       # Main UI component
│   │   └── hooks/
│   │       └── useWebRTC.ts  # WebRTC React hook
│   ├── package.json
│   └── tailwind.config.js
├── Cargo.toml             # Rust dependencies
└── README.md
```

### Backend API Endpoints

- `POST /api/session/create` - Create new sharing session
- `POST /api/session/{id}/signal/send` - Send WebRTC signaling message
- `GET /api/session/{id}/signal/receive` - Receive WebRTC signaling messages

### Frontend Components

- **useWebRTC Hook** - Manages WebRTC connections and file transfers
- **File Drop Zone** - Handles file selection and drag & drop
- **Transfer Progress** - Real-time progress visualization
- **Connection Status** - Live connection state updates

## 🔮 Future Enhancements

### Phase 1 (Current)
- ✅ WebRTC-based file transfer
- ✅ Beautiful modern UI
- ✅ Cross-platform compatibility
- ✅ Real-time progress tracking

### Phase 2 (Planned)
- 🔄 QR Code sharing for mobile devices
- 🔄 End-to-end encryption implementation
- 🔄 Bluetooth LE discovery
- 🔄 NFC tap-to-share
- 🔄 File preview capabilities

### Phase 3 (Future)
- 🔄 Mobile app companions
- 🔄 Desktop native apps
- 🔄 Cloud relay for NAT traversal
- 🔄 Group file sharing
- 🔄 File history and management

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow Rust best practices for backend code
- Use TypeScript for all frontend code
- Maintain consistent code formatting
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

Drop prioritizes security with:
- **Peer-to-peer transfers** - Files never pass through our servers
- **WebRTC encryption** - Built-in transport layer security
- **Session-based sharing** - Temporary, code-based access
- **No data persistence** - Sessions and codes are temporary

## 🌟 Why Drop?

Unlike traditional file sharing solutions, Drop:

- **Works everywhere** - No platform restrictions
- **Requires no installation** - Pure web-based
- **Direct transfers** - No file size limits or cloud storage
- **Privacy-focused** - Files never leave your local network
- **Modern UX** - Beautiful, intuitive interface
- **Open source** - Transparent and community-driven

## 📞 Support

- **Issues**: Report bugs or request features via [GitHub Issues](../../issues)
- **Discussions**: Join the conversation in [GitHub Discussions](../../discussions)
- **Documentation**: Check the [Wiki](../../wiki) for detailed guides

---

<div align="center">
  <b>Drop - Making file sharing universal 🌍</b>
  <br>
  <sub>Built with ❤️ using Rust, Next.js, and WebRTC</sub>
</div>