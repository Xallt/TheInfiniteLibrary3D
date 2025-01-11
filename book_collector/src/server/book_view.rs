use std::pin::Pin;

use futures::Stream;

use crate::books::book_provider::{BookPDFSource, BookProvider, BookProviderConfig};
use crate::utils::common::SafeResult;
use crate::utils::stream::chunk_stream;

pub struct BookProviderViewBuilder {
    provider_config: Box<dyn BookProviderConfig>,
}

impl BookProviderViewBuilder {
    pub fn new(provider_config: Box<dyn BookProviderConfig>) -> Self {
        Self { provider_config }
    }

    pub fn collection_list_view(&self) -> BookCollectionListView {
        BookCollectionListView::new(self.provider_config.instantiate())
    }

    pub fn pagination_view(&self, books_per_page: usize) -> BookPaginationView {
        BookPaginationView::new(self.provider_config.instantiate(), books_per_page)
    }
}

pub struct BookCollectionListView {
    provider: Box<dyn BookProvider>,
}

impl BookCollectionListView {
    pub fn new(provider: Box<dyn BookProvider>) -> Self {
        Self { provider }
    }

    pub async fn all_books(&self) -> SafeResult<Vec<BookPDFSource>> {
        self.provider.books().await
    }
}

pub struct BookPaginationView {
    provider: Box<dyn BookProvider>,
    books_per_page: usize,
}

impl BookPaginationView {
    pub fn new(provider: Box<dyn BookProvider>, books_per_page: usize) -> Self {
        Self {
            provider,
            books_per_page,
        }
    }

    pub async fn pagination_view(
        &self,
    ) -> SafeResult<Pin<Box<dyn Stream<Item = Vec<BookPDFSource>> + Send + Sync>>> {
        let books_stream = self.provider.books_stream().await?;

        let books_chunks = chunk_stream(books_stream, self.books_per_page);

        Ok(books_chunks)
    }
}
