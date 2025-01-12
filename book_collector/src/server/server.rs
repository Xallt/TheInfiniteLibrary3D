use crate::books::book_provider::BookPDFSource;
use crate::server::book_providers::BookProviderRegistry;
use crate::server::book_view::BookProviderViewBuilder;
use crate::server::pagination::PaginationState;
use crate::utils::common::SafeResult;
use rocket::{get, routes, serde::json::Json, State};
use rocket_cors::AllowedOrigins;

#[derive(Debug, serde::Serialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
enum BookResponse {
    Success(Vec<BookPDFSource>),
    Error { message: String },
}

#[derive(Debug, serde::Serialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
enum PaginationInitResponse {
    Success { pagination_id: u64 },
    Error { message: String },
}

#[get("/all/<provider_id>")]
async fn all_books(
    provider_id: &str,
    registry: &State<BookProviderRegistry>,
) -> Json<BookResponse> {
    match registry.get_provider(provider_id) {
        Some(provider) => {
            let view_builder = BookProviderViewBuilder::new(provider);
            let list_view = view_builder.collection_list_view();

            match list_view.all_books().await {
                Ok(books) => Json(BookResponse::Success(books)),
                Err(e) => Json(BookResponse::Error {
                    message: format!("Failed to fetch books: {}", e),
                }),
            }
        }
        None => Json(BookResponse::Error {
            message: format!("Book provider '{}' not found", provider_id),
        }),
    }
}

#[get("/pagination_init/<provider_id>?<chunk_size>")]
async fn pagination_init(
    provider_id: &str,
    registry: &State<BookProviderRegistry>,
    state: &State<PaginationState>,
    chunk_size: Option<usize>,
) -> Json<PaginationInitResponse> {
    match registry.get_provider(provider_id) {
        Some(provider) => {
            let view_builder = BookProviderViewBuilder::new(provider);
            let pagination_view = view_builder.pagination_view(chunk_size.unwrap_or(1)); // 10 books per page

            match pagination_view.pagination_view().await {
                Ok(stream) => {
                    let id = state.create_pagination(stream);
                    Json(PaginationInitResponse::Success { pagination_id: id })
                }
                Err(e) => Json(PaginationInitResponse::Error {
                    message: e.to_string(),
                }),
            }
        }
        None => Json(PaginationInitResponse::Error {
            message: format!("Book provider '{}' not found", provider_id),
        }),
    }
}

#[get("/pagination_next/<provider_id>/<pagination_id>")]
async fn pagination_next(
    provider_id: &str,
    pagination_id: u64,
    registry: &State<BookProviderRegistry>,
    state: &State<PaginationState>,
) -> Json<BookResponse> {
    // We first verify the provider exists
    if registry.get_provider(provider_id).is_none() {
        return Json(BookResponse::Error {
            message: format!("Book provider '{}' not found", provider_id),
        });
    }

    match state.get_next_page(pagination_id).await {
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

    let allowed_origins = AllowedOrigins::some_exact(&["http://localhost"]);

    let cors = rocket_cors::CorsOptions::default()
        .allowed_origins(allowed_origins)
        .to_cors()?;

    let server_handle = rocket::custom(config)
        .manage(PaginationState::new())
        .manage(BookProviderRegistry::new())
        .attach(cors)
        .mount("/", routes![all_books, pagination_init, pagination_next])
        .launch()
        .await;

    match server_handle {
        Ok(_) => Ok(()),
        Err(e) => Err(e.into()),
    }
}
