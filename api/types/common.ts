export interface BaseField<T, HasTotal extends boolean = false> {
  code: number;
  data?: T;
  total: HasTotal extends true ? number : undefined;
  message: string;
  status: 'success' | 'fail';
}
export interface Pagination {
  page: number;
  pageSize: number;
}
