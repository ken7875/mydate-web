<template>
  <div class="w-full h-screen flex justify-center items-center">
    <form :validation-schema="validationSchema" @submit.prevent="send" class="max-w-[320px] w-full">
      <!-- userName -->
      <BaseInput
        label="暱稱"
        type="text"
        class="w-full"
        v-model="userName"
        placeholder="Enter your password..."
        :error="formError?.userName || ''"
      />
      <!-- password -->
      <BaseInput
        label="Password"
        type="password"
        :class="['w-full mb-[8px]']"
        v-model="password"
        placeholder="Enter your password..."
        :error="formError.password || ''"
      />
      <BaseButton class="button button__outline-primary w-full mb-3" type="submit">
        <!-- {{ `continue with ${isMailPass ? 'password' : 'email'}` }} -->
        繼續
      </BaseButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useField, useForm } from 'vee-validate';
import { object, string } from 'yup';
import { setUserInfo as setUserInfoApi, setPassword as setPasswordApi } from '@/api/modules/auth';
import { useRouter } from 'vue-router';

const router = useRouter();

// const authStore = useAuth();
// const { userInfo } = storeToRefs(authStore);
const { userInfoRes } = useUserInfoQuery();
// const { setUserInfo } = authStore;

// 需要再useField前先定義schema
const validationSchema = object({
  userName: string().min(8, '暱稱最少8個字').max(13, '暱稱最多13個字').required('請輸入暱稱'),
  password: string()
    .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{5,30}$/, '密碼需大於5個字並小於13個字，且同時包含英文大小寫與數字')
    .required('請輸入密碼')
});

const { handleSubmit, errors: formError } = useForm({
  validationSchema
});

const { value: userName } = useField<string>('userName', undefined);
const { value: password } = useField<string>('password', undefined);

const send = handleSubmit(async () => {
  if (!userInfoRes.value?.data) {
    throw new Error('can not find user');
  }

  try {
    const userInfoReq = setUserInfoApi({
      email: userInfoRes.value.data.email,
      userName: userName.value,
      uuid: userInfoRes.value.data.uuid
    });
    const passwordReq = setPasswordApi({ email: userInfoRes.value.data.email, password: password.value });
    const apiResAry = await Promise.allSettled([userInfoReq, passwordReq]);

    if (apiResAry[0].status === 'fulfilled' && apiResAry[1].status === 'fulfilled') {
      const userInfoRes = apiResAry[0].value.data;
      if (!userInfoRes) {
        throw new Error('set user info fail!!');
      }

      // TODO 改為vue-query
      // setUserInfo(userInfoRes!);
      router.push('/');
    }
    // console.log(passwordRes, formError);
  } catch (error) {
    console.log(error, 'err');
    throw new Error('set user info fail!!');
  }
});
</script>
