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

/// Provider interface for loading books from different sources
#[async_trait]
pub trait BookProvider: Send + Sync {
    /// Returns a stream of books
    async fn books_stream(
        &self,
    ) -> SafeResult<Pin<Box<dyn Stream<Item = BookPDFSource> + Send + Sync>>>;

    /// Clone this provider into a new boxed instance
    fn clone_box(&self) -> Box<dyn BookProvider>;

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

impl Clone for Box<dyn BookProvider> {
    fn clone(&self) -> Self {
        self.clone_box()
    }
}
