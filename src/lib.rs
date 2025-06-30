pub mod transfer;
pub mod protocol;
pub mod ble;
pub mod webrtc;
pub mod crypto;
pub mod error;

use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use thiserror::Error;
use actix_web::{get, App, HttpResponse, HttpServer, Responder, post, web, middleware::Logger};
use actix_cors::Cors;
use dashmap::DashMap;
use std::sync::Arc;
use rand::Rng;
use async_trait::async_trait;

#[derive(Debug, Error)]
pub enum DropError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    SerdeJson(#[from] serde_json::Error),
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    pub name: String,
    pub size: u64,
    pub hash: String,
    pub chunks: Vec<ChunkInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[async_trait]
pub trait TransferProtocol {
    async fn send_file(&mut self, path: PathBuf) -> Result<()>;
    async fn receive_file(&mut self, path: PathBuf) -> Result<()>;
    async fn cancel(&mut self) -> Result<()>;
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SignalingMessage {
    // e.g., "offer", "answer", "candidate"
    pub message_type: String,
    // The actual SDP or ICE candidate string
    pub payload: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateSessionResponse {
    pub session_id: String,
}

// Shared application state
// Stores pending signaling messages for each session
// Key: session_id, Value: Vec<SignalingMessage> (messages waiting for the other peer)
pub struct AppState {
    pub sessions: Arc<DashMap<String, Vec<SignalingMessage>>>,
}

// Generate a user-friendly 6-character code
fn generate_session_code() -> String {
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".chars().collect();
    (0..6)
        .map(|_| chars[rng.gen_range(0..chars.len())])
        .collect()
}

#[post("/api/session/create")]
async fn create_session(data: web::Data<AppState>) -> impl Responder {
    let session_id = generate_session_code();
    // Ensure the session ID is unique
    while data.sessions.contains_key(&session_id) {
        let session_id = generate_session_code();
        if !data.sessions.contains_key(&session_id) {
            data.sessions.insert(session_id.clone(), Vec::new());
            return HttpResponse::Ok().json(CreateSessionResponse { session_id });
        }
    }
    
    data.sessions.insert(session_id.clone(), Vec::new());
    HttpResponse::Ok().json(CreateSessionResponse { session_id })
}

#[post("/api/session/{session_id}/signal/send")]
async fn send_signal(
    data: web::Data<AppState>,
    path: web::Path<String>,
    message: web::Json<SignalingMessage>,
) -> impl Responder {
    let session_id = path.into_inner();
    match data.sessions.get_mut(&session_id) {
        Some(mut messages) => {
            messages.push(message.into_inner());
            HttpResponse::Ok().finish()
        }
        None => HttpResponse::NotFound().body("Session not found"),
    }
}

#[get("/api/session/{session_id}/signal/receive")]
async fn receive_signal(
    data: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let session_id = path.into_inner();
    match data.sessions.get_mut(&session_id) {
        Some(mut messages) => {
            if messages.is_empty() {
                HttpResponse::Ok().json(Vec::<SignalingMessage>::new()) // No messages pending
            } else {
                let drained_messages = messages.drain(..).collect::<Vec<_>>();
                HttpResponse::Ok().json(drained_messages)
            }
        }
        None => HttpResponse::NotFound().body("Session not found"),
    }
}

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello from drop_backend!")
}

// Renamed and changed to async, removed FFI parts and explicit runtime.
pub async fn start_actix_server() -> std::io::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();
    
    println!("Starting Actix web server on http://127.0.0.1:8080");

    let app_state = web::Data::new(AppState {
        sessions: Arc::new(DashMap::new()),
    });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_origin("http://127.0.0.1:3000")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec!["content-type", "authorization"])
            .supports_credentials()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            .app_data(app_state.clone()) // Add shared state
            .service(hello) // Keep existing hello route
            .service(create_session)
            .service(send_signal)
            .service(receive_signal)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, http::StatusCode};
    use serde_json::json;

    #[actix_web::test]
    async fn test_hello_route() {
        let app_state = web::Data::new(AppState {
            sessions: Arc::new(DashMap::new()),
        });
        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .service(hello)
        ).await;
        let req = test::TestRequest::get().uri("/").to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
        let body = test::read_body(resp).await;
        assert_eq!(body, "Hello from drop_backend!");
    }

    #[actix_web::test]
    async fn test_create_session() {
        let app_state = web::Data::new(AppState {
            sessions: Arc::new(DashMap::new()),
        });
        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .service(create_session)
        ).await;

        let req = test::TestRequest::post().uri("/api/session/create").to_request();
        let resp: CreateSessionResponse = test::call_and_read_body_json(&app, req).await;

        assert!(!resp.session_id.is_empty());
        assert!(app_state.sessions.contains_key(&resp.session_id));
    }

    #[actix_web::test]
    async fn test_send_and_receive_signal() {
        let app_state = web::Data::new(AppState {
            sessions: Arc::new(DashMap::new()),
        });
        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .service(create_session)
                .service(send_signal)
                .service(receive_signal)
        ).await;

        // 1. Create a session
        let req_create = test::TestRequest::post().uri("/api/session/create").to_request();
        let session_resp: CreateSessionResponse = test::call_and_read_body_json(&app, req_create).await;
        let session_id = session_resp.session_id;
        assert!(app_state.sessions.contains_key(&session_id));

        // 2. Send a signal message
        let signal_msg = SignalingMessage {
            message_type: "offer".to_string(),
            payload: "sdp_offer_payload".to_string(),
        };
        let send_req = test::TestRequest::post()
            .uri(&format!("/api/session/{}/signal/send", session_id))
            .set_json(&signal_msg)
            .to_request();
        let send_resp = test::call_service(&app, send_req).await;
        assert_eq!(send_resp.status(), StatusCode::OK);

        // Verify message is stored (indirectly, by receive_signal)
        let messages_in_session = app_state.sessions.get(&session_id).unwrap();
        assert_eq!(messages_in_session.len(), 1);
        assert_eq!(messages_in_session[0].message_type, "offer");

        // 3. Receive the signal message
        let receive_req = test::TestRequest::get()
            .uri(&format!("/api/session/{}/signal/receive", session_id))
            .to_request();
        let received_msgs: Vec<SignalingMessage> = test::call_and_read_body_json(&app, receive_req).await;
        
        assert_eq!(received_msgs.len(), 1);
        assert_eq!(received_msgs[0].message_type, signal_msg.message_type);
        assert_eq!(received_msgs[0].payload, signal_msg.payload);

        // Verify messages are drained after receiving
        let messages_after_receive = app_state.sessions.get(&session_id).unwrap();
        assert!(messages_after_receive.is_empty());
    }

    #[actix_web::test]
    async fn test_receive_signal_no_messages() {
        let app_state = web::Data::new(AppState {
            sessions: Arc::new(DashMap::new()),
        });
        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .service(create_session)
                .service(receive_signal) // Only need create and receive for this test
        ).await;

        let req_create = test::TestRequest::post().uri("/api/session/create").to_request();
        let session_resp: CreateSessionResponse = test::call_and_read_body_json(&app, req_create).await;
        let session_id = session_resp.session_id;

        let receive_req = test::TestRequest::get()
            .uri(&format!("/api/session/{}/signal/receive", session_id))
            .to_request();
        let received_msgs: Vec<SignalingMessage> = test::call_and_read_body_json(&app, receive_req).await;
        assert!(received_msgs.is_empty());
    }

    #[actix_web::test]
    async fn test_signal_to_invalid_session() {
        let app_state = web::Data::new(AppState {
            sessions: Arc::new(DashMap::new()),
        });
        let app = test::init_service(
            App::new()
                .app_data(app_state.clone())
                .service(send_signal)
                .service(receive_signal)
        ).await;

        let invalid_session_id = "invalid-session-id";
        let signal_msg = SignalingMessage {
            message_type: "offer".to_string(),
            payload: "test".to_string(),
        };

        // Test send_signal to invalid session
        let send_req = test::TestRequest::post()
            .uri(&format!("/api/session/{}/signal/send", invalid_session_id))
            .set_json(&signal_msg)
            .to_request();
        let send_resp = test::call_service(&app, send_req).await;
        assert_eq!(send_resp.status(), StatusCode::NOT_FOUND);

        // Test receive_signal from invalid session
        let receive_req = test::TestRequest::get()
            .uri(&format!("/api/session/{}/signal/receive", invalid_session_id))
            .to_request();
        let receive_resp = test::call_service(&app, receive_req).await;
        assert_eq!(receive_resp.status(), StatusCode::NOT_FOUND);
    }
} 