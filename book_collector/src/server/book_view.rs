use crate::books::book_provider::{BookPDFSource, BookProvider};
use crate::utils::common::{SafeIterator, SafeResult};
use crate::utils::iterator::chunk_iterator;

pub struct BookProviderViewBuilder<'a, P: BookProvider> {
    provider: &'a P,
}

impl<'a, P: BookProvider> BookProviderViewBuilder<'a, P> {
    pub fn new(provider: &'a P) -> Self {
        Self { provider }
    }

    pub fn collection_list_view(&self) -> BookCollectionListView<'a, P> {
        BookCollectionListView::new(self.provider)
    }

    pub fn pagination_view(&self, books_per_page: usize) -> BookPaginationView<'a, P> {
        BookPaginationView::new(self.provider, books_per_page)
    }
}

pub struct BookCollectionListView<'a, P: BookProvider> {
    provider: &'a P,
}

impl<'a, P: BookProvider> BookCollectionListView<'a, P> {
    pub fn new(provider: &'a P) -> Self {
        Self { provider }
    }

    pub async fn all_books(&self) -> SafeResult<Vec<BookPDFSource>> {
        self.provider.books().await
    }
}

pub struct BookPaginationView<'a, P: BookProvider> {
    provider: &'a P,
    books_per_page: usize,
}

impl<'a, P: BookProvider> BookPaginationView<'a, P> {
    pub fn new(provider: &'a P, books_per_page: usize) -> Self {
        Self {
            provider,
            books_per_page,
        }
    }

    pub async fn pagination_view(&self) -> SafeResult<SafeIterator<Vec<BookPDFSource>>> {
        let books_iter = self.provider.books_iter().await?;
        Ok(chunk_iterator(books_iter, self.books_per_page))
    }
}
