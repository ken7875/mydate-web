// import type { WsChannel } from '~/enums/websocket';

interface Options {
  channelName: string;
  lockName: string;
  wsSendHandler: (data: any) => void;
  onBecomeLeader?: () => void;
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
  #onBecomeLeader: (() => void) | null = null;
  #leaderTabId: string = '';

  constructor(options: Options) {
    this.#lockName = options.lockName;
    this.#resolver = null;
    this.#tabId = crypto.randomUUID();
    this.#channelName = options.channelName;
    this.#wsSend = options.wsSendHandler;
    this.#onBecomeLeader = options.onBecomeLeader ?? null;
  }

  get getRole() {
    return this.#role;
  }

  #boundOnRequestLock = () => {
    if (document.visibilityState === 'visible') this.#requestLock();
  };
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
        this.#announceElection();
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
      tabId: this.#tabId,
      data
    });
  }

  #onLeaderSendRequest = (data: unknown) => {
    this.#wsSend(data);
  };

  #announceElection = () => {
    this.#requestLock();
  };

  #announceLeader = ({ tabId }: ElectionMessage) => {
    if (this.#tabId !== tabId) {
      this.#becomeFollower();
    }
  };

  async destroy() {
    this.#isDestroyed = true;
    await nextTick();
    document.removeEventListener('freeze', this.#onFreeze);
    this.#channel?.removeEventListener('message', this.#channelMessage);
    this.#channel?.close();
    this.#channel = null;
    document.removeEventListener('resume', this.#onResume);
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
    this.#onBecomeLeader?.();
  }

  #becomeFollower() {
    this.#releaseLeadership();
    this.#role = 'follower';
  }

  #requestLock(retryCount = 0): Promise<void> {
    if (document.visibilityState === 'hidden') return Promise.resolve();
    return new Promise<void>((resolve) => {
      navigator.locks.request(this.#lockName, { ifAvailable: true }, async (lock) => {
        if (this.#isDestroyed) {
          resolve();
          return;
        }

        // 沒搶到所就會是null
        if (!lock) {
          // 鎖暫時不可用（前任 leader 尚未完全釋放），以指數退避重試，最多 3 次（總等待 ≤ 300ms）
          if (retryCount < 3) {
            setTimeout(
              () => {
                this.#requestLock(retryCount + 1).then(() => resolve());
              },
              50 * (retryCount + 1)
            );
          } else {
            resolve();
          }
          return;
        }

        await new Promise<void>((lockResolve) => {
          this.#resolver = lockResolve as (value: unknown) => void;
          this.#becomeLeader(this.#tabId);
          resolve();
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
