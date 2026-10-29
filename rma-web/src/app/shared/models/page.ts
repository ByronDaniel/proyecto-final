export interface PageMetadata {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  page: PageMetadata;
}
