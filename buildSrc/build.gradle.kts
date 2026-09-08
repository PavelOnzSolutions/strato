plugins {
    `kotlin-dsl`
}

repositories {
    gradlePluginPortal()
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-gradle-plugin:3.5.7")
    implementation("io.spring.gradle:dependency-management-plugin:1.1.7")
    implementation(libs.openapi.generator)
    implementation(libs.modernizer.plugin)
    implementation(libs.spotless.plugin) {
        constraints {
            implementation("org.apache.commons:commons-lang3:3.18.0") {
                because("Mitigate CVE-2025-48924")
            }
        }
    }
}