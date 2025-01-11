use crate::utils::common::SafeResult;
use async_trait::async_trait;
use futures::Stream;
use serde::Serialize;
use std::pin::Pin;

/// Represents a source of book data
#[derive(Debug, Serialize, Clone)]
pub struct BookPDFSource {
    pub title: String,
    pub author: Option<String>,
    pub pdf_path: String,
}

/// Configuration trait for book providers
pub trait BookProviderConfig: Send + Sync {
    fn instantiate(&self) -> Box<dyn BookProvider>;
    fn clone_box(&self) -> Box<dyn BookProviderConfig>;
}

impl Clone for Box<dyn BookProviderConfig> {
    fn clone(&self) -> Self {
        self.clone_box()
    }
}

/// Provider interface for loading books from different sources
#[async_trait]
pub trait BookProvider: Send + Sync {
    /// Returns a stream of books
    async fn books_stream(
        &self,
    ) -> SafeResult<Pin<Box<dyn Stream<Item = BookPDFSource> + Send + Sync>>>;

    /// Creates a lightweight handle that can be used to reconstruct this provider
    fn create_config(&self) -> Box<dyn BookProviderConfig>;

    /// Default implementation that collects stream into a Vec
    async fn books(&self) -> SafeResult<Vec<BookPDFSource>> {
        use futures::StreamExt;
        let mut stream = self.books_stream().await?;
        let mut books = Vec::new();
        while let Some(book) = stream.next().await {
            books.push(book);
        }
        Ok(books)
    }
}
