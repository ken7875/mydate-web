import Login from '../Login.vue';
import { describe, it, vi, expect } from 'vitest';
import { mount, ComponentMountingOptions } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
// import { loginMethods } from '~/api/modules/auth';

const routerPushMock = vi.fn();
vi.mock('vue-router', async () => {
  const actual = (await vi.importActual('vue-router')) as object;

  return {
    ...actual,
    useRouter: () => ({
      push: routerPushMock
    })
  };
});

vi.mock('@/utils/fetch', () => ({
  myFetch: vi.fn()
}));

vi.mock('@/api/index', () => ({
  auth: {
    loginMethods: vi.fn().mockResolvedValue({
      data: {
        value: {
          data: {
            hasAccount: true,
            isPasswordSign: true
          }
        }
      }
    }),
    loginWithEmail: vi.fn().mockResolvedValue({
      data: {
        value: {
          data: {
            token: 'asd'
          }
        }
      }
    })
  }
}));

describe('Login', () => {
  // ComponentMountingOptions<unknown>
  const createWrapper = ({ override }: { override?: ComponentMountingOptions<unknown> }) => {
    const defaultConfig = {
      global: {
        mocks: {
          ...override,
          useRuntimeConfig: vi.fn()
        },
        plugins: [
          createTestingPinia({
            stubActions: false
          })
        ]
      }
    };

    const wrapper = mount(Login, { ...defaultConfig });

    return wrapper;
  };

  it('password-input is show', async () => {
    const wrapper = createWrapper({});

    wrapper.vm.registerProcess = 'password';
    await wrapper.vm.$nextTick();
    const passwordDom = wrapper.find('[data-test="password-input"]');
    expect(passwordDom.exists()).toBe(false);
  });

  it('password-input is show', async () => {
    const wrapper = createWrapper({});

    wrapper.vm.registerProcess = 'password';
    await wrapper.vm.$nextTick();
    const buttonDom = wrapper.find('[data-test="login-button"]');
    expect(buttonDom.text()).toBe('continue with password');
  });
});
