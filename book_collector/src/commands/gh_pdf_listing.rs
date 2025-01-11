use crate::books::github_repo_parser::GithubRepoParser;
use futures::StreamExt;

pub async fn execute(
    owner: &str,
    repo: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let parser = GithubRepoParser::new(owner.to_string(), repo.to_string());
    let mut pdf_sources = parser.recursive_list_pdf_files("").await?;

    println!("PDF files found in repository:");
    while let Some(source) = pdf_sources.next().await {
        println!("{}", source.name);
    }
    Ok(())
}
