import { StatusCode } from '@/enums/common';

export interface DataType<T> {
  type: string;
  data: T;
  code: StatusCode;
}
