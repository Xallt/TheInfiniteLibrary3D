use std::pin::Pin;

use futures::{Stream, StreamExt};

use super::common::SafeT;

pub fn chunk_stream<T: SafeT + Send + Sync + 'static>(
    stream: Pin<Box<dyn Stream<Item = T> + Send + Sync>>,
    chunk_size: usize,
) -> Pin<Box<dyn Stream<Item = Vec<T>> + Send + Sync>> {
    Box::pin(stream.chunks(chunk_size))
}
