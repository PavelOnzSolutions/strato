/*
 * YAKOAI
 * Copyright (c) 2025 Pavel Onz @ Nekorporát s.r.o.
 * All rights reserved.
 */
package solutions.onz.platform.strato.creator.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Field;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;

/**
 * Base abstract class for entities which will hold definitions for created,
 * last modified, created by, last modified by attributes.
 */
@Setter
@Getter
public abstract class AbstractAuditingEntity<T> implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    public abstract T getId();

    @CreatedBy
    @Field("created_by")
    private String createdBy;

    @CreatedDate
    @Field("created_date")
    private Instant createdDate = Instant.now();

    @LastModifiedBy
    @Field("last_modified_by")
    private String lastModifiedBy;

    @LastModifiedDate
    @Field("last_modified_date")
    private Instant lastModifiedDate = Instant.now();
}
