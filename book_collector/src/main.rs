use clap::{Parser, Subcommand};
use tokio::runtime::Runtime;
mod api;
mod books;
mod commands;
mod server;
mod utils;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Download a PDF from a URL and save it to a specified path
    LoadPdf {
        /// URL of the PDF to download
        url: String,
        /// Path where to save the PDF
        output_path: String,
    },
    /// List contents of a GitHub repository path
    GhLs {
        /// Repository owner
        owner: String,
        /// Repository name
        repo: String,
        /// Path within repository
        path: String,
    },
    /// List all PDF files in a GitHub repository
    GhPdfList {
        /// Repository owner
        owner: String,
        /// Repository name
        repo: String,
    },
    /// Start the HTTP server
    Server {
        /// Port to run the server on
        #[arg(default_value_t = 3000)]
        port: u16,
    },
}

async fn run_app(cli: Cli) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    match cli.command {
        Commands::LoadPdf { url, output_path } => {
            commands::load_pdf::execute(&url, &output_path).await?;
        }
        Commands::GhLs { owner, repo, path } => {
            commands::gh_ls::execute(&owner, &repo, &path).await?;
        }
        Commands::GhPdfList { owner, repo } => {
            commands::gh_pdf_listing::execute(&owner, &repo).await?;
        }
        Commands::Server { port } => {
            server::server::run_server(port).await?;
        }
    }
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let runtime = Runtime::new()?;
    let cli = Cli::parse();
    runtime.block_on(run_app(cli))
}
