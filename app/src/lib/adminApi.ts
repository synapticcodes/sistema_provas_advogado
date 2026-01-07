/**
 * @fileoverview Cliente API para o painel admin
 */
import type { IApiResponse } from '../types/exam';
import type {
    IAdminSubmissionsData,
    IAdminAttemptDetailData,
    IAdminReviewPayload,
    IAdminReviewSaveData,
} from '../types/admin';

const ADMIN_API_BASE = '/api/v1/admin';

function buildAdminUrl(path: string, params?: Record<string, string>) {
    const url = new URL(path, window.location.origin);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
    }
    return url.toString();
}

export async function getAdminSubmissions(
    review: 'pending' | 'reviewed' | 'all',
    limit: number,
    offset: number
): Promise<IApiResponse<IAdminSubmissionsData>> {
    const url = buildAdminUrl(`${ADMIN_API_BASE}/exams/submissions`, {
        review,
        limit: String(limit),
        offset: String(offset),
    });

    const response = await fetch(url, { credentials: 'include' });
    return response.json();
}

export async function getAdminAttemptDetail(
    attemptId: string
): Promise<IApiResponse<IAdminAttemptDetailData>> {
    const url = buildAdminUrl(`${ADMIN_API_BASE}/exams/attempt/${attemptId}`);
    const response = await fetch(url, { credentials: 'include' });
    return response.json();
}

export async function saveAdminReview(
    attemptId: string,
    payload: IAdminReviewPayload
): Promise<IApiResponse<IAdminReviewSaveData>> {
    const url = buildAdminUrl(`${ADMIN_API_BASE}/exams/attempt/${attemptId}/review`);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    return response.json();
}
