use crate::books::book_provider::BookPDFSource;
use futures::Stream;
use futures::StreamExt;
use std::collections::HashMap;
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::{mpsc, RwLock};

pub struct PaginationState {
    next_id: AtomicU64,
    receivers: RwLock<HashMap<u64, mpsc::Receiver<Vec<BookPDFSource>>>>,
}

impl PaginationState {
    pub fn new() -> Self {
        Self {
            next_id: AtomicU64::new(0),
            receivers: RwLock::new(HashMap::new()),
        }
    }

    pub fn create_pagination(
        &self,
        mut stream: Pin<Box<dyn Stream<Item = Vec<BookPDFSource>> + Send + Sync>>,
    ) -> u64 {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = mpsc::channel(2); // Small buffer size since we read one at a time

        // Spawn a task to drive the stream
        tokio::spawn(async move {
            while let Some(chunk) = stream.next().await {
                if tx.send(chunk).await.is_err() {
                    break; // Receiver was dropped
                }
            }
        });

        // Store the receiver
        futures::executor::block_on(async {
            self.receivers.write().await.insert(id, rx);
        });

        id
    }

    pub async fn get_next_page(&self, id: u64) -> Option<Vec<BookPDFSource>> {
        let mut guard = self.receivers.write().await;
        if let Some(rx) = guard.get_mut(&id) {
            rx.recv().await
        } else {
            None
        }
    }
}
