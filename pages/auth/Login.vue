<template>
  <div class="h-screen flex justify-center items-end">
    <form
      :validation-schema="validationSchema"
      @submit.prevent="loginHandler"
      class="max-w-[320px] w-full"
      data-test="login-form"
    >
      <!-- account -->
      <BaseInput
        label="Email"
        type="text"
        :class="['w-full mb-[8px]']"
        v-model="email"
        :error="formError?.email || ''"
        placeholder="Enter your email address..."
        data-test="account-input"
      />
      <p
        class="text-[12px] font-[700] text-center text-[rgba(0,0,0,.3)] mb-[15px] mt-[8px]"
        v-if="registerProcess === 'password'"
      >
        We just send you a temporary sign up code. Please check your inbox and paste the sign up code below
      </p>
      <!-- password -->
      <!-- v-if="registerProcess === 'password'" -->
      <BaseInput
        v-if="registerProcess === 'password'"
        :label="emailData.isPasswordSign ? 'password' : `${emailData.hasAccount ? 'Login' : 'Sign up'} code`"
        type="text"
        :class="['w-full mb-[8px]']"
        v-model="password"
        :error="passwordErrorMsg"
        placeholder="Paste login code"
        data-test="password-input"
      />
      <BaseButton
        class="border-2 rounded-[4px] w-full py-[6px] border-danger-200 button__outline-primary mb-3 text-danger-300"
        type="submit"
        data-test="login-button"
      >
        <!-- {{ `continue with ${isMailPass ? 'password' : 'email'}` }} -->
        {{ `continue with ${registerProcess}` }}
      </BaseButton>
      <!-- login test user -->
      <BaseButton
        class="border-2 rounded-[4px] w-full py-[6px] border-danger-200 button__outline-primary mb-3 text-danger-300"
        type="button"
        data-test="login-button"
        @click="
          loginTest({
            email: 'asd@mail.com',
            password: 'Qq111111'
          })
        "
        >asd@mail.com</BaseButton
      >
      <BaseButton
        class="border-2 rounded-[4px] w-full py-[6px] border-danger-200 button__outline-primary mb-3 text-danger-300"
        type="button"
        data-test="login-button"
        @click="
          loginTest({
            email: 'testv179@mail.com',
            password: 'Qq111111'
          })
        "
        >testv179@mail.com</BaseButton
      >
      <a class="text-[rgba(55, 53, 47, 0.65)] text-center notion-link" rel="noopener noreferrer" href="javascript:;"
        >Forget password?</a
      >
    </form>
  </div>
</template>

<script setup lang="ts">
// import { myFetch } from '@/utils/fetch';
import { useField, useForm, type GenericObject } from 'vee-validate';
import { object } from 'yup';
// import { emailValidate } from '@/utils/validator/auth';
// import BaseButton from '@/components/button/index.vue';
// import { merge, interval, map, iif, of, tap } from 'rxjs';
import { loginMethods, loginWithEmail } from '@/api/modules/auth';
// import { userInfoStorage } from '@/utils/storage/index';
import { string } from 'yup';
// import { tokenCookie } from '@/utils/cookies';
import { useAuth } from '@/store/auth';
// import { useMessage } from '@/store/message';
import type { User } from '@/api/types/user';
import type { ErrorResponse } from '~/composables/types/fetch';
import mergeWith from 'lodash/mergeWith';
import { storeToRefs } from 'pinia';
// const websocketStore = useChatRoom();
// import { ErrorResponse } from '~/types/global';

definePageMeta({
  layout: false
});

const router = useRouter();

const authStore = useAuth();
// const msgStore = useMessage();
const { setToken, setUserInfo } = authStore;
// const { openMessage } = msgStore;
// const registerProcess = ref('email');
// 需要再useField前先定義schema
const validationSchema = object({
  email: string().email().required(),
  registerProcess: string(),
  // vCode: string().required('vcode is require')
  password: string().when('registerProcess', {
    is: (val: 'email' | 'password') => val === 'password',
    then: () =>
      emailData.value.isPasswordSign ? string().required('vcode is require') : string().required('password is require'), // 當 is 成立時，則使用 then 的規則（count >= 10）
    otherwise: (schema) => schema.notRequired() // 當 is 不成立時，則使用 otherwise 的規則（count <= 5）
  })
});

const { handleSubmit, errors: formError } = useForm({
  validationSchema
});

const { value: email } = useField<string>('email', undefined);
const { value: registerProcess } = useField<'Email' | 'password'>('registerProcess', undefined, {
  initialValue: 'Email'
});
const { value: password } = useField<string>('password', undefined, {
  initialValue: ''
});

const emailData = ref({
  hasAccount: false,
  isPasswordSign: false
});

// 輸入信箱邏輯
const emailVerfiy = async () => {
  try {
    registerProcess.value = 'password';
    const data = await loginMethods({ email: email.value });

    if (!data?.data) {
      // openMessage({
      //   title: '錯誤',
      //   content: '系統錯誤, 登入失敗'
      // });
      registerProcess.value = 'Email';

      return;
    }

    const { hasAccount, isPasswordSign } = data!.data;
    emailData.value.hasAccount = hasAccount;
    emailData.value.isPasswordSign = isPasswordSign;
  } catch (error) {
    console.log(error, 'error');
  }
};

const passwordErrorMsg = ref('');
// 輸入驗證碼邏輯

const setUserToStorage = ({
  email,
  isPasswordSign,
  uuid,
  userName,
  phone
}: Pick<User, 'email' | 'isPasswordSign' | 'uuid' | 'userName' | 'phone'>) => {
  const { userInfo } = storeToRefs(authStore);
  setUserInfo(mergeWith(userInfo.value, { email, isPasswordSign, uuid, userName, phone }));
};

const login = async () => {
  try {
    const res = await loginWithEmail({
      email: email.value,
      password: password.value
    });
    // if (res.status.value === ) {
    //   passwordErrorMsg.value = res.data.value;
    //   return;
    // }

    passwordErrorMsg.value = '';
    const { token } = res.data!;

    setToken(token);
    redirect();
    setUserToStorage(res.data!);
    // websocketStore.init(token);
  } catch (error) {
    passwordErrorMsg.value = (error as ErrorResponse).message;
    console.log(error);
  }
};

const redirect = () => {
  emailData.value.isPasswordSign ? router.push('/meet') : router.push('/auth/SetUserInfo');
};

// 已經有帳號並且是使用密碼登入
const onSuccess = () => {
  switch (registerProcess.value) {
    case 'Email':
      console.log('onSuccess');
      emailVerfiy();
      break;
    case 'password':
      login();
      break;
  }
};

const onInvalidSubmit = ({ values, errors, results }: GenericObject) => {
  console.log(values, errors, results);
};

const loginHandler = handleSubmit(onSuccess, onInvalidSubmit);
// 送出表單
defineExpose({
  registerProcess,
  loginHandler,
  emailVerfiy,
  login,
  onSuccess,
  handleSubmit
});

// 測試用
const loginTest = async (data: { email: string; password: string }) => {
  try {
    const res = await loginWithEmail(data);
    // if (res.status.value === ) {
    //   passwordErrorMsg.value = res.data.value;
    //   return;
    // }

    passwordErrorMsg.value = '';
    const { token } = res.data!;

    setToken(token);
    router.push('/meet');
    setUserToStorage(res.data!);
    // websocketStore.init(token);
  } catch (error) {
    passwordErrorMsg.value = (error as ErrorResponse).message;
    console.log(error);
  }
};
// const sourceA$ = interval(1000).pipe(map((data) => `A${data}`));

// const sourceB$ = interval(3000).pipe(map((data) => `B${data}`));

// const sourceC$ = interval(5000).pipe(map((data) => `C${data}`));

// const subscription = merge(sourceA$, sourceB$, sourceC$).subscribe((data) => {
//   console.log(`merge 範例： ${data}`);
// });
</script>
