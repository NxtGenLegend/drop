# Drop - A Cross-Platform File Sharing Experiment

## Overview

Drop aims to be a seamless file-sharing solution across any platform, inspired by Apple's AirDrop. It leverages web technologies for the transfer and aims to use NFC and/or BLE for connection initiation without requiring a dedicated app installation on the receiving end (potentially using the Web Bluetooth/Web NFC APIs where available or platform-specific OS integrations).

The core idea is to make file sharing quick and easy, without needing to be on the same Wi-Fi network or relying on one device to host a hotspot. File transfers are intended to occur over a direct peer-to-peer Wi-Fi connection (e.g., Wi-Fi Direct or WebRTC over local network) or relayed if a direct connection isn't possible.

**Current Status:**
*   **Frontend:** Basic Next.js application setup in the `/frontend` directory.
*   **Backend:** Rust-based backend (`drop_backend`) using Actix Web.
    *   Serves as a signaling server for WebRTC.
    *   API endpoints for creating transfer sessions and exchanging signaling messages.
*   **File Transfer:** Signaling mechanism is in place. Actual WebRTC data channel for file transfer is the next major step.
*   **Discovery (NFC/BLE):** Not yet implemented.

## Project Structure

```
drop/
├── frontend/         # Next.js frontend application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── src/              # Rust backend (drop_backend) library and binary
│   ├── ble.rs        # Placeholder/WIP for Bluetooth LE
│   ├── crypto.rs     # Placeholder/WIP for cryptographic operations
│   ├── error.rs      # Custom error types
│   ├── lib.rs        # Backend library code (includes signaling server logic)
│   ├── main.rs       # Backend binary entry point
│   ├── protocol.rs   # Placeholder/WIP for transfer protocol definitions
│   ├── transfer.rs   # Placeholder/WIP for file transfer logic
│   └── webrtc.rs     # Placeholder/WIP for WebRTC integration
├── .gitignore
├── Cargo.lock
├── Cargo.toml        # Rust backend dependencies and configuration
└── README.md         # This file
```

## Prerequisites

*   [Node.js and npm](https://nodejs.org/) (for the frontend)
*   [Rust and Cargo](https://www.rust-lang.org/tools/install) (for the backend)

## Setup and Running

### Backend (Rust - `drop_backend`)

1.  **Navigate to the project root:**
    ```bash
    cd /path/to/your/drop
    ```

2.  **Build the backend:**
    ```bash
    cargo build
    ```

3.  **Run the backend server:**
    ```bash
    cargo run
    ```
    The server will start on `http://127.0.0.1:8080` by default. You should see output like:
    ```
    Initializing drop_backend...
    Starting Actix web server on http://127.0.0.1:8080
    ```

4.  **Run backend tests:**
    ```bash
    cargo test
    ```

### Frontend (Next.js)

1.  **Navigate to the frontend directory:**
    ```bash
    cd /path/to/your/drop/frontend # Replace with the actual path
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The Next.js frontend will typically start on `http://localhost:3000`.

## Core Components & Logic

### 1. Backend Signaling Server (Rust/Actix Web)

*   Located in `drop/src/lib.rs` and `drop/src/main.rs`.
*   Provides API endpoints for WebRTC signaling:
    *   `POST /api/session/create`: Initiates a new sharing session and returns a unique `session_id`.
    *   `POST /api/session/{session_id}/signal/send`: Allows a client to send a signaling message (SDP offer/answer, ICE candidate) to the other peer in the session.
    *   `GET /api/session/{session_id}/signal/receive`: Allows a client to poll for signaling messages from the other peer.
*   Uses an in-memory store (`DashMap`) for session messages (this would be replaced by a more robust solution like Redis in a production environment).

### 2. Frontend (Next.js)

*   Located in `drop/frontend`.
*   Will handle:
    *   User interface for initiating and receiving files.
    *   WebRTC connection establishment using the backend signaling server.
    *   Actual file transfer via WebRTC `RTCDataChannel`.
    *   Potentially, interaction with Web Bluetooth/Web NFC APIs for discovery.

### 3. File Transfer (WebRTC)

The file transfer itself is envisioned to happen directly between peers using WebRTC data channels. The Rust backend's role is primarily to facilitate the initial WebRTC handshake (signaling).

### 4. Discovery (NFC/BLE - Future)

The idea is to use NFC taps or BLE advertisements to initiate a connection.
*   **Sender:** Taps phone or brings device close to receiver.
*   **Receiver:** (If no app) A browser could potentially be opened via an NFC NDEF record or a Physical Web BLE beacon, pointing to a URL on the Drop web app, perhaps with the session ID or sender's identifier embedded.
*   The exact mechanism will require careful design and will depend on OS capabilities and browser support for Web NFC / Web Bluetooth.

## Future Development

*   Implement WebRTC client logic in the Next.js frontend for peer connection and data channel setup.
*   Develop the file selection and transfer UI.
*   Integrate actual file sending/receiving over `RTCDataChannel`.
*   Design and implement the NFC/BLE discovery and handshake mechanism.
*   Explore platform-specific integrations if web-based discovery is insufficient.
*   Add more robust error handling and user feedback.
*   Secure the signaling channel and consider end-to-end encryption for file transfers.
*   Refine the UI/UX for a simple and intuitive experience.