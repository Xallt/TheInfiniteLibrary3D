pub type CIterator<T> = Box<dyn Iterator<Item = T> + Send>;
pub type CResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;
