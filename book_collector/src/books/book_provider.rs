use crate::utils::common::{SafeIterator, SafeResult};
use serde::Serialize;

/// Represents a source of book data
#[derive(Debug, Serialize)]
pub struct BookPDFSource {
    pub title: String,
    pub author: Option<String>,
    pub pdf_path: String,
}

/// Provider interface for loading books from different sources
pub trait BookProvider: Clone {
    /// Returns an iterator over books
    async fn books_iter(&self) -> SafeResult<SafeIterator<BookPDFSource>>;

    /// Default implementation that collects iterator into a Vec
    async fn books(&self) -> SafeResult<Vec<BookPDFSource>> {
        let iter = self.books_iter().await?;
        Ok(iter.collect())
    }
}
