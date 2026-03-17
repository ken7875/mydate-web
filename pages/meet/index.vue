<template>
  <div class="relative full-screen-container">
    <div class="absolute left-1/2 -translate-x-1/2 w-[90%] h-full z-10">
      <Card
        v-for="(item, idx) in showingMeetUserList"
        :key="item.uuid"
        class="absolute w-full h-[88%] overflow-scroll card"
        :style="{ zIndex: showingMeetUserList.length - idx }"
      >
        <template #body>
          <div class="absolute top-0 h-[70%] w-full">
            <NuxtImg
              preload
              crossorigin="anonymous"
              format="webp"
              :src="getDefaultAvatar(item.avatars[0], '/images/testUser1.jpg')"
              alt="avatar"
              class="w-full h-full object-cover border-0"
              v-slot="{ isLoaded }"
            >
              <div class="shimmer-placeholder" v-show="!isLoaded"></div>
            </NuxtImg>
            <div class="absolute px-5 bottom-0 text-white">
              <div v-if="item.status === FriendStatus.Pending" class="px-5 py-[3px] mb-[16px] bg-amber-600">
                <p>有人想認識你!</p>
              </div>
              <p class="text-[30px] font-bold">{{ item.userName }}</p>
              <p class="mb-[15px]">
                <span class="mr-[6px]">{{ item.age }}</span>
                <span>{{ Gender[item.gender] }}</span>
              </p>
            </div>
            <div class="px-5 mt-5">
              <div class="flex mb-5">
                <p class="w-[30%] text-gray-400">個性</p>
                <div class="grid grid-cols-6 gap-2">
                  <Badge class="col-span-1 whitespace-nowrap" :fill="true" v-for="(value, i) in 10" :key="i">{{
                    '咖啡'
                  }}</Badge>
                </div>
              </div>
              <div class="flex mb-5">
                <p class="w-[30%] text-gray-400">興趣</p>
                <div class="grid grid-cols-6 gap-2">
                  <Badge class="col-span-1 whitespace-nowrap" :fill="true" v-for="(value, i) in 10" :key="i">{{
                    '咖啡'
                  }}</Badge>
                </div>
              </div>
              <template v-if="expandedUuids.has(item.uuid)">
                <div class="flex mb-3">
                  <p class="w-[30%] text-gray-400">自我介紹</p>
                  <p>{{ item.description }}</p>
                </div>
                <div class="flex mb-3">
                  <p class="w-[30%] text-gray-400">身高</p>
                  <p>123</p>
                </div>
                <div class="flex mb-3">
                  <p class="w-[30%] text-gray-400">體重</p>
                  <p>123</p>
                </div>
                <div class="flex mb-3">
                  <p class="w-[30%] text-gray-400">血型</p>
                  <p>123</p>
                </div>
              </template>
              <div
                @click="toggleDetail(item.uuid)"
                class="flex items-center justify-center gap-1 cursor-pointer text-gray-400"
              >
                <span class="text-sm">{{ expandedUuids.has(item.uuid) ? '收起' : '查看更多' }}</span>
                <ClientOnly>
                  <font-awesome-icon
                    :icon="['fas', expandedUuids.has(item.uuid) ? 'chevron-up' : 'chevron-down']"
                    class="text-xs"
                  />
                </ClientOnly>
              </div>
            </div>
          </div>
        </template>
      </Card>
      <div class="absolute top-[90%] flex gap-[50px] justify-center w-full h-[50px]">
        <div
          @click="handleDislike"
          class="bg-gray-400 w-[60px] h-[60px] rounded-[50%] flex justify-center items-center"
        >
          <ClientOnly>
            <font-awesome-icon :icon="['fas', 'heart-crack']" class="text-[40px] text-white" />
          </ClientOnly>
        </div>
        <!-- <div class="translate-y-[-10px]">super Like</div> -->
        <div @click="handleLike" class="bg-red-500 w-[60px] h-[60px] rounded-[50%] flex justify-center items-center">
          <ClientOnly>
            <font-awesome-icon :icon="['fas', 'heart']" class="text-[30px] text-white" />
          </ClientOnly>
        </div>
      </div>
      <!-- 喜歡顯示的icon -->
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
    <!-- <button @click="test">test</button> -->
    <!-- <NuxtLink to="/friends">friends</NuxtLink> -->
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
import { get } from 'lodash-es';
import { inviteFriend, setFriendStatus, dislikeUser } from '@/api/modules/friend';
import { FriendStatus } from '~/enums/friend';

// onErrorCaptured((err, instance, info) => {
//   console.log(err);

//   return false;
// });
// import type { User } from '~/api/types/user';
// import { useMessage } from '@/store/message';
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
const MAX_SHOWING_LENGTH = 5;
const showingMeetUserList = computed<MeetUser[]>(() =>
  [...requestUsers.value, ...meetUserList.value].slice(0, MAX_SHOWING_LENGTH)
);

const isFetching = ref(false);
const getMeetUserListHandler = async (append = false) => {
  if (isFetching.value) return;
  isFetching.value = true;
  try {
    const res = await getMeetUserList(meetForm.value);
    const newItems = get(res, 'data.list', []) as MeetUser[];
    meetUserList.value = append ? [...meetUserList.value, ...newItems] : newItems;
  } finally {
    isFetching.value = false;
  }
};

const meetUserDataHandler = () => {
  if (requestUsers.value.length > 0) {
    friendsStore.dequeueRequestUser();
  } else {
    meetUserList.value.shift();
  }
};

watch(meetForm, () => {
  friendsStore.getRequestUsersHandler();
  getMeetUserListHandler();
});

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

    meetUserDataHandler();
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

    meetUserDataHandler();
  } catch (error) {
    console.log(error, 'dislike request fail!!');
  }
};

watch(
  meetUserList,
  (val) => {
    if (val.length <= 2) {
      getMeetUserListHandler(true);
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

const expandedUuids = ref(new Set<string>());
const toggleDetail = (uuid: string) => {
  if (expandedUuids.value.has(uuid)) {
    expandedUuids.value.delete(uuid);
  } else {
    expandedUuids.value.add(uuid);
  }
  expandedUuids.value = new Set(expandedUuids.value);
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

const handleLike = useThrottleFn(() => likeDislikeAnimation('like'), 500);
const handleDislike = useThrottleFn(() => likeDislikeAnimation('dislike'), 500);

let tl: GSAPTimeline | null = null;
const likeDislikeAnimation = (type: 'like' | 'dislike' | 'superlike') => {
  showingHeartIcon.value = 'heart';
  const targets = gsap.utils.toArray('.card') as gsap.TweenTarget[];
  tl = gsap.timeline();
  if (type === 'like') {
    tl.to(targets[0], {
      x: 500,
      rotation: 30,
      duration: 0.5
    }).then(async () => {
      showingHeartIcon.value = '';
      await likeRequestHandler();
      targets.shift();
    });
  } else if (type === 'dislike') {
    showingHeartIcon.value = 'heart-crack';
    tl.to(targets[0], {
      x: -500,
      rotation: -30,
      duration: 0.5
    }).then(async () => {
      showingHeartIcon.value = '';
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

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.shimmer-placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #ede8e2 25%, #fff5e9 50%, #ede8e2 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
</style>
