use crate::books::book_provider::{BookPDFSource, BookProvider};
use crate::common::CResult;

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
}

pub struct BookCollectionListView<'a, P: BookProvider> {
    provider: &'a P,
}

impl<'a, P: BookProvider> BookCollectionListView<'a, P> {
    pub fn new(provider: &'a P) -> Self {
        Self { provider }
    }

    pub async fn all_books(&self) -> CResult<Vec<BookPDFSource>> {
        self.provider.books().await
    }
}
