/*
 * YAKOAI
 * Copyright (c) 2025 Pavel Onz @ Nekorporát s.r.o.
 * All rights reserved.
 */
package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.Authority;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/** Spring Data MongoDB repository for the Authority entity. */
@Repository
public interface AuthorityRepository extends MongoRepository<Authority, String> {
    Authority getAuthorityByName(String name);
}
