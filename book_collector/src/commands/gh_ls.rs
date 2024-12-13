use crate::api::gh_api::{GithubApi, GithubContentsOutput};

pub async fn execute(
    owner: &str,
    repo: &str,
    path: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let github_api = GithubApi::new();
    let contents = github_api.list_contents(owner, repo, path).await?;

    match contents {
        GithubContentsOutput::SingleFile(content) => {
            println!("Single file");
            println!("{} ({})", content.path, content.content_type,);
        }
        GithubContentsOutput::DirectoryContents(contents) => {
            println!("Directory contents");
            for item in contents {
                println!("{} ({})", item.path, item.content_type,);
            }
        }
    }

    Ok(())
}
