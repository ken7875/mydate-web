<template>
  <Modal v-model:isOpen="isOpen">
    <template #default>
      <form :validation-schema="validationSchema" @submit.prevent="send">
        <BaseInput
          label="暱稱"
          type="text"
          class="w-full mb-3"
          v-model="userName"
          placeholder="Enter your password..."
          :error="formError?.userName || ''"
        />
        <BaseButton type="submit" class="button button__outline-primary w-full mb-3">送出</BaseButton>
      </form>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { useAuth } from '@/store/auth';
import { useForm, useField } from 'vee-validate';
import { object, string } from 'yup';

const isOpen = defineModel('isOpen', { required: true, default: false });
const authStore = useAuth();

const validationSchema = object({
  userName: string().min(8, '暱稱最少8個字').max(13, '暱稱最多13個字').required('請輸入暱稱')
});

const { handleSubmit, errors: formError } = useForm({
  validationSchema
});

const { value: userName } = useField<string>('userName', undefined, { initialValue: authStore.userInfo?.userName });

const send = handleSubmit(async (values) => {
  console.log(values);
});
</script>
