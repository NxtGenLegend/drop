use std::path::PathBuf;
use std::fs::File;
use std::io::{Read, Write, Seek, SeekFrom};
use sha2::{Sha256, Digest};
use indicatif::{ProgressBar, ProgressStyle};
use crate::{Result, FileMetadata, ChunkInfo};

const CHUNK_SIZE: usize = 1024 * 1024; // 1MB chunks

pub struct FileTransfer {
    path: PathBuf,
    metadata: Option<FileMetadata>,
    progress_bar: ProgressBar,
}

impl FileTransfer {
    pub fn new(path: PathBuf) -> Self {
        let progress_bar = ProgressBar::new_spinner();
        progress_bar.set_style(
            ProgressStyle::default_spinner()
                .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta})")
                .unwrap()
                .progress_chars("#>-"),
        );

        Self {
            path,
            metadata: None,
            progress_bar,
        }
    }

    pub async fn prepare_metadata(&mut self) -> Result<FileMetadata> {
        let file = File::open(&self.path)?;
        let size = file.metadata()?.len();
        
        let mut chunks = Vec::new();
        let mut file = file;
        let mut buffer = vec![0u8; CHUNK_SIZE];
        let mut index = 0;

        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }

            let mut hasher = Sha256::new();
            hasher.update(&buffer[..bytes_read]);
            let hash = format!("{:x}", hasher.finalize());

            chunks.push(ChunkInfo {
                index,
                size: bytes_read as u64,
                hash,
            });

            index += 1;
        }

        let mut hasher = Sha256::new();
        file.seek(SeekFrom::Start(0))?;
        let mut buffer = vec![0u8; size as usize];
        file.read_exact(&mut buffer)?;
        hasher.update(&buffer);
        let file_hash = format!("{:x}", hasher.finalize());

        let metadata = FileMetadata {
            name: self.path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string(),
            size,
            hash: file_hash,
            chunks,
        };

        self.metadata = Some(metadata.clone());
        self.progress_bar.set_length(size);
        Ok(metadata)
    }

    pub async fn read_chunk(&mut self, chunk_index: u32) -> Result<Vec<u8>> {
        let file = File::open(&self.path)?;
        let mut file = file;
        
        let offset = (chunk_index as u64) * (CHUNK_SIZE as u64);
        file.seek(SeekFrom::Start(offset))?;

        let mut buffer = vec![0u8; CHUNK_SIZE];
        let bytes_read = file.read(&mut buffer)?;
        
        self.progress_bar.inc(bytes_read as u64);
        Ok(buffer[..bytes_read].to_vec())
    }

    pub async fn write_chunk(&mut self, chunk_index: u32, data: Vec<u8>) -> Result<()> {
        let file = File::create(&self.path)?;
        let mut file = file;
        
        let offset = (chunk_index as u64) * (CHUNK_SIZE as u64);
        file.seek(SeekFrom::Start(offset))?;
        
        file.write_all(&data)?;
        self.progress_bar.inc(data.len() as u64);
        Ok(())
    }

    pub fn get_metadata(&self) -> Option<&FileMetadata> {
        self.metadata.as_ref()
    }
} 