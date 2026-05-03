import { defineStore } from 'pinia';
import type { MeetingUserQuery } from '@/api/types/user';
export const useSettings = defineStore('settings', () => {
  const meetCondition = ref<MeetingUserQuery>({
    gender: 0,
    age: [0, 60]
  });
  const setMeetCondition = (form: MeetingUserQuery) => {
    meetCondition.value = form;
  };

  const $reset = () => {
    meetCondition.value = { gender: 0, age: [0, 60] };
  };

  return {
    meetCondition,
    setMeetCondition,
    $reset
  };
});
