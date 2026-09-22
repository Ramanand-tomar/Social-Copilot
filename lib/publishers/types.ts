export interface PublishAccount {
  id: string;
  platform: string;
  platformAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface PublishPost {
  id: string;
  content: string;
  mediaUrls: string[];
}

export interface PublishResult {
  externalPostId: string;
}

export interface PlatformPublisher {
  isPublishable: boolean;
  publish: (account: PublishAccount, post: PublishPost) => Promise<PublishResult>;
}
