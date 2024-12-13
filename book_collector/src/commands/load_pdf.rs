use std::fs::File;
use std::io::copy;
use std::path::Path;

pub async fn execute(
    url: &str,
    output_path: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    println!("Downloading PDF from: {}", url);
    println!("Saving to: {}", output_path);

    let response = reqwest::get(url).await?;

    if !response.status().is_success() {
        eprintln!("Failed to download PDF: HTTP {}", response.status());
        std::process::exit(1);
    }

    let mut output_file = File::create(Path::new(output_path))?;
    copy(&mut response.bytes().await?.as_ref(), &mut output_file)?;

    println!("PDF downloaded successfully!");
    Ok(())
}
