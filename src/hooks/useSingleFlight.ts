import { useRef, useCallback, useState } from 'react';

interface FlightStatus {
    [key: string]: boolean;
}

/**
 * useSingleFlight
 * 
 * Prevents duplicate execution of async operations.
 * Keys are used to identify unique operations (e.g., "like:post_123").
 */
export function useSingleFlight() {
    const flights = useRef<FlightStatus>({});
    // We strictly DO NOT trigger re-renders for flight status unless requested
    // This allows background guards without UI flickering

    /**
     * Executes the given function only if the key is not currently in flight.
     * @param key Unique identifier for the operation
     * @param fn Async function to execute
     * @returns Result of fn or undefined if blocked
     */
    const execute = useCallback(async <T>(key: string, fn: () => Promise<T>): Promise<T | undefined> => {
        if (flights.current[key]) {
            console.log(`🔒 [SingleFlight] Blocked duplicate execution: ${key}`);
            return undefined;
        }

        console.log(`🚀 [SingleFlight] Starting: ${key}`);
        flights.current[key] = true;

        try {
            const result = await fn();
            return result;
        } finally {
            console.log(`🔓 [SingleFlight] Released: ${key}`);
            delete flights.current[key];
        }
    }, []);

    /**
     * Checks if a specific key is currently in flight
     */
    const isInFlight = useCallback((key: string): boolean => {
        return !!flights.current[key];
    }, []);

    return {
        execute,
        isInFlight,
    };
}
