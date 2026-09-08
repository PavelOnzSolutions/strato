import {IResourceCategory, IResourceCategoryCreate} from "../../models/resource-category.model.ts";
import {fetchWithAuth} from "../../utils/api.ts";
import {IResource, ResourceCompact} from "../../models/resource.model.ts";

export interface Page<T> {
    content: T[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}


export const fetchCategories = async (): Promise<IResourceCategory[]> => {
    const response = await fetchWithAuth('/resource-categories');
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

export const createCategory = async (category: IResourceCategoryCreate): Promise<IResourceCategory> => {
    const response = await fetchWithAuth('/resource-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
    });
    if (!response.ok) {
        throw new Error('Failed to create category');
    }
    return response.json();
};

export const updateCategory = async ({ id, ...data }: IResourceCategory): Promise<IResourceCategory> => {
    const response = await fetchWithAuth(`/resource-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to update category');
    }
    return response.json();
};

export const deleteCategory = async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`/resource-categories/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete category');
    }
};

export const fetchResources = async (page: number, size: number, filters: any, sortConfig: {
    key: string,
    direction: 'asc' | 'desc'
} | null): Promise<Page<ResourceCompact>> => {
    const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
    });
    if (sortConfig) {
        params.append('sort', `${sortConfig.key},${sortConfig.direction}`);
    } else {
        params.append('sort', 'name,asc');
    }
    if (filters.type && filters.type !== 'ALL') params.append('type', filters.type);
    if (filters.categoryId && filters.categoryId !== 'ALL') params.append('categoryId', filters.categoryId);

    const response = await fetchWithAuth(`/resources/list?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch Resources');
    }
    return response.json();
};

export const fetchResource = async (id: string): Promise<IResource> => {
    const response = await fetchWithAuth(`/resources/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch Resource: ' + id);
    }
    return response.json();
};


export const deleteResource = async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`/resources/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete resource');
    }
};