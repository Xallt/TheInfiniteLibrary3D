use crate::utils::common::{SafeIterator, SafeT};

pub fn chunk_iterator<T: SafeT + 'static>(
    mut iter: SafeIterator<T>,
    chunk_size: usize,
) -> SafeIterator<Vec<T>> {
    Box::new(std::iter::from_fn(move || {
        let mut chunk = Vec::with_capacity(chunk_size);
        for _ in 0..chunk_size {
            if let Some(item) = iter.next() {
                chunk.push(item);
            } else {
                break;
            }
        }

        if chunk.is_empty() {
            None
        } else {
            Some(chunk)
        }
    }))
}
