package solutions.onz.platform.strato.creator.utils.web.exception;

import solutions.onz.platform.strato.creator.utils.web.ErrorConstants;
import solutions.onz.platform.strato.creator.utils.web.ProblemDetailWithCause;
import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;


import java.io.Serial;

@SuppressWarnings("java:S110") // Inheritance tree of classes should not be too deep
public class InvalidPasswordException extends ErrorResponseException {

    @Serial
    private static final long serialVersionUID = 1L;

    public InvalidPasswordException() {
        super(
            HttpStatus.BAD_REQUEST,
            ProblemDetailWithCause.ProblemDetailWithCauseBuilder.instance()
                .withStatus(HttpStatus.BAD_REQUEST.value())
                .withType(ErrorConstants.INVALID_PASSWORD_TYPE)
                .withTitle("Incorrect password")
                .build(),
            null
        );
    }
}
