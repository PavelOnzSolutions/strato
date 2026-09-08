// Resource Category model matching backend ResourceCategory.java
export interface IResourceCategory {
    id: string;
    name: string;
    key: string;
    color: string;
    defaultProperties?: Record<string, any>;
}

// TODO: Use Omit<'id', IResourceCategory> instead of new iface.

export interface IResourceCategoryCreate {
    name: string;
    key: string;
    color: string;
    // Map of default property JSON paths to their types (string, integer, array, boolean)
    defaultProperties?: Record<string, string>;
}
