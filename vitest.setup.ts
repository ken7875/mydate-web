import { vi } from 'vitest';
import { config } from '@vue/test-utils';

vi.stubGlobal('definePageMeta', vi.fn());
vi.stubGlobal(
  'useCookie',
  vi.fn().mockImplementation(() => 'test')
);

config.global.config.warnHandler = () => {};
