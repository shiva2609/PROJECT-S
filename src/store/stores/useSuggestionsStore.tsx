import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface SuggestionUser {
    id: string;
    username: string;
    displayName?: string;
    avatarUri?: string;
    isVerified?: boolean;
    followerCount?: number;
    mutualFollowers?: number;
    reason?: 'popular' | 'mutual' | 'new' | 'second_degree';
    name?: string;
    profilePic?: string;
    profilePhoto?: string;
    isFollowing?: boolean;
}

export interface SuggestionCategory {
    title: string;
    users: SuggestionUser[];
}

interface SuggestionsState {
    categories: SuggestionCategory[];
    suggestionUsers: Map<string, SuggestionUser>;
    isLoading: boolean;
    lastFetched: number;

    // Actions
    setCategories: (categories: SuggestionCategory[]) => void;
    setSuggestionUsers: (users: Map<string, SuggestionUser>) => void;
    setIsLoading: (loading: boolean) => void;
    updateLocalFollow: (userId: string, isFollowing: boolean) => void;
    clearSuggestions: () => void;
}

const SuggestionsContext = createContext<SuggestionsState | null>(null);

export function SuggestionsProvider({ children }: { children: ReactNode }) {
    const [categories, setCategoriesState] = useState<SuggestionCategory[]>([]);
    const [suggestionUsers, setSuggestionUsersState] = useState<Map<string, SuggestionUser>>(new Map());
    const [isLoading, setIsLoadingState] = useState(false);
    const [lastFetched, setLastFetched] = useState(0);

    const setCategories = useCallback((cats: SuggestionCategory[]) => {
        setCategoriesState(cats);
        setLastFetched(Date.now());
    }, []);

    const setSuggestionUsers = useCallback((users: Map<string, SuggestionUser>) => {
        setSuggestionUsersState(users);
    }, []);

    const setIsLoading = useCallback((loading: boolean) => {
        setIsLoadingState(loading);
    }, []);

    const updateLocalFollow = useCallback((userId: string, isFollowing: boolean) => {
        setSuggestionUsersState(prev => {
            const updated = new Map(prev);
            const user = updated.get(userId);
            if (user) {
                updated.set(userId, { ...user, isFollowing });
            }
            return updated;
        });
    }, []);

    const clearSuggestions = useCallback(() => {
        setCategoriesState([]);
        setSuggestionUsersState(new Map());
        setLastFetched(0);
    }, []);

    const value: SuggestionsState = {
        categories,
        suggestionUsers,
        isLoading,
        lastFetched,
        setCategories,
        setSuggestionUsers,
        setIsLoading,
        updateLocalFollow,
        clearSuggestions,
    };

    return (
        <SuggestionsContext.Provider value={value}>
            {children}
        </SuggestionsContext.Provider>
    );
}

export function useSuggestionsStore(): SuggestionsState {
    const context = useContext(SuggestionsContext);
    if (!context) {
        throw new Error('useSuggestionsStore must be used within SuggestionsProvider');
    }
    return context;
}
