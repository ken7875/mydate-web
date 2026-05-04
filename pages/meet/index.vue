<template>
  <div class="relative full-screen-container">
    <div ref="cardsContainerRef" class="absolute left-1/2 -translate-x-1/2 w-[90%] h-full z-10">
      <Card
        v-for="(item, idx) in showingMeetUserList"
        :key="item.uuid"
        :data-card-uuid="item.uuid"
        class="absolute w-full h-[67dvh] overflow-scroll card overscroll-none"
        :style="{ zIndex: showingMeetUserList.length - idx }"
      >
        <template #body>
          <div class="h-auto w-full relative">
            <div class="h-[67dvh] relative">
              <picture>
                <source :srcset="useAvatarUrl(item.avatars['0'][0])" type="image/webp" />
                <img
                  crossorigin="anonymous"
                  :fetchpriority="idx === 0 ? 'high' : 'auto'"
                  :src="useAvatarUrl(item.avatars['0'][1])"
                  alt="avatar"
                  class="w-full h-full object-cover border-0 absolute top-0 left-0"
                />
              </picture>
              <!-- <div class="shimmer-placeholder" v-show="!isLoaded"></div> -->
              <div class="glass-overlay">
                <div class="flex justify-between items-center">
                  <p class="text-[30px] font-bold">{{ item.userName }}</p>
                  <div v-if="item.status === FriendStatus.Pending" class="px-5 py-[3px] bg-amber-600">
                    <p>有人想認識你!</p>
                  </div>
                </div>
                <p class="mb-[15px]">
                  <span class="mr-1.5">{{ item.age }}</span>
                  <span>{{ Gender[item.gender] }}</span>
                </p>
                <p class="mb-[15px]">{{ item.description }}</p>
              </div>
            </div>
            <div class="p-5 relative min-h-[37%]" v-if="expandedUuids.has(item.uuid)">
              <div class="flex mb-5 w-full">
                <p class="w-[60px] text-gray-400">個性</p>
                <div class="flex flex-wrap gap-2">
                  <Badge class="whitespace-nowrap" :fill="true" v-for="(personality, i) in item.personality" :key="i">{{
                    personality
                  }}</Badge>
                </div>
              </div>
              <div class="flex mb-5 w-full">
                <p class="w-[60px] text-gray-400">興趣</p>
                <div class="flex flex-wrap gap-2">
                  <Badge class="whitespace-nowrap" :fill="true" v-for="(interest, i) in item.interests" :key="i">{{
                    interest
                  }}</Badge>
                </div>
              </div>
              <!-- <template v-if="expandedUuids.has(item.uuid)"> -->
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
              <!-- </template> -->
            </div>
            <div
              @click="toggleDetail(item.uuid)"
              class="flex items-center justify-center gap-1 cursor-pointer text-gray-400 absolute bottom-[15px] left-[50%] -translate-x-1/2"
            >
              <span :class="expandedUuids.has(item.uuid) ? 'text-black' : 'text-white'">{{
                expandedUuids.has(item.uuid) ? '收起' : '查看更多'
              }}</span>
              <ClientOnly>
                <font-awesome-icon
                  :icon="['fas', expandedUuids.has(item.uuid) ? 'chevron-up' : 'chevron-down']"
                  class="text-xs"
                />
              </ClientOnly>
            </div>
          </div>
        </template>
      </Card>
      <div class="absolute top-[89%] flex gap-[50px] justify-center w-full h-[50px]">
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
            class="absolute top-[40%] left-1/2 -translate-x-1/2 z-2000 text-[60px] text-red-500"
          />
        </Transition>
      </ClientOnly>
      <ClientOnly>
        <Transition name="heart">
          <font-awesome-icon
            :icon="['fas', 'heart-crack']"
            v-show="showingHeartIcon === 'heart-crack'"
            class="absolute top-[40%] left-1/2 -translate-x-1/2 z-2000 text-[60px] text-green-400"
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
import type { MeetUser, MeetUserRefactor } from '~/api/types/user';
import { getMeetUserList } from '@/api/modules/user';
import { Gender } from '~/enums/user';
import { useSettings } from '@/store/settings';
import { useFriends } from '~/store/friends';
import { storeToRefs } from 'pinia';
import { get } from 'lodash-es';
import { inviteFriend, setFriendStatus, dislikeUser } from '@/api/modules/friend';
import { FriendStatus } from '~/enums/friend';

const settingsStore = useSettings();
const friendsStore = useFriends();

const { userInfoRes } = useUserInfoQuery();

const { requestUsers } = storeToRefs(friendsStore);
const { meetCondition } = storeToRefs(settingsStore);
const meetUserList = ref<MeetUser[]>([]);
const { data: userRes } = await useMyAsyncData('userList', () => getMeetUserList(meetCondition.value));
meetUserList.value = get(userRes.value, 'data.list', []);

await useMyAsyncData('requestUserList', () => friendsStore.getRequestUsersHandler());

// 邀請者應該要排在卡牌最上層
// 注意: meetUserList並沒有status(好友狀態數值)
const MAX_SHOWING_LENGTH = 5;
const showingMeetUserList = computed<MeetUserRefactor[]>(() =>
  [...requestUsers.value, ...meetUserList.value].slice(0, MAX_SHOWING_LENGTH).map((item) => ({
    ...item,
    avatars: item.avatars.reduce(
      (acc, cur) => {
        // 頭像連結為 https://xxx-xxx-0.webp
        const order = cur.split('-').at(-1)?.split('.')[0];
        if (!order) return acc;
        if (!acc[order]) {
          acc[order] = [];
        }
        acc[order].push(cur);

        return acc;
      },
      {} as MeetUserRefactor['avatars']
    )
  }))
);

let isFetching = false;
const getMeetUserListHandler = async (): Promise<MeetUser[] | null> => {
  if (isFetching) return null;
  isFetching = true;
  try {
    const res = await getMeetUserList(meetCondition.value);
    const newItems = get(res, 'data.list', []) as MeetUser[];
    meetUserList.value = newItems;

    return newItems;
  } finally {
    isFetching = false;
  }
};

const meetUserDataHandler = () => {
  if (requestUsers.value.length > 0) {
    friendsStore.dequeueRequestUser();
  } else {
    meetUserList.value.shift();
  }
};

watch(meetCondition, () => {
  friendsStore.getRequestUsersHandler();
  getMeetUserListHandler();
});

gsap.registerPlugin(Draggable);

const likeRequestHandler = async () => {
  // 若status為pending, 則代表此用戶已like你, 所以往左滑直接變成好友狀態, 反之則發送邀請將對方設為pending狀態
  const hasBeenInvited = showingMeetUserList.value[0]?.status === FriendStatus.Pending;
  try {
    if (hasBeenInvited) {
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

let unWatchGetNewUserHandler = watch(
  meetUserList,
  async (val) => {
    if (val.length <= 3) {
      let res = await getMeetUserListHandler();
      if (res !== null && res.length < 10) {
        // null = 正在 fetch，跳過；[] = 後端沒資料
        unWatchGetNewUserHandler();
      }
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

const cardsContainerRef = ref<HTMLElement | null>(null);
const legitimatelyRemovingUuids = new Set<string>();
let mutationObserver: MutationObserver | null = null;

const markLegitimateRemoval = (uuid: string) => {
  legitimatelyRemovingUuids.add(uuid);
};

// 避免用戶使用f12刪除卡片
const setupMutationObserver = () => {
  mutationObserver?.disconnect();
  if (!cardsContainerRef.value) return;

  mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;

      mutation.removedNodes.forEach((node) => {
        const el = node as HTMLElement;
        if (!el.classList?.contains('card')) return;

        const uuid = el.dataset.cardUuid;
        if (!uuid) return;

        if (legitimatelyRemovingUuids.has(uuid)) {
          legitimatelyRemovingUuids.delete(uuid);
        } else {
          // 非法刪除：強制重新渲染並重綁拖曳
          const snapshot = [...meetUserList.value];
          meetUserList.value = [];
          nextTick(() => {
            meetUserList.value = snapshot;
            nextTick(() => dragCardHandler());
          });
        }
      });
    }
  });

  mutationObserver.observe(cardsContainerRef.value, { childList: true });
};

// const loadedUuids = ref(new Set<string>());
// const onAvatarLoad = (uuid: string) => {
//   loadedUuids.value = new Set([...loadedUuids.value, uuid]);
// };

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
  const TRIGGER_RANGE = 150;

  let [instance] = Draggable.create('.card', {
    type: 'x',
    allowNativeTouchScrolling: true,
    edgeResistance: 0.65,
    inertia: true,
    onDrag() {
      // 在 onDrag 開頭判斷：若該卡片已展開且 this.y < 0（往上拖），呼叫 gsap.set(this.target, { y: 0 }) 鎖住 y 位置並直接 return，跳過後續的旋轉與 icon 邏輯
      const topCardUuid = showingMeetUserList.value[0]?.uuid;
      if (expandedUuids.value.has(topCardUuid) && this.y !== 0) {
        gsap.set(this.target, { y: 0 });
        return;
      }

      const maxRotation = 20;
      const rotation = (this.x / 300) * maxRotation;
      gsap.to(this.target, {
        rotation
      });
      if (this.x > TRIGGER_RANGE) {
        showingHeartIcon.value = 'heart';
      } else if (this.x < -TRIGGER_RANGE) {
        showingHeartIcon.value = 'heart-crack';
      } else {
        showingHeartIcon.value = '';
      }
    },
    onRelease() {
      if (this.x > TRIGGER_RANGE) {
        const uuid = (this.target as HTMLElement).dataset.cardUuid;
        if (uuid) markLegitimateRemoval(uuid);
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
      } else if (this.x < -TRIGGER_RANGE) {
        const uuid = (this.target as HTMLElement).dataset.cardUuid;
        if (uuid) markLegitimateRemoval(uuid);
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
  const targets = gsap.utils.toArray('.card') as HTMLElement[];
  tl = gsap.timeline();
  if (type === 'like') {
    const uuid = targets[0]?.dataset?.cardUuid;
    if (uuid) markLegitimateRemoval(uuid);
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
    const uuid = targets[0]?.dataset?.cardUuid;
    if (uuid) markLegitimateRemoval(uuid);
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
  setupMutationObserver();
});

// 當有新卡片加入需要重新綁定動畫
watch(showingMeetUserList, () => {
  nextTick(() => {
    dragCardHandler();
    setupMutationObserver();
  });
});

onUnmounted(() => {
  killDragAnimation();
  mutationObserver?.disconnect();
});
</script>

<style scoped>
@reference "tailwindcss";

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

.glass-overlay {
  @apply absolute px-5 py-9 bottom-0 text-white w-full;
  backdrop-filter: blur(6px) saturate(1.4);
  -webkit-backdrop-filter: blur(6px) saturate(1.4);
  background: linear-gradient(to top, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.06) 60%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 35%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 35%);
}

.shimmer-placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #ede8e2 25%, #fff5e9 50%, #ede8e2 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
</style>
