plugins {
    jacoco
    id("com.github.andygoossens.gradle-modernizer-plugin")
}

jacoco {
    toolVersion = "0.8.14"
}

tasks.withType<JacocoReport> {
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}