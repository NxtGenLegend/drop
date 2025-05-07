pub mod transfer;
pub mod protocol;
pub mod ble;
pub mod webrtc;
pub mod crypto;
pub mod error;

use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DropError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Protocol error: {0}")]
    Protocol(String),
    #[error("BLE error: {0}")]
    Ble(String),
    #[error("WebRTC error: {0}")]
    WebRTC(String),
    #[error("Crypto error: {0}")]
    Crypto(String),
}

pub type Result<T> = std::result::Result<T, DropError>;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub name: String,
    pub size: u64,
    pub hash: String,
    pub chunks: Vec<ChunkInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChunkInfo {
    pub index: u32,
    pub size: u64,
    pub hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum TransferCommand {
    StartTransfer(FileMetadata),
    RequestChunk(u32),
    SendChunk(u32, Vec<u8>),
    Complete,
    Error(String),
}

pub trait TransferProtocol {
    async fn send_file(&mut self, path: PathBuf) -> Result<()>;
    async fn receive_file(&mut self, path: PathBuf) -> Result<()>;
    async fn cancel(&mut self) -> Result<()>;
} 