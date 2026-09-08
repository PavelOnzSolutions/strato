package solutions.onz.platform.strato.creator.services.dto;

/** Kind of Entra identity behind a credential. Serialised by Jackson as the enum name. */
public enum CredentialIdentityType {
    USER,
    SERVICE_PRINCIPAL
}
