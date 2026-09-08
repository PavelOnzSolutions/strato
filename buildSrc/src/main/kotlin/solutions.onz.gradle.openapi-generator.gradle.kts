import org.openapitools.generator.gradle.plugin.tasks.GenerateTask

plugins {
    id("org.openapi.generator")
}

tasks.register("openApiGenerateSpring", GenerateTask::class) {
    generatorName.set("spring")
    inputSpec.set(layout.projectDirectory.file("src/main/resources/swagger/arborist.yaml").asFile.toURI().toString())
    outputDir.set("${layout.buildDirectory.get()}/openapi")
    apiPackage.set("com.fidoo.devops.tools.arborist.api.api")
    modelPackage.set("com.fidoo.devops.tools.arborist.service.api.dto")
    apiFilesConstrainedTo.set(listOf(""))
    modelFilesConstrainedTo.set(listOf(""))
    supportingFilesConstrainedTo.set(listOf("ApiUtil.java"))
    configOptions.set(
        mapOf(
            "delegatePattern" to "true",
            "title" to "arborist-service",
            "useSpringBoot3" to "true",
            "withXml" to "true",
            "reactive" to "true"
        )
    )
    validateSpec.set(true)
    importMappings.set(mapOf("Problem" to "org.springframework.http.ProblemDetail"))
}

tasks.register("openapiGenerateAngular", GenerateTask::class) {
    outputs.upToDateWhen { false }
    generatorName.set("typescript-angular")
    inputSpec.set(layout.projectDirectory.file("src/main/resources/swagger/arborist.yaml").asFile.toURI().toString())
    outputDir.set("${layout.buildDirectory.get()}/openapi-angular")

    apiPackage.set("services")
    modelPackage.set("models")
    additionalProperties.set(
        mapOf(
            "ngVersion" to "20.1.5",   // pick Angular version you need
            "modelSuffix" to "Model"
        )
    )
    validateSpec.set(true)
}


tasks.register("openApiGenerateNode", GenerateTask::class) {
    generatorName.set("typescript-node")
    inputSpec.set(layout.projectDirectory.file("src/main/resources/swagger/arborist.yaml").asFile.toURI().toString())
    outputDir.set("${layout.buildDirectory.get()}/openapi-node")
    apiPackage.set("services")
    modelPackage.set("models")
    additionalProperties.set(
        mapOf(
            "supportsES6" to "true",
            "npmName" to "arborist-api-client",
            "npmVersion" to "1.0.0"
        )
    )
    validateSpec.set(true)
}


// Ensure Java compilation depends on OpenAPI generation
tasks.named("compileJava").configure {
    //dependsOn("openApiGenerateNode")
}
