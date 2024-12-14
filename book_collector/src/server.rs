use crate::books::book_provider::{BookPDFSource, BookProvider};
use crate::books::github_repo_parser::GithubRepoParser;
use poem::{
    get, handler, listener::TcpListener, middleware::Cors, EndpointExt, IntoResponse, Response,
    Route, Server,
};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
enum BookResponse {
    Success(Vec<BookPDFSource>),
    Error { message: String },
}

impl IntoResponse for BookResponse {
    fn into_response(self) -> Response {
        Response::builder()
            .content_type("application/json")
            .body(serde_json::to_string(&self).unwrap())
    }
}

async fn all_guy_books_impl() -> Result<Vec<BookPDFSource>, String> {
    const GUY_NAME: &str = "J3ke7";
    const GUY_REPO: &str = "e-book";
    let parser = GithubRepoParser::new(GUY_NAME.to_string(), GUY_REPO.to_string());
    parser.load_books().await.map_err(|e| e.to_string())
}

#[handler]
async fn all_guy_books() -> BookResponse {
    match all_guy_books_impl().await {
        Ok(books) => BookResponse::Success(books),
        Err(e) => BookResponse::Error {
            message: format!("Failed to fetch books: {}", e),
        },
    }
}

#[handler]
async fn example_book() -> BookResponse {
    return BookResponse::Success(vec![BookPDFSource {
        title: "Google Research".to_string(),
        pdf_path: "https://arxiv.org/pdf/2003.08934".to_string(),
        author: Some("Ben Mildenhall".to_string()),
    }]);
}

pub async fn run_server(port: u16) -> Result<(), std::io::Error> {
    let app = Route::new()
        .at("/all_guy_books", get(all_guy_books))
        .at("/example_book", get(example_book))
        .at("/", get(example_book))
        .with(
            Cors::new()
                .allow_origin("http://localhost")
                .allow_methods(vec!["GET", "POST"])
                .allow_credentials(true),
        );

    println!("Starting server on port {}", port);
    Server::new(TcpListener::bind(format!("0.0.0.0:{}", port)))
        .run(app)
        .await
}
