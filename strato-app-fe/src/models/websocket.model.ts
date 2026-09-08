export type AuditOp = "CREATE" | "UPDATE" | "DELETE";

export interface ObservableChangeMessage<T = Record<string, unknown>> {
    entity?: string;        // FQN of entity class (e.g., com.foo.Translation)
    collection?: string;    // Mongo collection (e.g., "translations")
    operation?: AuditOp;    // CREATE | UPDATE | DELETE
    dateModified?: string;  // ISO instant from server
    user?: string;          // user who performed the change
    entityId?: string;      // id of single changed entity
    payload?: T | null;     // new object state (for CREATE/UPDATE)
    ids?: string[] | null;  // affected IDs (for batch operations, e.g., DELETE)
}
