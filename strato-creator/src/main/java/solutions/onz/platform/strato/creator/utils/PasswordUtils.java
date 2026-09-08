package solutions.onz.platform.strato.creator.utils;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.SecureRandom;

public final class PasswordUtils {
    private static final PasswordEncoder DELEGATE = new BCryptPasswordEncoder();

    private PasswordUtils() {}

    public static String hash(String raw) {
        return DELEGATE.encode(raw);
    }

    public static boolean matches(String raw, String encoded) {
        return DELEGATE.matches(raw, encoded);
    }

    public static PasswordEncoder encoder() {
        return DELEGATE;
    }

    public static String secureRandomString(int length) {
        String alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        SecureRandom rnd = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(alphabet.charAt(rnd.nextInt(alphabet.length())));
        }
        return sb.toString();
    }
}
