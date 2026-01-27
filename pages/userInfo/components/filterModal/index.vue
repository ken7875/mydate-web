<template>
  <Modal v-model:isOpen="isOpen">
    <template #default>
      <div class="mb-[15px]">
        <span>性別:</span>
        <div class="flex gap-3">
          <BaseCheckbox v-model="form.gender" label="男" :true-value="0"></BaseCheckbox>
          <BaseCheckbox v-model="form.gender" label="女" :true-value="1"></BaseCheckbox>
        </div>
      </div>
      <div class="mb-[15px]">
        <p class="mb-3">
          <span class="mr-[5px]">年齡:</span>
          <span>{{ form.age[0] }}</span>
          <span> ~ </span>
          <span>{{ form.age[1] }}</span>
        </p>
        <div class="w-[200px]">
          <RangeSlider v-model:start="form.age[0]" v-model:end="form.age[1]" :min="18" :max="50"></RangeSlider>
        </div>
      </div>
      <div>
        <button></button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Gender } from '@/enums/user';
import type { MeetingUserQuery } from '@/api/types/user';

const isOpen = defineModel('isOpen', { required: true, default: false });
const form: MeetingUserQuery = reactive({
  age: [18, 50],
  gender: Gender.Male
});
</script>
