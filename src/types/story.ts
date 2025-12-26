export interface Story {
    id: string;
    userId: string;
    mediaUrl: string;
    mediaType: 'image' | 'video' | 'text';
    caption?: string;
    createdAt: number;
    expiresAt: number;
    views?: string[];
}

export interface StoryUser {
    userId: string;
    username: string;
    avatar: string;
    stories: Story[];
    hasUnseen: boolean;
}
