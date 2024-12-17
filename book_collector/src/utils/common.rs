pub trait SafeT: Send + Sync {}
impl<T: Send + Sync> SafeT for T {}

pub type SafeIterator<T: SafeT> = Box<dyn Iterator<Item = T> + Send + Sync>;
pub type SafeResult<T: SafeT> = Result<T, Box<dyn std::error::Error + Send + Sync>>;
