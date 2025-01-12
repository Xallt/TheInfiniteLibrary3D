pub trait SafeT: Send + Sync {}
impl<T: Send + Sync> SafeT for T {}

pub type SafeResult<SafeT> = Result<SafeT, Box<dyn std::error::Error + Send + Sync>>;
