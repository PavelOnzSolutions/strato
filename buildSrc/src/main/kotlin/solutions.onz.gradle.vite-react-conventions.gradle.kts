import org.gradle.api.tasks.Delete

plugins {
    base
}

val npmExecutable = if (System.getProperty("os.name").lowercase().contains("windows")) {
    "npm.cmd"
} else {
    "npm"
}

val packageJson = layout.projectDirectory.file("package.json")
val packageLockJson = layout.projectDirectory.file("package-lock.json")
val nodeModules = layout.projectDirectory.dir("node_modules")
val srcDirectory = layout.projectDirectory.dir("src")
val publicDirectory = layout.projectDirectory.dir("public")
val distDirectory = layout.projectDirectory.dir("dist")

val npmInstall = tasks.register<Exec>("npmInstall") {
    group = LifecycleBasePlugin.BUILD_GROUP
    description = "Install npm dependencies for ${project.name}."
    workingDir = projectDir

    inputs.file(packageJson)
        .withPropertyName("packageJson")
    if (packageLockJson.asFile.exists()) {
        inputs.file(packageLockJson)
            .withPropertyName("packageLockJson")
    }
    outputs.dir(nodeModules)
        .withPropertyName("nodeModules")

    commandLine(
        npmExecutable,
        if (packageLockJson.asFile.exists()) "ci" else "install",
    )
}

val npmLint = tasks.register<Exec>("npmLint") {
    group = LifecycleBasePlugin.VERIFICATION_GROUP
    description = "Run npm lint for ${project.name} when the package defines it."
    workingDir = projectDir
    dependsOn(npmInstall)

    inputs.file(packageJson)
        .withPropertyName("packageJson")
    inputs.dir(srcDirectory)
        .withPropertyName("src")
        .optional()

    commandLine(npmExecutable, "run", "lint", "--if-present")
}

val npmTest = tasks.register<Exec>("npmTest") {
    group = LifecycleBasePlugin.VERIFICATION_GROUP
    description = "Run npm tests for ${project.name} when the package defines them."
    workingDir = projectDir
    dependsOn(npmInstall)

    inputs.file(packageJson)
        .withPropertyName("packageJson")
    inputs.dir(srcDirectory)
        .withPropertyName("src")
        .optional()

    commandLine(npmExecutable, "run", "test", "--if-present")
}

val npmRunDev = tasks.register<Exec>("npmRunDev") {
    group = LifecycleBasePlugin.BUILD_GROUP
    description = "Run npm dev for ${project.name} when the package defines it."
    workingDir = projectDir
    dependsOn(npmInstall)

    inputs.file(packageJson)
        .withPropertyName("packageJson")
    inputs.dir(srcDirectory)
        .withPropertyName("src")
        .optional()

    commandLine(npmExecutable, "run", "dev", "--if-present")
}

val npmBuild = tasks.register<Exec>("npmBuild") {
    group = LifecycleBasePlugin.BUILD_GROUP
    description = "Build the Vite/React web app for ${project.name}."
    workingDir = projectDir
    dependsOn(npmInstall)

    inputs.file(packageJson)
        .withPropertyName("packageJson")
    if (packageLockJson.asFile.exists()) {
        inputs.file(packageLockJson)
            .withPropertyName("packageLockJson")
    }
    inputs.files(
        "index.html",
        "tsconfig.json",
        "tsconfig.app.json",
        "tsconfig.node.json",
        "vite.config.ts",
    )
        .withPropertyName("configuration")
        .ignoreEmptyDirectories()
    inputs.dir(srcDirectory)
        .withPropertyName("src")
        .optional()
    inputs.dir(publicDirectory)
        .withPropertyName("public")
        .optional()
    outputs.dir(distDirectory)
        .withPropertyName("dist")

    commandLine(npmExecutable, "run", "build")
}

tasks.register("test") {
    group = LifecycleBasePlugin.VERIFICATION_GROUP
    description = "Run ${project.name} web tests."
    dependsOn(npmTest)
}

tasks.named("check") {
    dependsOn(npmLint, npmTest)
}

tasks.named("assemble") {
    dependsOn(npmBuild)
}

tasks.named<Delete>("clean") {
    delete(distDirectory)
}

val dockerImageName = "fobot/${project.name}:${project.version}"

tasks.register<Exec>("dockerBuildImage") {
    group = "docker"
    description = "Build the ${project.name} Docker image."
    workingDir = projectDir
    dependsOn(npmBuild)
    commandLine(
        "docker",
        "build",
        "-t",
        dockerImageName,
        ".",
    )
}
