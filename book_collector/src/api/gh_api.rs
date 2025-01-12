use crate::utils::common::SafeResult;
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, USER_AGENT};
use reqwest::Client;
use serde::Deserialize;
use std::env;

/// Repesents a single file in a Github repository
#[derive(Debug, Clone)]
pub struct GithubFileElement {
    pub name: String,
    pub path: String,
    pub download_url: String,
    pub size: u64,
}

/// Represents a directory in a Github repository
pub struct GithubDirectoryElement {
    pub name: String,
    pub path: String,
}

impl GithubFileElement {
    /// Returns the extension of the file
    pub fn extension(&self) -> Option<String> {
        self.name.split('.').last().map(|s| s.to_string())
    }
}

/// Represents a single element in a Github repository (either a file or a directory)
pub enum GithubElement {
    File(GithubFileElement),
    Directory(GithubDirectoryElement),
}

/// Element returned by the Github API, which can be either a file or a directory
#[derive(Deserialize, Debug, Clone)]
pub struct GithubContent {
    #[serde(rename = "type")]
    pub content_type: String,
    pub name: String,
    pub path: String,
    pub download_url: Option<String>,
    pub size: Option<u64>,
}

impl GithubContent {
    /// Returns true if the content is a file
    pub fn is_file(&self) -> bool {
        return self.content_type == "file";
    }

    /// Converts the GithubContent to a GithubElement
    pub fn to_github_element(&self) -> GithubElement {
        if self.is_file() {
            GithubElement::File(GithubFileElement {
                name: self.name.clone(),
                path: self.path.clone(),
                download_url: self.download_url.clone().unwrap(),
                size: self.size.unwrap(),
            })
        } else {
            GithubElement::Directory(GithubDirectoryElement {
                name: self.name.clone(),
                path: self.path.clone(),
            })
        }
    }
}

/// Represents the output of the Github API, which can be either a single file or a list of files/directories in a directory
#[derive(Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum GithubContentsOutput {
    SingleFile(GithubContent),
    DirectoryContents(Vec<GithubContent>),
}

impl GithubContentsOutput {
    /// Converts the GithubContentsOutput to a GithubElementList
    pub fn to_element_list(&self) -> GithubElementList {
        match self {
            GithubContentsOutput::SingleFile(content) => {
                GithubElementList::SingleFile(content.to_github_element())
            }
            GithubContentsOutput::DirectoryContents(contents) => {
                GithubElementList::DirectoryContents(
                    contents
                        .into_iter()
                        .map(|c| c.to_github_element())
                        .collect(),
                )
            }
        }
    }
}

/// Represents a parsed list of Github elements (either a single file or a list of files/directories)
pub enum GithubElementList {
    SingleFile(GithubElement),
    DirectoryContents(Vec<GithubElement>),
}

/// The Github API client
pub struct GithubApi {
    client: Client,
}

impl GithubApi {
    /// Creates a new Github API client
    pub fn new() -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(
            ACCEPT,
            HeaderValue::from_static("application/vnd.github+json"),
        );
        headers.insert(USER_AGENT, HeaderValue::from_static("rust-github-cli"));

        if let Ok(token) = env::var("GITHUB_TOKEN") {
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&format!("Bearer {}", token)).expect("Invalid GitHub token"),
            );
        }

        let client = Client::builder()
            .default_headers(headers)
            .build()
            .expect("Failed to create HTTP client");

        Self { client }
    }

    /// Lists the contents of a directory in a Github repository
    pub async fn list_contents(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
    ) -> SafeResult<GithubContentsOutput> {
        let url = format!(
            "https://api.github.com/repos/{}/{}/contents/{}",
            owner, repo, path
        );

        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(format!("GitHub API error ({})", response.status()).into());
        }

        Ok(response.json().await?)
    }

    /// Gets the elements in a directory in a Github repository
    pub async fn get_elements(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
    ) -> SafeResult<GithubElementList> {
        let contents = self.list_contents(owner, repo, path).await?;
        Ok(contents.to_element_list())
    }
}

impl Default for GithubApi {
    fn default() -> Self {
        Self::new()
    }
}
