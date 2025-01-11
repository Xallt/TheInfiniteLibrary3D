use crate::books::book_provider::{BookProvider, BookProviderConfig};
use crate::books::github_repo_parser::GithubRepoParser;
use std::collections::HashMap;
use std::sync::RwLock;

pub struct BookProviderRegistry {
    providers: RwLock<HashMap<String, Box<dyn BookProvider>>>,
}

impl BookProviderRegistry {
    pub fn new() -> Self {
        let mut providers: HashMap<String, Box<dyn BookProvider>> = HashMap::new();

        // Register the default "guy_books" provider
        providers.insert(
            "guy_books".to_string(),
            Box::new(GithubRepoParser::new(
                "J3ke7".to_string(),
                "e-book".to_string(),
            )),
        );

        Self {
            providers: RwLock::new(providers),
        }
    }

    pub fn get_provider_config(&self, id: &str) -> Option<Box<dyn BookProviderConfig>> {
        self.providers
            .read()
            .ok()?
            .get(id)
            .map(|p| p.create_config())
    }
}

impl Default for BookProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}
