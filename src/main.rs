use drop_backend::start_actix_server;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    // You can add any other backend initialization logic here
    println!("Initializing drop_backend...");

    // Start the Actix web server
    if let Err(e) = start_actix_server().await {
        eprintln!("Server error: {}", e);
        return Err(e);
    }

    Ok(())
}
