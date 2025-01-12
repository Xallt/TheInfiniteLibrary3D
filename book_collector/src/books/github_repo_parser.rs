use crate::api::gh_api::{
    GithubApi, GithubDirectoryElement, GithubElement, GithubElementList, GithubFileElement,
};
use crate::books::book_provider::{BookPDFSource, BookProvider};
use crate::utils::common::SafeResult;
use async_trait::async_trait;
use futures::{Stream, StreamExt};
use std::pin::Pin;

#[derive(Clone)]
pub struct GithubRepoParser {
    owner: String,
    repo: String,
}

impl GithubRepoParser {
    pub fn new(owner: String, repo: String) -> Self {
        Self { owner, repo }
    }

    async fn recursive_gh_traversal_pdf_paths(
        &self,
        gh_api: &GithubApi,
        gh_content: &GithubElement,
    ) -> SafeResult<Pin<Box<dyn Stream<Item = GithubFileElement> + Send + Sync>>> {
        match gh_content {
            GithubElement::File(file) => {
                let file = file.clone();
                match file.extension() {
                    Some(extension) => {
                        if extension.to_lowercase() == "pdf" {
                            Ok(Box::pin(futures::stream::once(async move { file })))
                        } else {
                            Ok(Box::pin(futures::stream::empty()))
                        }
                    }
                    None => Ok(Box::pin(futures::stream::empty())),
                }
            }
            GithubElement::Directory(directory) => {
                let owner = self.owner.clone();
                let repo = self.repo.clone();
                let path = directory.path.clone();

                let contents = gh_api.get_elements(&owner, &repo, &path).await?;
                let entries = match contents {
                    GithubElementList::SingleFile(_) => Vec::new(),
                    GithubElementList::DirectoryContents(contents) => contents,
                };

                let streams_future = futures::future::join_all(
                    entries
                        .iter()
                        .map(|c| self.recursive_gh_traversal_pdf_paths(gh_api, c)),
                )
                .await;

                let streams = streams_future.into_iter().collect::<Result<Vec<_>, _>>()?;

                Ok(Box::pin(futures::stream::select_all(streams)))
            }
        }
    }

    pub async fn recursive_list_pdf_files(
        &self,
        path: &str,
    ) -> SafeResult<Pin<Box<dyn Stream<Item = GithubFileElement> + Send + Sync>>> {
        let api = GithubApi::new();
        let root_gh_element = GithubElement::Directory(GithubDirectoryElement {
            name: self.owner.clone(),
            path: path.to_string(),
        });
        self.recursive_gh_traversal_pdf_paths(&api, &root_gh_element)
            .await
    }
}

#[async_trait]
impl BookProvider for GithubRepoParser {
    async fn books_stream(
        &self,
    ) -> SafeResult<Pin<Box<dyn Stream<Item = BookPDFSource> + Send + Sync>>> {
        let pdf_files = self.recursive_list_pdf_files("").await?;
        Ok(Box::pin(pdf_files.map(|gh_content| BookPDFSource {
            title: gh_content.name,
            author: None,
            pdf_path: gh_content.download_url,
        })))
    }
}
