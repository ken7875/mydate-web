// import type { WsChannel } from '~/enums/websocket';

interface Options {
  channelName: string;
  lockName: string;
  wsSendHandler: (data: any) => void;
}

type ElectionMessageType = 'ANNOUNCE_LEADER' | 'ANNOUNCE_ELECTION' | 'SEND_VIA_LEADER';

interface ElectionMessage {
  type: ElectionMessageType;
  tabId: string;
  data?: unknown;
}

export class LeaderElection {
  readonly #lockName: string;
  readonly #tabId: string;
  readonly #channelName: string;

  #resolver: ((value: unknown) => void) | null;

  #role: 'leader' | 'follower' | 'pending' = 'pending';
  #isDestroyed = false;
  #channel: BroadcastChannel | null = null;
  #wsSend: Options['wsSendHandler'];
  #leaderTabId: string = '';

  onBecomeLeader: (() => void) | null = null;

  constructor(options: Options) {
    this.#lockName = options.lockName;
    this.#resolver = null;
    this.#tabId = crypto.randomUUID();
    this.#channelName = options.channelName;
    this.#wsSend = options.wsSendHandler;
  }

  get getRole() {
    return this.#role;
  }

  #boundOnRequestLock = this.#requestLock.bind(this);
  #boundOnDestroy = this.destroy.bind(this);

  #initChannel() {
    this.#channel = new BroadcastChannel(this.#channelName);
    this.#channel.addEventListener('message', this.#channelMessage);

    // freeze / resume：Chrome / Edge（Page Lifecycle API）
    document.addEventListener('freeze', this.#onFreeze);
    document.addEventListener('resume', this.#onResume);

    // Safari 不支援 freeze/resume，所以用 pagehide / pageshow 代替。
    // pagehide / pageshow：Safari bfcache
    addEventListener('pagehide', this.#onPagehide);
    addEventListener('pageshow', this.#onPageshow);
    addEventListener('visibilitychange', this.#boundOnRequestLock); // 針對關閉標籤處理
    // addEventListener('beforeunload', this.#boundOnDestroy);
  }

  #onFreeze = () => {
    const role = this.getRole;
    if (this.#isDestroyed || role !== 'leader') return;

    this.#requestLock();
    this.#becomeFollower();
  };
  #onResume = () => {
    if (this.#isDestroyed) return;
    this.#requestLock();
  };
  #onPagehide = (event: PageTransitionEvent) => {
    if (this.#isDestroyed || !event.persisted) return;
    console.log('page hide!!');
    if (this.#leaderTabId === this.#tabId) {
      this.#requestLock();
      this.#becomeFollower();
    }
  };
  #onPageshow = (event: PageTransitionEvent) => {
    console.log('page show!!');
    if (this.#isDestroyed || !event.persisted) return;
    this.#requestLock();
  };

  #channelMessage = (event: MessageEvent<ElectionMessage>) => {
    const { type, tabId, data } = event.data;

    switch (type) {
      case 'ANNOUNCE_ELECTION':
        console.log('ANNOUNCE_ELECTION');
        this.#announceElection({ type, tabId, data });
        break;
      case 'ANNOUNCE_LEADER':
        console.log('ANNOUNCE_LEADER:', tabId);
        this.#announceLeader({ type, tabId, data });
        break;
      case 'SEND_VIA_LEADER':
        console.log('SEND_VIA_LEADER:', tabId);
        if (this.#leaderTabId === this.#tabId) {
          this.#onLeaderSendRequest(data);
        }
        break;
    }
  };

  requestSendViaLeader(data: unknown) {
    this.#channel?.postMessage({
      type: 'SEND_VIA_LEADER',
      data
    });
  }

  #onLeaderSendRequest = (data: unknown) => {
    this.#wsSend(data);
  };

  #announceElection = ({ type, tabId, data }: ElectionMessage) => {
    this.#requestLock();
  };

  #announceLeader = ({ type, tabId, data }: ElectionMessage) => {
    if (this.#tabId !== tabId) {
      this.#becomeFollower();
    }
  };

  async destroy() {
    this.#isDestroyed = true;
    await nextTick();
    removeEventListener('freeze', this.#onFreeze);
    this.#channel?.removeEventListener('message', this.#channelMessage);
    removeEventListener('resume', this.#onResume);
    removeEventListener('pageshow', this.#onPageshow);
    removeEventListener('pagehide', this.#onPagehide);
    removeEventListener('visibilitychange', this.#boundOnRequestLock);
    this.#releaseLeadership();
  }

  #becomeLeader(tabId: string) {
    this.#role = 'leader';
    this.#leaderTabId = tabId;
    this.#channel?.postMessage({
      tabId: this.#tabId,
      type: 'ANNOUNCE_LEADER'
    });
  }

  #becomeFollower() {
    this.#releaseLeadership();
    this.#role = 'follower';
  }

  #requestLock() {
    if (document.visibilityState === 'hidden') return;
    return new Promise((resolve) => {
      navigator.locks.request(this.#lockName, { ifAvailable: true }, async (lock) => {
        console.log(lock, 'lo');
        if (!lock || this.#isDestroyed) return Promise.resolve();
        await new Promise((lockResolve) => {
          this.#resolver = lockResolve;
          console.log(this.#resolver, 'resssss');
          this.#becomeLeader(this.#tabId);
          resolve(null);
        });

        // leader 釋放鎖，重新開始選舉
        this.#channel?.postMessage({
          tabId: this.#tabId,
          type: 'ANNOUNCE_ELECTION'
        });
      });
    });
  }

  async start() {
    if (this.#channel) return;

    this.#initChannel();
    await this.#requestLock();
  }

  #releaseLeadership() {
    this.#resolver?.(null);
    this.#resolver = null;
  }
}
