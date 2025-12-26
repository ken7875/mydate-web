<template>
  <div class="relative full-screen-container">
    <div class="absolute top-1/2 left-1/2 -translate-1/2 w-[80%] h-[85%] z-10">
      <Card
        v-for="(item, idx) in showingMeetUserList"
        :key="item.uuid"
        class="absolute w-full h-[80%] card"
        :style="{ zIndex: meetUserList.length - idx }"
      >
        <template #body>
          <client-only>
            <div class="h-full w-full absolute top-0 left-0">
              <img
                :src="publicPath + item.avatars[0]"
                alt="avatar"
                @error="getDefaultImg"
                class="w-full h-full object-cover"
              />
            </div>
          </client-only>
          <div class="p-[8px] absolute bottom-0 text-white">
            <div v-if="item.status === FriendStatus.Pending" class="px-[8px] py-[3px] mb-[16px] bg-amber-600">
              <p>有人想認識你!</p>
            </div>
            <p class="text-[25px] font-bold">{{ item.userName }}</p>
            <p class="mb-[15px]">
              <span class="mr-[6px]">{{ item.age }}</span>
              <span>{{ Gender[item.gender] }}</span>
            </p>
            <p>{{ item.description }}</p>
          </div>
        </template>
      </Card>
      <div class="absolute top-[85%] flex gap-[50px] justify-center w-full h-[50px]">
        <div
          @click="likeDislikeAnimation('dislike')"
          class="bg-gray-400 w-[60px] h-[60px] rounded-[50%] flex justify-center items-center"
        >
          <ClientOnly>
            <font-awesome-icon :icon="['fas', 'heart-crack']" class="text-[40px] text-white" />
          </ClientOnly>
        </div>
        <!-- <div class="translate-y-[-10px]">super Like</div> -->
        <div
          @click="likeDislikeAnimation('like')"
          class="bg-red-500 w-[60px] h-[60px] rounded-[50%] flex justify-center items-center"
        >
          <ClientOnly>
            <font-awesome-icon :icon="['fas', 'heart']" class="text-[30px] text-white" />
          </ClientOnly>
        </div>
      </div>
      <ClientOnly>
        <Transition name="heart">
          <font-awesome-icon
            v-show="showingHeartIcon === 'heart'"
            :icon="['fas', 'heart']"
            class="absolute top-[40%] left-1/2 -translate-x-1/2 z-1003 text-[60px] text-red-500"
          />
        </Transition>
      </ClientOnly>
      <ClientOnly>
        <Transition name="heart">
          <font-awesome-icon
            :icon="['fas', 'heart-crack']"
            v-show="showingHeartIcon === 'heart-crack'"
            class="absolute top-[40%] left-1/2 -translate-x-1/2 z-1003 text-[60px] text-green-400"
          />
        </Transition>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import type { MeetUser } from '~/api/types/user';
import { getMeetUserList } from '@/api/modules/user';
import { Gender } from '~/enums/user';
import { useSettings } from '@/store/settings';
import { useFriends } from '~/store/friends';
import { storeToRefs } from 'pinia';
import { cloneDeep, get } from 'lodash-es';
import { inviteFriend, setFriendStatus, dislikeUser } from '@/api/modules/friend';
import { FriendStatus } from '~/enums/friend';
// import type { User } from '~/api/types/user';
// import { useMessage } from '@/store/message';
const publicPath = computed(() => useRuntimeConfig().public.publicPath);

const settingsStore = useSettings();
const friendsStore = useFriends();

const { userInfoRes } = useUserInfoQuery();

const { requestUsers } = storeToRefs(friendsStore);
const { meetForm } = storeToRefs(settingsStore);
const meetUserList = ref<MeetUser[]>([]);
const { data: userRes } = await useMyAsyncData('userList', () => getMeetUserList(meetForm.value));
meetUserList.value = get(userRes.value, 'data.list', []);

await useMyAsyncData('requestUserList', () => friendsStore.getRequestUsersHandler());

// 邀請者應該要排在卡牌最上層
// 注意: meetUserList並沒有status(好友狀態數值)
const showingMeetUserList = ref<MeetUser[]>([]);
showingMeetUserList.value = cloneDeep([...requestUsers.value, ...meetUserList.value]);

const getMeetUserListHandler = async () => {
  const res = await getMeetUserList(meetForm.value);
  meetUserList.value = get(res, 'data.list', []);
  showingMeetUserList.value = cloneDeep([...requestUsers.value, ...meetUserList.value]);
};

watch(meetForm, () => {
  friendsStore.getRequestUsersHandler();
  getMeetUserListHandler();
});

const getDefaultImg = (event: Event) => ((event.target as HTMLImageElement).src = '/images/testUser1.jpg'); // 设置为默认图片

gsap.registerPlugin(Draggable);

const likeRequestHandler = async () => {
  // 若status為pending, 則代表此用戶已like你, 所以往左滑直接變成好友狀態, 反之則發送邀請將對方設為pending狀態
  try {
    if (showingMeetUserList.value[0]?.status === FriendStatus.Pending) {
      await setFriendStatus({
        userId: showingMeetUserList.value[0]?.uuid || '',
        friendId: userInfoRes.value?.data?.uuid || '',
        status: FriendStatus.Success
      });
    } else {
      await inviteFriend({ friendId: showingMeetUserList.value[0].uuid, status: FriendStatus.Pending });
    }
    showingMeetUserList.value.shift();
  } catch (error) {
    console.log(error, 'like request fail!!');
  }
};

const dislikeRquestHandler = async () => {
  try {
    if (showingMeetUserList.value[0]?.status === FriendStatus.Pending) {
      await setFriendStatus({
        userId: showingMeetUserList.value[0]?.uuid || '',
        friendId: userInfoRes.value?.data?.uuid || '',
        status: FriendStatus.Reject
      });
    } else {
      await dislikeUser({ friendId: showingMeetUserList.value[0].uuid });
    }
    showingMeetUserList.value.shift();
  } catch (error) {
    console.log(error, 'dislike request fail!!');
  }
};

watch(
  showingMeetUserList,
  (val) => {
    if (val.length === 0) {
      getMeetUserListHandler();
    }
  },
  {
    deep: true
  }
);
let draggableInstance: Draggable | null = null;

const killDragAnimation = () => {
  if (draggableInstance) {
    draggableInstance?.kill();
    draggableInstance = null;
  }
};

const showingHeartIcon = ref('');
const dragCardHandler = () => {
  killDragAnimation();

  let [instance] = Draggable.create('.card', {
    type: 'x,y',
    edgeResistance: 0.65,
    inertia: true,
    onDrag() {
      const maxRotation = 20;
      const rotation = (this.x / 300) * maxRotation;
      gsap.to(this.target, {
        rotation
      });
      if (this.x > 150) {
        showingHeartIcon.value = 'heart';
      } else if (this.x < -150) {
        showingHeartIcon.value = 'heart-crack';
      } else {
        showingHeartIcon.value = '';
      }
    },
    onRelease() {
      if (this.x > 150) {
        likeRequestHandler();
        // 滑出左邊
        gsap.to(this.target, {
          x: 500,
          rotation: 30,
          duration: 0.5,
          onComplete: () => {
            this.target.remove();
            setTimeout(() => {
              showingHeartIcon.value = '';
            }, 500);
          }
        });
      } else if (this.x < -150) {
        // 滑出右邊
        gsap
          .to(this.target, {
            x: -500,
            rotation: -30,
            duration: 0.5,
            onComplete: () => {
              this.target.remove();
              setTimeout(() => {
                showingHeartIcon.value = '';
              }, 500);
            }
          })
          .then(() => {
            dislikeRquestHandler();
          });
      } else {
        showingHeartIcon.value = '';
        // 回到原位
        gsap.to(this.target, {
          x: 0,
          y: 0,
          rotation: 0,
          duration: 0.3,
          overwrite: 'auto'
        });
      }
    }
  });

  draggableInstance = instance;
};

let tl: GSAPTimeline | null = null;
const likeDislikeAnimation = (type: 'like' | 'dislike' | 'superlike') => {
  const targets = gsap.utils.toArray('.card') as gsap.TweenTarget[];
  tl = gsap.timeline();
  if (type === 'like') {
    tl.to(targets[0], {
      x: 500,
      rotation: 30,
      duration: 0.5
    }).then(async () => {
      await likeRequestHandler();
      targets.shift();
    });
  } else if (type === 'dislike') {
    tl.to(targets[0], {
      x: -500,
      rotation: -30,
      duration: 0.5
    }).then(async () => {
      await dislikeRquestHandler();
      targets.shift();
    });
  }
};
onMounted(() => {
  dragCardHandler();
});

// 當有新卡片加入需要重新綁定動畫
watch(showingMeetUserList, () => {
  nextTick(() => {
    dragCardHandler();
  });
});

onUnmounted(() => {
  killDragAnimation();
});

watch(
  requestUsers,
  (val) => {
    showingMeetUserList.value = cloneDeep([...val, ...meetUserList.value]);
  },
  {
    deep: true
  }
);
</script>

<style scoped>
.heart-enter-active,
.heart-leave-active {
  transform: scale((1.1));
  transition: transform 0.1s ease;
}

.heart-enter-from,
.heart-leave-to {
  transform: scale(0);
}
</style>
