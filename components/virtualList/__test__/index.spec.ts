import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergeWith } from 'lodash-es';
import VirtualList from '../index.vue';

const createWrapper = (override = {}) => {
  const defaultConfig = {
    global: {
      mocks: {},
      directives: {
        textSlice: vi.fn()
      },
      stubs: {
        BaseSelect: {
          template: '<div></div>'
        },
        BaseOption: {
          template: '<div></div>'
        }
      }
    }
  };
  const wrapper = mount(VirtualList, mergeWith(defaultConfig, override));

  return wrapper;
};

describe('VirtualList', () => {
  it('first data total', () => {});
});
