import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ProgressBar from '../index.vue';

const createWrapper = (props = {}) => {
  return mount(ProgressBar, {
    props
  });
};

describe('ProgressBar', () => {
  it('以預設 props 正確渲染', () => {
    const wrapper = createWrapper();

    expect(wrapper.find('[data-test="progress-track"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="progress-fill"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="progress-label"]').exists()).toBe(true);
  });

  it('正確計算百分比 (value=30, max=100 => 30%)', () => {
    const wrapper = createWrapper({ value: 30, max: 100 });

    const fill = wrapper.find('[data-test="progress-fill"]');
    expect(fill.attributes('style')).toContain('width: 30%');

    const label = wrapper.find('[data-test="progress-label"]');
    expect(label.text()).toBe('30%');
  });

  it('當 value > max 時百分比上限為 100%', () => {
    const wrapper = createWrapper({ value: 150, max: 100 });

    const fill = wrapper.find('[data-test="progress-fill"]');
    expect(fill.attributes('style')).toContain('width: 100%');

    const label = wrapper.find('[data-test="progress-label"]');
    expect(label.text()).toBe('100%');
  });

  it('當 value=0 時顯示 0%', () => {
    const wrapper = createWrapper({ value: 0, max: 100 });

    const fill = wrapper.find('[data-test="progress-fill"]');
    expect(fill.attributes('style')).toContain('width: 0%');

    const label = wrapper.find('[data-test="progress-label"]');
    expect(label.text()).toBe('0%');
  });

  it('當 max <= 0 時百分比為 0%', () => {
    const wrapper = createWrapper({ value: 50, max: 0 });

    const fill = wrapper.find('[data-test="progress-fill"]');
    expect(fill.attributes('style')).toContain('width: 0%');

    const label = wrapper.find('[data-test="progress-label"]');
    expect(label.text()).toBe('0%');
  });

  it('未完成時顯示 shimmer 動畫', () => {
    const wrapper = createWrapper({ value: 50, max: 100 });

    expect(wrapper.find('[data-test="progress-shimmer"]').exists()).toBe(true);
  });

  it('完成時隱藏 shimmer 動畫', () => {
    const wrapper = createWrapper({ value: 100, max: 100 });

    expect(wrapper.find('[data-test="progress-shimmer"]').exists()).toBe(false);
  });

  it('showLabel=false 時不顯示百分比文字', () => {
    const wrapper = createWrapper({ showLabel: false });

    expect(wrapper.find('[data-test="progress-label"]').exists()).toBe(false);
  });

  it('variant=success 時使用 success 配色 class', () => {
    const wrapper = createWrapper({ variant: 'success', value: 50, max: 100 });

    const fill = wrapper.find('[data-test="progress-fill"]');
    expect(fill.classes().join(' ')).toContain('success');
  });

  it('具備正確的 ARIA 屬性', () => {
    const wrapper = createWrapper({ value: 40, max: 200 });

    const track = wrapper.find('[data-test="progress-track"]');
    expect(track.attributes('role')).toBe('progressbar');
    expect(track.attributes('aria-valuenow')).toBe('20');
    expect(track.attributes('aria-valuemin')).toBe('0');
    expect(track.attributes('aria-valuemax')).toBe('200');
  });
});
