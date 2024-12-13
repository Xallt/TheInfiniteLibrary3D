use serde::Serialize;

/// Represents a source of book data
#[derive(Debug, Serialize)]
pub struct BookPDFSource {
    pub title: String,
    pub author: Option<String>,
    pub pdf_path: String,
}

/// Provider interface for loading books from different sources
pub trait BookProvider {
    /// Loads books and returns them as a vector
    async fn load_books(
        &self,
    ) -> Result<Vec<BookPDFSource>, Box<dyn std::error::Error + Send + Sync>>;
}
