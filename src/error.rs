use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Generic error: {0}")]
    Generic(String),
} 