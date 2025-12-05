export interface ErrorResponse extends Error {
  code: number;
  message: string;
  status: 'success' | 'fail';
}
