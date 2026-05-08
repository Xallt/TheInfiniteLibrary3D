import { BookMeshParams } from '../components/Bookshelf/Book';
import { BookTexture } from '../components/Bookshelf/BookTexture';
import { PDFResource } from './PDFResource';

export type BookData = {
  id: string;
  pdfResource: PDFResource;
  texture: BookTexture;
  params: BookMeshParams;
  loadPages: boolean;
};
