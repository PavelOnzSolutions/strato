package solutions.onz.platform.strato.creator.domain;

import java.io.Serial;
import java.io.Serializable;

public abstract class AbstractAccessControlledEntity<T> implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    public abstract T getId();

    public abstract void setId(T id);
}
