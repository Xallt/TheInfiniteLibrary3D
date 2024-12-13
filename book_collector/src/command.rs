#[async_trait::async_trait]
pub trait Command {
    async fn execute(
        &self,
        args: &[String],
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
    fn name(&self) -> &'static str;
    fn description(&self) -> &'static str;
}
