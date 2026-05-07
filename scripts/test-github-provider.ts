import { fetchBooks } from '../src/api/BookCollectorAPI';

async function main() {
    console.log('Fetching books from GitHub...');
    const books = await fetchBooks('guy_books');

    if (books.length === 0) {
        console.error('No books found — check the repo or network.');
        process.exit(1);
    }

    console.log(`Found ${books.length} books:\n`);
    for (const book of books) {
        console.log(`  ${book.title}`);
        console.log(`    ${book.pdf_path}`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
