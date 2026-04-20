import { defineStore } from 'pinia';
import type { MeetingUserQuery } from '@/api/types/user';
export const useSettings = defineStore('settings', () => {
  const meetForm = ref<MeetingUserQuery>({
    gender: 0,
    age: [0, 60]
  });
  const filterMeetSettings = (form: MeetingUserQuery) => {
    meetForm.value = form;
  };

  const $reset = () => {
    meetForm.value = { gender: 0, age: [0, 60] };
  };

  return {
    meetForm,
    filterMeetSettings,
    $reset
  };
});
