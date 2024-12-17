use crate::books::book_provider::BookPDFSource;
use crate::books::github_repo_parser::GithubRepoParser;
use crate::server::book_view::BookProviderViewBuilder;
use crate::server::pagination::PaginationState;
use crate::utils::common::SafeResult;
use rocket::{get, launch, routes, serde::json::Json, State};

#[derive(Debug, serde::Serialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
enum BookResponse {
    Success(Vec<BookPDFSource>),
    Error { message: String },
}

#[derive(Debug, serde::Serialize)]
struct PaginationId {
    id: u64,
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

#[get("/init_all_guy_pagination")]
async fn init_all_guy_pagination(state: &State<PaginationState>) -> Json<PaginationId> {
    const GUY_NAME: &str = "J3ke7";
    const GUY_REPO: &str = "e-book";
    let provider = GithubRepoParser::new(GUY_NAME.to_string(), GUY_REPO.to_string());
    let view_builder = BookProviderViewBuilder::new(&provider);
    let pagination_view = view_builder.pagination_view(10); // 10 books per page

    let iterator = pagination_view.pagination_view().await.unwrap();
    let id = state.create_pagination(Box::new(iterator));

    Json(PaginationId { id })
}

#[get("/all_guy_pagination_next/<id>")]
async fn all_guy_pagination_next(id: u64, state: &State<PaginationState>) -> Json<BookResponse> {
    match state.get_next_page(id) {
        Some(books) => Json(BookResponse::Success(books)),
        None => Json(BookResponse::Error {
            message: "No more pages available".to_string(),
        }),
    }
}

pub async fn run_server(port: u16) -> SafeResult<()> {
    let config = rocket::Config::figment()
        .merge(("port", port))
        .merge(("address", "0.0.0.0"));

    let server_handle = rocket::custom(config)
        .manage(PaginationState::new())
        .mount(
            "/",
            routes![
                index,
                example_book,
                all_guy_books_handler,
                init_all_guy_pagination,
                all_guy_pagination_next
            ],
        )
        .launch()
        .await;

    match server_handle {
        Ok(server) => Ok(()),
        Err(e) => Err(e.into()),
    }
}
