plugins {
    `kotlin-dsl`
}

repositories {
    gradlePluginPortal()
    mavenCentral()
}

kotlin {
    jvmToolchain(25)
}

dependencies {
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
