import { MediaPickResult, AdjustResult, PostPayload } from '../contracts';

/**
 * Runtime Assertions
 * 
 * "Fail Fast" Philosophy:
 * If data violates the contract, we crash the flow (throw error) rather than
 * propagate corruption to the server.
 */

class ContractViolationError extends Error {
    constructor(message: string, context?: any) {
        super(`[CreatePipeline] Contract Violation: ${message}`);
        this.name = 'ContractViolationError';
        if (context) console.error(context);
    }
}

export function assertValidMediaPick(data: any): asserts data is MediaPickResult {
    if (!data) throw new ContractViolationError('MediaPickResult is null/undefined');
    if (typeof data.originalUri !== 'string') throw new ContractViolationError('Missing originalUri');
    if (data.width < 1 || data.height < 1) throw new ContractViolationError('Invalid dimensions');
    // Strict File URI check could go here
}

export function assertValidAdjustResult(data: any): asserts data is AdjustResult {
    if (!data) throw new ContractViolationError('AdjustResult is null/undefined');
    if (typeof data.finalBitmapUri !== 'string') throw new ContractViolationError('Missing finalBitmapUri');
    if (!data.sessionId) throw new ContractViolationError('Missing sessionId');
}

export function assertValidPostPayload(data: any): asserts data is PostPayload {
    if (!data) throw new ContractViolationError('PostPayload is null/undefined');
    if (data.caption.length > 2200) throw new ContractViolationError('Caption too long');
    // Check location structure if present
    if (data.location) {
        if (typeof data.location.id !== 'string') throw new ContractViolationError('Invalid location ID');
    }
}
