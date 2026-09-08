package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.Authority;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Service for managing authority entities.
 * Provides operations to retrieve, create, update, and delete authority records.
 */
@Service
@RequiredArgsConstructor
public class AuthorityService {

    private final AuthorityRepository authorityRepository;

    /**
     * Retrieves all authority records from the repository.
     * @return List of Authority entities
     */
    @PreAuthorize("hasAuthority(@permissions.ROLE_READ)")
    public List<Authority> findAll() {
        return authorityRepository.findAll();
    }

    /**
     * Retrieves an authority record by name from the repository.
     * @param name The name of the authority record to retrieve
     * @return Optional containing the authority record if found, otherwise empty
     */
    @PreAuthorize("hasAuthority(@permissions.ROLE_READ)")
    public Optional<Authority> findByName(String name) {
        return authorityRepository.findById(name);
    }

    /**
     * Saves an authority record to the repository.
     * @param authority The authority record to save
     * @return The saved authority record
     */
    @PreAuthorize("hasAuthority(@permissions.ROLE_WRITE)")
    public Authority save(Authority authority) {
        if (authority.getName() != null) {
            Optional<Authority> existing = authorityRepository.findById(authority.getName());
            if (existing.isPresent() && existing.get().isSystem()) {
                throw new IllegalArgumentException("System authority cannot be modified");
            }
        }
        return authorityRepository.save(authority);
    }

    /**
     * Deletes an authority record from the repository.
     * @param name The name of the authority record to delete
     */
    @PreAuthorize("hasAuthority(@permissions.ROLE_WRITE)")
    public void delete(String name) {
        Authority authority = authorityRepository.findById(name)
                .orElseThrow(() -> new IllegalArgumentException("Authority not found"));
        if (authority.isSystem()) {
            throw new IllegalArgumentException("System authority cannot be deleted");
        }
        authorityRepository.deleteById(name);
    }
}
