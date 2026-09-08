import {Flavor} from "../../constants/flavors.ts";
import {ISectionCatalogEntry} from "../../models/section-catalog.model.ts";
import {fetchWithAuth} from "../../utils/api.ts";
import {IConfiguration, IConfigurationSchema, IVersionConflictResponse} from "../../models/configuration.model.ts";
import {VersionConflictError} from "./api/VersionConflictError";

async function throwIfVersionConflict(response: Response): Promise<void> {
    if (response.status !== 409) return;
    let body: unknown;
    try {
        body = await response.clone().json();
    } catch {
        // Non-JSON 409 (e.g. lock response without parseable body) — let the
        // caller's generic error path handle it.
        return;
    }
    if (body && typeof body === 'object' && 'code' in body
        && (body as {code: string}).code === 'CONFIG_VERSION_CONFLICT') {
        throw new VersionConflictError(body as IVersionConflictResponse);
    }
    // Other 409s (e.g. CONFIG_LOCKED) flow through to the generic error.
}

async function readServerErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const text = await response.clone().text();
        if (!text) return fallback;
        try {
            const json: unknown = JSON.parse(text);
            if (json && typeof json === 'object') {
                const obj = json as Record<string, unknown>;
                // Spring's default error body has "message" or "error"; some
                // paths put it under "detail".
                const candidate = obj.message ?? obj.detail ?? obj.error;
                if (typeof candidate === 'string' && candidate.length > 0) return candidate;
            }
        } catch {
            // Not JSON — use the raw text if it's short enough.
        }
        if (text.length <= 200) return text;
        return fallback;
    } catch {
        return fallback;
    }
}

export const fetchCatalog = async (flavor: Flavor): Promise<ISectionCatalogEntry[]> => {
    const response = await fetchWithAuth(`/section-catalog?flavor=${flavor}`);
    if (!response.ok) {
        throw new Error('Failed to fetch section catalog');
    }
    return response.json();
};

export const deleteCatalogEntry = async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`/section-catalog/${id}`, {method: 'DELETE'});
    if (response.status === 409) {
        throw new Error('Catalog entry is referenced by one or more schemas');
    }
    if (!response.ok) {
        throw new Error('Failed to delete catalog entry');
    }
};

export const cloneCatalogEntry = async (
    id: string,
    displayName: string,
    sectionKey: string,
): Promise<ISectionCatalogEntry> => {
    const response = await fetchWithAuth(`/section-catalog/clone/${id}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({displayName, sectionKey}),
    });
    if (!response.ok) {
        throw new Error(await readServerErrorMessage(response, 'Failed to clone catalog entry'));
    }
    return response.json();
};

export const fetchConfigurations = async (search?: string): Promise<IConfiguration[]> => {
    const url = search ? `/configurations?search=${encodeURIComponent(search)}` : '/configurations';
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
};

export const deleteConfiguration = async (documentId: string): Promise<void> => {
    const response = await fetchWithAuth(`/configurations/document/${documentId}`, {method: 'DELETE'});
    if (!response.ok) throw new Error('Failed to delete configuration');
};

export const cloneConfiguration = async (id: string, name: string): Promise<IConfiguration> => {
    const response = await fetchWithAuth(`/configurations/clone/${id}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name}),
    });
    if (!response.ok) throw new Error('Failed to clone configuration');
    return response.json();
};

export const fetchConfigurationById = async (id: string): Promise<IConfiguration> => {
    const response = await fetchWithAuth(`/configurations/${id}`);
    if (!response.ok) throw new Error('Failed to fetch configuration');
    return response.json();
};

export const fetchSchemas = async (): Promise<IConfigurationSchema[]> => {
    const response = await fetchWithAuth('/configuration-schemas');
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

export const deleteSchema = async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`/configuration-schemas/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete schema');
    }
};

export const cloneSchema = async (id: string, name: string): Promise<IConfigurationSchema> => {
    const response = await fetchWithAuth(`/configuration-schemas/clone/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error('Failed to clone schema');
    return response.json();
};

export const fetchSchema = async (id: string): Promise<IConfigurationSchema> => {
    const r = await fetchWithAuth(`/configuration-schemas/${id}`);
    if (!r.ok) throw new Error('Failed to fetch schema');
    return r.json();
};

export const fetchMaterialized = async (id: string): Promise<unknown> => {
    const r = await fetchWithAuth(`/configuration-schemas/${id}/materialized`);
    if (!r.ok) throw new Error('Failed to fetch materialized schema');
    return r.json();
};

export const fetchCatalogList = async (flavor: Flavor): Promise<ISectionCatalogEntry[]> => {
    const r = await fetchWithAuth(`/section-catalog?flavor=${flavor}`);
    if (!r.ok) throw new Error('Failed to fetch catalog');
    return r.json();
};

export const saveSchema = async (schema: Partial<IConfigurationSchema>): Promise<IConfigurationSchema> => {
    const isNew = !schema.id;
    const url = isNew ? '/configuration-schemas' : `/configuration-schemas/${schema.id}`;
    const r = await fetchWithAuth(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(schema),
    });
    await throwIfVersionConflict(r);
    if (!r.ok) {
        const msg = await readServerErrorMessage(r, 'Failed to save schema');
        throw new Error(msg);
    }
    return r.json();
};

export const fetchCatalogByFlavor = async (flavor: Flavor): Promise<ISectionCatalogEntry[]> => {
    const r = await fetchWithAuth(`/section-catalog?flavor=${flavor}`);
    if (!r.ok) throw new Error('Failed to fetch section catalog');
    return r.json();
};

export const fetchProviderOutput = async (configName: string): Promise<{ data: unknown }> => {
    const r = await fetchWithAuth(`/configuration-provider/config/${encodeURIComponent(configName)}`);
    if (!r.ok) throw new Error('Failed to fetch provider output');
    return r.json();
};

export const saveConfiguration = async (config: Partial<IConfiguration>): Promise<IConfiguration> => {
    const isNew = !config.id;
    const url = isNew ? '/configurations' : `/configurations/${config.id}`;
    const r = await fetchWithAuth(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(config),
    });
    await throwIfVersionConflict(r);
    if (!r.ok) {
        const msg = await readServerErrorMessage(r, 'Failed to save configuration');
        throw new Error(msg);
    }
    return r.json();
};

