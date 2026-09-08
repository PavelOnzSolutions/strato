plugins {
    `version-catalog`
    java
    idea
    id("solutions.onz.gradle.spring-boot-mvc-conventions")
    id("solutions.onz.gradle.openapi-generator")
    id("solutions.onz.gradle.code-quality-check")
    id("com.gorylenko.gradle-git-properties") version "2.5.4"
}

group = "solutions.onz.platform.strato.creator"
version = "1.3.0-rc1"
description = "strato-creator"

val semanticKernelVersion by extra("1.4.3")
val springAiVersion by extra("1.1.0")
val springCloudAzureVersion by extra("6.0.0")
val azureJavaSdkBomVersion by extra("1.3.3")

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

gitProperties {
    failOnNoGitDirectory = false
}

val springProfilesActive = mutableListOf<String>()

springProfilesActive +=
    if (project.hasProperty("prod")) {
        "prod"
    } else {
        "local"
    }

tasks.named<JavaExec>("bootRun") {
    args = listOf("--spring.profiles.active=${springProfilesActive.joinToString(",")}")
}

// Include OpenAPI generated sources
sourceSets {
    named("main") {
        java {
            srcDir("${layout.buildDirectory.get()}/openapi/src/main/java")
        }
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencyManagement {
    imports {
        mavenBom("com.microsoft.semantic-kernel:semantickernel-bom:$semanticKernelVersion")
        mavenBom("org.springframework.ai:spring-ai-bom:$springAiVersion")
        mavenBom("com.azure.spring:spring-cloud-azure-dependencies:$springCloudAzureVersion")
        mavenBom("com.azure:azure-sdk-bom:$azureJavaSdkBomVersion")
        mavenBom("io.mongock:mongock-bom:5.5.1")
    }
}

dependencies {
    // Switch to Spring MVC/Web + synchronous MongoDB and springdoc for MVC
    implementation(libs.bundles.springdoc.webmvc) {
        constraints {
            implementation("org.apache.commons:commons-lang3:3.18.0") {
                because("Mitigate CVE-2025-48924")
            }
        }
    }
    implementation("org.openapitools:jackson-databind-nullable:0.2.8")

    implementation("io.mongock:mongock-springboot-v3")
    implementation("io.mongock:mongodb-springdata-v4-driver")

    // https://mvnrepository.com/artifact/com.fasterxml.jackson.dataformat/jackson-dataformat-xml
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml:2.20.1")

    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-web")

    implementation("org.springframework.boot:spring-boot-starter-data-mongodb")
    implementation("com.jayway.jsonpath:json-path:2.9.0")

    implementation("org.springframework.security:spring-security-oauth2-jose")

    implementation("com.nimbusds:nimbus-jose-jwt:10.6")

    // BouncyCastle for robust PEM/PKCS#1/#8 parsing
    implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")

    implementation("com.azure:azure-identity")
    implementation("com.azure.resourcemanager:azure-resourcemanager")
    implementation("com.azure.resourcemanager:azure-resourcemanager-resources-bicep:1.0.0-beta.1")
    implementation("com.azure:azure-security-keyvault-secrets")

    implementation("com.microsoft.semantic-kernel:semantickernel-api") {
        constraints {
            implementation("org.apache.commons:commons-lang3:3.18.0") {
                because("Mitigate CVE-2025-48924")
            }
        }
    }
    implementation("com.microsoft.semantic-kernel:semantickernel-aiservices-openai")

    implementation("com.microsoft.graph:microsoft-graph:6.56.0")

    implementation("org.eclipse.jgit:org.eclipse.jgit:7.4.0.202509020913-r")

    implementation("org.springframework.ai:spring-ai-starter-mcp-client")
    implementation("org.springframework.ai:spring-ai-starter-mcp-server")
    implementation("org.springframework.boot:spring-boot-starter-websocket")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.ehcache:ehcache:3.10.8")
    implementation("javax.cache:cache-api:1.1.1")
    implementation("org.springframework.boot:spring-boot-starter-graphql")
    implementation("com.graphql-java:graphql-java-extended-scalars:22.0")
    testImplementation("org.springframework.graphql:spring-graphql-test")
    testImplementation("org.springframework:spring-webflux")

    compileOnly("org.projectlombok:lombok")
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    developmentOnly("org.springframework.boot:spring-boot-docker-compose")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
    annotationProcessor("org.projectlombok:lombok")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    runtimeOnly("io.micrometer:micrometer-registry-otlp")
    runtimeOnly("io.micrometer:micrometer-registry-prometheus")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
    tasks.withType<JacocoCoverageVerification>().configureEach {
        dependsOn("test")
    }
}

