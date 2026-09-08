package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class DatabaseReactiveUserDetailsService implements UserDetailsService {

    private final UserAccountRepository userRepo;
    private final AuthorityRepository authorityRepository;

    public DatabaseReactiveUserDetailsService(UserAccountRepository userRepo, AuthorityRepository authorityRepository) {
        this.userRepo = userRepo;
        this.authorityRepository = authorityRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        UserAccount u = Objects.requireNonNull(userRepo.findByUsername(username).orElse(null), "User not found");
        List<GrantedAuthority> authorities = new ArrayList<>();
        for (String roleName : u.getRoles()) {
            String roleWithPrefix = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
            authorities.add(new SimpleGrantedAuthority(roleWithPrefix));

            // Load permissions for this role (with hierarchy expansion)
            authorityRepository.findById(roleName).ifPresent(auth -> {
                if (auth.getPermissions() != null) {
                    for (String perm : Permissions.expandAll(auth.getPermissions())) {
                        authorities.add(new SimpleGrantedAuthority(perm));
                    }
                }
            });
        }
        return User.withUsername(u.getUsername())
                .password(u.getPasswordHash())
                .authorities(authorities)
                .build();
    }
}
