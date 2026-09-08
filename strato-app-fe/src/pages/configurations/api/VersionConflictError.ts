import {IVersionConflictResponse} from '../../../models/configuration.model';

export class VersionConflictError extends Error {
    readonly body: IVersionConflictResponse;

    constructor(body: IVersionConflictResponse) {
        super(`Version conflict: latest=${body.latestVersion}`);
        this.name = 'VersionConflictError';
        this.body = body;
    }
}
