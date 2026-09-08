package solutions.onz.platform.strato.creator.utils.web;

import solutions.onz.platform.strato.creator.services.exception.UsernameAlreadyUsedException;
import solutions.onz.platform.strato.creator.utils.web.exception.BadRequestAlertException;
import solutions.onz.platform.strato.creator.utils.web.exception.EmailAlreadyUsedException;
import solutions.onz.platform.strato.creator.utils.web.exception.InvalidPasswordException;
import solutions.onz.platform.strato.creator.utils.web.exception.LoginAlreadyUsedException;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageConversionException;
import org.springframework.lang.Nullable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.net.URI;
import java.util.*;

import static org.springframework.core.annotation.AnnotatedElementUtils.findMergedAnnotation;

@ControllerAdvice
public class ExceptionTranslator extends ResponseEntityExceptionHandler implements ExceptionTranslation {

    private static final String FIELD_ERRORS_KEY = "fieldErrors";
    private static final String MESSAGE_KEY = "message";
    private static final String PATH_KEY = "path";
    private static final boolean CASUAL_CHAIN_ENABLED = false;

    @Value("${spring.application.name}")
    private String applicationName;

    private final Environment env;

    public ExceptionTranslator(Environment env) {
        this.env = env;
    }

    @ExceptionHandler
    @Override
    public ResponseEntity<Object> handleAnyException(Throwable ex, WebRequest request) {
        ProblemDetailWithCause pdCause = wrapAndCustomizeProblem(ex, request);
        return handleExceptionInternal((Exception) ex, pdCause, buildHeaders(ex), HttpStatusCode.valueOf(pdCause.getStatus()), request);
    }

    @Nullable
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex,
            @Nullable Object body,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request
    ) {
        body = body == null ? wrapAndCustomizeProblem((Throwable) ex, request) : body;
        return new ResponseEntity<>(body, updateContentType(headers), HttpStatusCode.valueOf(((ProblemDetailWithCause) body).getStatus()));
    }

    protected ProblemDetailWithCause wrapAndCustomizeProblem(Throwable ex, WebRequest request) {
        return customizeProblem(getProblemDetailWithCause(ex), ex, request);
    }

    private ProblemDetailWithCause getProblemDetailWithCause(Throwable ex) {
        if (ex instanceof UsernameAlreadyUsedException)
            return (ProblemDetailWithCause) new LoginAlreadyUsedException().getBody();
        if (ex instanceof solutions.onz.platform.strato.creator.services.exception.EmailAlreadyUsedException)
            return (ProblemDetailWithCause) new EmailAlreadyUsedException().getBody();
        if (ex instanceof solutions.onz.platform.strato.creator.services.exception.InvalidPasswordException)
            return (ProblemDetailWithCause) new InvalidPasswordException().getBody();

        if (ex instanceof org.springframework.security.core.AuthenticationException) {
            return ProblemDetailWithCause.ProblemDetailWithCauseBuilder.instance()
                    .withStatus(toStatus(ex).value())
                    .withTitle("Unauthorized")
                    .withDetail("Invalid credentials")
                    .build();
        }
        if (ex instanceof ErrorResponseException exp && exp.getBody() instanceof ProblemDetailWithCause problemDetailWithCause)
            return problemDetailWithCause;
        return ProblemDetailWithCause.ProblemDetailWithCauseBuilder.instance().withStatus(toStatus(ex).value()).build();
    }

    protected ProblemDetailWithCause customizeProblem(ProblemDetailWithCause problem, Throwable err, WebRequest request) {
        if (problem.getStatus() <= 0) problem.setStatus(toStatus(err));
        if (problem.getType() == null || problem.getType().equals(URI.create("about:blank"))) problem.setType(getMappedType(err));
        String title = extractTitle(err, problem.getStatus());
        String problemTitle = problem.getTitle();
        if (problemTitle == null || !problemTitle.equals(title)) problem.setTitle(title);
        if (problem.getDetail() == null) problem.setDetail(getCustomizedErrorDetails(err));

        Map<String, Object> problemProperties = problem.getProperties();
        if (problemProperties == null || !problemProperties.containsKey(MESSAGE_KEY)) problem.setProperty(
                MESSAGE_KEY, getMappedMessageKey(err) != null ? getMappedMessageKey(err) : "error.http." + problem.getStatus()
        );
        if (problemProperties == null || !problemProperties.containsKey(PATH_KEY)) problem.setProperty(PATH_KEY, URI.create(Objects.toString(request.getDescription(false), "about:blank")));
        problem.setCause(buildCause(err.getCause(), request).orElse(null));
        return problem;
    }

    private String extractTitle(Throwable err, int statusCode) {
        return getCustomizedTitle(err) != null ? getCustomizedTitle(err) : HttpStatus.valueOf(statusCode).getReasonPhrase();
    }

    private String getMappedMessageKey(Throwable err) {
        if (err instanceof MethodArgumentNotValidException) return ErrorConstants.ERR_VALIDATION;
        if (err instanceof ConcurrencyFailureException || err.getCause() instanceof ConcurrencyFailureException) return ErrorConstants.ERR_CONCURRENCY_FAILURE;
        return null;
    }

    private String getCustomizedTitle(Throwable err) {
        if (err instanceof MethodArgumentNotValidException) return "Method argument not valid";
        return null;
    }

    private String getCustomizedErrorDetails(Throwable err) {
        Collection<String> activeProfiles = Arrays.asList(env.getActiveProfiles());
        if (activeProfiles.contains("prod") || activeProfiles.contains("azure")) {
            if (err instanceof HttpMessageConversionException) return "Unable to convert http message: " + err.getMessage();
            if (err instanceof DataAccessException) return "Failure during data access: " + err.getMessage();
            if (containsPackageName(err.getMessage())) return "Unexpected runtime exception: " + err.getMessage();
        }
        return err.getCause() != null ? err.getCause().getMessage() : err.getMessage();
    }

    private HttpStatus toStatus(final Throwable throwable) {
        if (throwable instanceof ErrorResponse err) return HttpStatus.valueOf(err.getBody().getStatus());
        return Optional.ofNullable(getMappedStatus(throwable)).orElse(Optional.ofNullable(resolveResponseStatus(throwable)).map(ResponseStatus::value).orElse(HttpStatus.INTERNAL_SERVER_ERROR));
    }

    private HttpStatus getMappedStatus(Throwable err) {
        if (err instanceof AccessDeniedException) return HttpStatus.FORBIDDEN;
        if (err instanceof ConcurrencyFailureException) return HttpStatus.CONFLICT;
        if (err instanceof BadCredentialsException) return HttpStatus.UNAUTHORIZED;
        if (err instanceof UsernameNotFoundException) return HttpStatus.UNAUTHORIZED;
        return null;
    }

    private HttpHeaders buildHeaders(Throwable err) {
        return err instanceof BadRequestAlertException badRequestAlertException
                ? HeaderUtil.createFailureAlert(applicationName, true, badRequestAlertException.getEntityName(), badRequestAlertException.getErrorKey(), badRequestAlertException.getMessage())
                : null;
    }

    private HttpHeaders updateContentType(HttpHeaders headers) {
        if (headers == null) {
            headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PROBLEM_JSON);
        }
        return headers;
    }

    public Optional<ProblemDetailWithCause> buildCause(final Throwable throwable, WebRequest request) {
        if (throwable != null && isCasualChainEnabled()) {
            return Optional.of(customizeProblem(getProblemDetailWithCause(throwable), throwable, request));
        }
        return Optional.empty();
    }

    private boolean isCasualChainEnabled() { return CASUAL_CHAIN_ENABLED; }

    private URI getMappedType(Throwable err) { return err instanceof MethodArgumentNotValidException ? ErrorConstants.CONSTRAINT_VIOLATION_TYPE : ErrorConstants.DEFAULT_TYPE; }

    private ResponseStatus resolveResponseStatus(final Throwable type) {
        final ResponseStatus candidate = findMergedAnnotation(type.getClass(), ResponseStatus.class);
        return candidate == null && type.getCause() != null ? resolveResponseStatus(type.getCause()) : candidate;
    }

    private boolean containsPackageName(String message) {
        return StringUtils.containsAny(message, "org.", "java.", "net.", "jakarta.", "javax.", "com.", "io.", "de.", "solutions.onz.platform.strato.creator");
    }
}
