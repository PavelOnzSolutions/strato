plugins {
    `java-library`
    idea
}

java {
    toolchain {
        // Platform targets JDK 21 (virtual threads / Loom, ZGC). The foojay
        // resolver in settings.gradle.kts provisions it if not installed.
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

val junitVersion = "5.11.4"
// Keep this aligned with gradle/libs.versions.toml:lombok.
val lombokVersion = "1.18.46"

dependencies {
    testImplementation(platform("org.junit:junit-bom:$junitVersion"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    // Utilities
    compileOnly("org.projectlombok:lombok:$lombokVersion")
    testCompileOnly("org.projectlombok:lombok:$lombokVersion")
    annotationProcessor("org.projectlombok:lombok:$lombokVersion")
    testAnnotationProcessor("org.projectlombok:lombok:$lombokVersion")
}

tasks.withType<JavaCompile>().configureEach {
    options.compilerArgs.add("-parameters")
    options.encoding = "UTF-8"
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
    // ZGC keeps GC pauses sub-millisecond across the platform's JVM services.
    jvmArgs("-XX:+UseZGC")
}
