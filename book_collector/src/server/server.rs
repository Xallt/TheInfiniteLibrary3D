use crate::books::book_provider::BookPDFSource;
use crate::books::github_repo_parser::GithubRepoParser;
use crate::server::book_view::{BookCollectionListView, BookProviderViewBuilder};
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

async fn all_guy_books_handler(
    list_view: BookCollectionListView<'_, GithubRepoParser>,
) -> BookResponse {
    match list_view.all_books().await {
        Ok(books) => BookResponse::Success(books),
        Err(e) => BookResponse::Error {
            message: format!("Failed to fetch books: {}", e),
        },
    }
}

#[handler]
async fn example_book() -> BookResponse {
    BookResponse::Success(vec![BookPDFSource {
        title: "Google Research".to_string(),
        pdf_path: "https://arxiv.org/pdf/2003.08934".to_string(),
        author: Some("Ben Mildenhall".to_string()),
    }])
}

#[handler]
async fn make_guy_books_handler() -> BookResponse {
    const GUY_NAME: &str = "J3ke7";
    const GUY_REPO: &str = "e-book";
    let provider = GithubRepoParser::new(GUY_NAME.to_string(), GUY_REPO.to_string());
    let view_builder = BookProviderViewBuilder::new(&provider);
    let list_view = view_builder.collection_list_view();
    all_guy_books_handler(list_view).await
}

pub async fn run_server(port: u16) -> Result<(), std::io::Error> {
    let app = Route::new()
        .at("/all_guy_books", get(make_guy_books_handler))
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
