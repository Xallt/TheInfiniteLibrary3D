use crate::books::book_provider::{BookPDFSource, BookProvider};
use crate::utils::common::SafeIterator;
use rocket::State;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::RwLock;

pub struct PaginationState {
    next_id: AtomicU64,
    paginations: RwLock<HashMap<u64, Box<dyn Iterator<Item = Vec<BookPDFSource>> + Send + Sync>>>,
}

impl PaginationState {
    pub fn new() -> Self {
        Self {
            next_id: AtomicU64::new(0),
            paginations: RwLock::new(HashMap::new()),
        }
    }

    pub fn create_pagination(
        &self,
        iterator: Box<dyn Iterator<Item = Vec<BookPDFSource>> + Send + Sync>,
    ) -> u64 {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        self.paginations.write().unwrap().insert(id, iterator);
        id
    }

    pub fn get_next_page(&self, id: u64) -> Option<Vec<BookPDFSource>> {
        let mut paginations = self.paginations.write().unwrap();
        paginations.get_mut(&id)?.next()
    }
}
