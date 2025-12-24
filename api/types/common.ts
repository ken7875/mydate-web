export interface BaseField<T, HasPage extends boolean = false> {
  code: number;
  data?: T;
  total: HasPage extends true ? number : undefined;
  page: HasPage extends true ? number : undefined;
  pageSize: HasPage extends true ? number : undefined;
  message: string;
  status: 'success' | 'fail';
}
export interface Pagination {
  page: number;
  pageSize: number;
}
