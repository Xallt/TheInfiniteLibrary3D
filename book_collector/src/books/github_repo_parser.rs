use crate::api::gh_api::{
    GithubApi, GithubDirectoryElement, GithubElement, GithubElementList, GithubFileElement,
};
use crate::books::book_provider::BookPDFSource;
use crate::books::book_provider::BookProvider;
use crate::common::{CIterator, CResult};

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
    ) -> CResult<CIterator<GithubFileElement>> {
        match gh_content {
            GithubElement::File(file) => match file.extension() {
                Some(extension) => {
                    if extension.to_lowercase() == "pdf" {
                        Ok(Box::new(vec![file.clone()].into_iter()))
                    } else {
                        Ok(Box::new(Vec::new().into_iter()))
                    }
                }
                None => Ok(Box::new(Vec::new().into_iter())),
            },
            GithubElement::Directory(directory) => {
                let contents = gh_api
                    .get_elements(&self.owner, &self.repo, &directory.path)
                    .await?;
                let entries = match contents {
                    GithubElementList::SingleFile(_) => Vec::new(),
                    GithubElementList::DirectoryContents(contents) => contents,
                };

                let futures: Vec<_> = entries
                    .iter()
                    .map(|c| self.recursive_gh_traversal_pdf_paths(gh_api, c))
                    .collect();

                let content_list_results = futures::future::join_all(futures).await;
                let results_unflattened = content_list_results.into_iter().map(|r| r.unwrap());
                Ok(Box::new(results_unflattened.flatten()))
            }
        }
    }

    pub async fn recursive_list_pdf_files(
        &self,
        path: &str,
    ) -> CResult<CIterator<GithubFileElement>> {
        let api = GithubApi::new();
        let root_gh_element = GithubElement::Directory(GithubDirectoryElement {
            name: self.owner.clone(),
            path: path.to_string(),
        });
        self.recursive_gh_traversal_pdf_paths(&api, &root_gh_element)
            .await
    }
}

impl BookProvider for GithubRepoParser {
    async fn books_iter(&self) -> CResult<CIterator<BookPDFSource>> {
        let pdf_files = self.recursive_list_pdf_files("").await?;
        Ok(Box::new(pdf_files.into_iter().map(|gh_content| {
            BookPDFSource {
                title: gh_content.name,
                author: None,
                pdf_path: gh_content.download_url,
            }
        })))
    }
}
