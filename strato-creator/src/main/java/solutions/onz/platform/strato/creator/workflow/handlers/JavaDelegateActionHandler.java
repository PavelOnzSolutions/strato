package solutions.onz.platform.strato.creator.workflow.handlers;

import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition.WorkflowStepDefinition;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class JavaDelegateActionHandler implements ActionHandler {

    private final ApplicationContext applicationContext;

    @Override
    public String getType() {
        return "JAVA_DELEGATE";
    }

    /**
     * Executes a workflow step by invoking a specified method on a Spring-managed bean.
     *
     * @param step      the workflow step definition containing configuration details such as the bean name and method name
     * @param variables a map of variables to be passed as input to the invoked method
     * @return an {@code ActionResult} object indicating the success or failure of the execution,
     *         including any output or error message
     */
    @Override
    public ActionResult execute(WorkflowStepDefinition step, Map<String, Object> variables) {
        String beanName = (String) step.getConfig().get("beanName");
        String methodName = (String) step.getConfig().get("methodName");

        try {
            Object bean = applicationContext.getBean(beanName);
            // Simple implementation: assume method takes variables map and returns Map<String, Object> or void
            Method method;
            try {
                method = bean.getClass().getMethod(methodName, Map.class);
                Object result = method.invoke(bean, variables);
                if (result instanceof Map) {
                    return ActionResult.success((Map<String, Object>) result);
                } else {
                    return ActionResult.success(null);
                }
            } catch (NoSuchMethodException e) {
                method = bean.getClass().getMethod(methodName);
                Object result = method.invoke(bean);
                if (result instanceof Map) {
                    return ActionResult.success((Map<String, Object>) result);
                } else {
                    return ActionResult.success(null);
                }
            }
        } catch (Exception e) {
            log.error("Failed to execute Java Delegate {}.{}: {}", beanName, methodName, e.getMessage());
            return ActionResult.failure("Java Delegate failed: " + e.getMessage());
        }
    }
}
