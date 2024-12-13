use crate::api::gh_api::{
    GithubApi, GithubDirectoryElement, GithubElement, GithubElementList, GithubFileElement,
};
use crate::books::book_provider::BookPDFSource;
use crate::books::book_provider::BookProvider;

pub struct GithubRepoParser {
    owner: String,
    repo: String,
}

impl GithubRepoParser {
    pub fn new(owner: String, repo: String) -> Self {
        Self { owner, repo }
    }

    async fn recursive_gh_traversal_pdf_paths<'a>(
        &self,
        gh_api: &GithubApi,
        gh_content: &GithubElement,
    ) -> Result<Vec<GithubFileElement>, Box<dyn std::error::Error + Send + Sync>> {
        match gh_content {
            GithubElement::File(file) => match file.extension() {
                Some(extension) => {
                    if extension.to_lowercase() == "pdf" {
                        Ok(vec![file.clone()])
                    } else {
                        Ok(Vec::new())
                    }
                }
                None => Ok(Vec::new()),
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
                let results_unflattened: Vec<Vec<GithubFileElement>> = content_list_results
                    .into_iter()
                    .collect::<Result<Vec<_>, _>>()?;
                Ok(results_unflattened.into_iter().flatten().collect())
            }
        }
    }

    pub async fn recursive_list_pdf_files(
        &self,
        path: &str,
    ) -> Result<Vec<GithubFileElement>, Box<dyn std::error::Error + Send + Sync>> {
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
    async fn load_books(
        &self,
    ) -> Result<Vec<BookPDFSource>, Box<dyn std::error::Error + Send + Sync>> {
        let pdf_files = self.recursive_list_pdf_files("").await?;
        Ok(pdf_files
            .iter()
            .map(|gh_content| BookPDFSource {
                title: gh_content.name.clone(),
                author: None,
                pdf_path: gh_content.download_url.clone(),
            })
            .collect())
    }
}
