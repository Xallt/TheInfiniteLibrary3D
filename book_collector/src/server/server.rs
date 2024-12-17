use crate::books::book_provider::BookPDFSource;
use crate::books::github_repo_parser::GithubRepoParser;
use crate::server::book_view::BookProviderViewBuilder;
use crate::utils::common::SafeResult;
use rocket::{get, launch, routes, serde::json::Json};

#[derive(Debug, serde::Serialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
enum BookResponse {
    Success(Vec<BookPDFSource>),
    Error { message: String },
}

#[get("/all_guy_books")]
async fn all_guy_books_handler() -> Json<BookResponse> {
    const GUY_NAME: &str = "J3ke7";
    const GUY_REPO: &str = "e-book";
    let provider = GithubRepoParser::new(GUY_NAME.to_string(), GUY_REPO.to_string());
    let view_builder = BookProviderViewBuilder::new(&provider);
    let list_view = view_builder.collection_list_view();

    let response = match list_view.all_books().await {
        Ok(books) => BookResponse::Success(books),
        Err(e) => BookResponse::Error {
            message: format!("Failed to fetch books: {}", e),
        },
    };

    Json(response)
}

#[get("/example_book")]
async fn example_book() -> Json<BookResponse> {
    Json(BookResponse::Success(vec![BookPDFSource {
        title: "Google Research".to_string(),
        pdf_path: "https://arxiv.org/pdf/2003.08934".to_string(),
        author: Some("Ben Mildenhall".to_string()),
    }]))
}

#[get("/")]
async fn index() -> Json<BookResponse> {
    example_book().await
}

pub async fn run_server(port: u16) -> SafeResult<()> {
    let config = rocket::Config::figment()
        .merge(("port", port))
        .merge(("address", "0.0.0.0"));

    let server_handle = rocket::custom(config)
        .mount("/", routes![index, example_book, all_guy_books_handler])
        .launch()
        .await;

    match server_handle {
        Ok(server) => Ok(()),
        Err(e) => Err(e.into()),
    }
}
