use std::path::PathBuf;
use webrtc::api::APIBuilder;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::peer_connection_state::RTCPeerConnectionState;
use webrtc::data_channel::data_channel_message::DataChannelMessage;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use serde_json;
use crate::{Result, TransferCommand, TransferProtocol};

pub struct WebRTCTransfer {
    peer_connection: webrtc::peer_connection::RTCPeerConnection,
    data_channel: Option<webrtc::data_channel::RTCDataChannel>,
}

impl WebRTCTransfer {
    pub async fn new() -> Result<Self> {
        let api = APIBuilder::new().build();
        let config = RTCConfiguration::default();
        
        let peer_connection = api.new_peer_connection(config)
            .await
            .map_err(|e| crate::DropError::WebRTC(e.to_string()))?;

        Ok(Self {
            peer_connection,
            data_channel: None,
        })
    }

    pub async fn create_offer(&mut self) -> Result<String> {
        let data_channel = self.peer_connection
            .create_data_channel("file-transfer", None)
            .await
            .map_err(|e| crate::DropError::WebRTC(e.to_string()))?;

        self.data_channel = Some(data_channel);

        let offer = self.peer_connection
            .create_offer(None)
            .await
            .map_err(|e| crate::DropError::WebRTC(e.to_string()))?;

        self.peer_connection
            .set_local_description(offer)
            .await
            .map_err(|e| crate::DropError::WebRTC(e.to_string()))?;

        let sdp = self.peer_connection
            .local_description()
            .await
            .ok_or_else(|| crate::DropError::WebRTC("No local description".to_string()))?;

        Ok(serde_json::to_string(&sdp)?)
    }

    pub async fn set_remote_description(&mut self, sdp: &str) -> Result<()> {
        let desc: RTCSessionDescription = serde_json::from_str(sdp)?;
        self.peer_connection
            .set_remote_description(desc)
            .await
            .map_err(|e| crate::DropError::WebRTC(e.to_string()))?;
        Ok(())
    }

    pub async fn create_answer(&mut self) -> Result<String> {
        let answer = self.peer_connection
            .create_answer(None)
            .await
            .map_err(|e| crate::DropError::WebRTC(e.to_string()))?;

        self.peer_connection
            .set_local_description(answer)
            .await
            .map_err(|e| crate::DropError::WebRTC(e.to_string()))?;

        let sdp = self.peer_connection
            .local_description()
            .await
            .ok_or_else(|| crate::DropError::WebRTC("No local description".to_string()))?;

        Ok(serde_json::to_string(&sdp)?)
    }
}

#[async_trait::async_trait]
impl TransferProtocol for WebRTCTransfer {
    async fn send_file(&mut self, path: PathBuf) -> Result<()> {
        // Implementation for sending file over WebRTC
        Ok(())
    }

    async fn receive_file(&mut self, path: PathBuf) -> Result<()> {
        // Implementation for receiving file over WebRTC
        Ok(())
    }

    async fn cancel(&mut self) -> Result<()> {
        if let Some(dc) = &self.data_channel {
            dc.close().await
                .map_err(|e| crate::DropError::WebRTC(e.to_string()))?;
        }
        self.peer_connection.close().await
            .map_err(|e| crate::DropError::WebRTC(e.to_string()))?;
        Ok(())
    }
} 