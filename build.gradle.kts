import java.io.File
import java.util.Locale
import javax.xml.parsers.DocumentBuilderFactory
import org.gradle.api.tasks.testing.Test
import org.w3c.dom.Element

allprojects {
    group = "solutions.onz.platform.demon"
    version = "1.0.0"
}

data class TestCaseSummary(
    val module: String,
    val suite: String,
    val className: String,
    val methodName: String,
    val tests: Int,
    val failures: Int,
    val errors: Int,
    val skipped: Int,
    val time: Double,
    val failureMessage: String?,
    val failureDetail: String?,
)

data class TestClassSummary(
    val id: String,
    val module: String,
    val className: String,
    val tests: Int,
    val failures: Int,
    val errors: Int,
    val skipped: Int,
    val time: Double,
    val methods: List<TestCaseSummary>,
)

fun String.htmlEscaped(): String =
    replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")

fun Element.intAttribute(name: String): Int =
    getAttribute(name).takeIf { it.isNotBlank() }?.toIntOrNull() ?: 0

fun Element.doubleAttribute(name: String): Double =
    getAttribute(name).takeIf { it.isNotBlank() }?.toDoubleOrNull() ?: 0.0

fun Element.childElementCount(name: String): Int =
    getElementsByTagName(name).length

fun Element.firstChildElement(name: String): Element? {
    val nodes = getElementsByTagName(name)
    return if (nodes.length > 0) nodes.item(0) as? Element else null
}

fun parseJUnitTestCases(module: String, xmlFile: File): List<TestCaseSummary> {
    val documentBuilder = DocumentBuilderFactory.newInstance().apply {
        setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
        setFeature("http://xml.org/sax/features/external-general-entities", false)
        setFeature("http://xml.org/sax/features/external-parameter-entities", false)
    }.newDocumentBuilder()

    val document = documentBuilder.parse(xmlFile)
    val suites = when (document.documentElement.tagName) {
        "testsuite" -> listOf(document.documentElement)
        "testsuites" -> {
            val nodes = document.documentElement.getElementsByTagName("testsuite")
            (0 until nodes.length).mapNotNull { nodes.item(it) as? Element }
        }
        else -> emptyList()
    }

    return suites.flatMap { suite ->
        val suiteName = suite.getAttribute("name").ifBlank { xmlFile.nameWithoutExtension }
        val testCaseNodes = suite.getElementsByTagName("testcase")
        (0 until testCaseNodes.length).mapNotNull { testCaseNodes.item(it) as? Element }
            .map { testCase ->
                val failures = testCase.childElementCount("failure")
                val errors = testCase.childElementCount("error")
                val skipped = testCase.childElementCount("skipped")
                val failureNode = testCase.firstChildElement("failure")
                    ?: testCase.firstChildElement("error")
                TestCaseSummary(
                    module = module,
                    suite = suiteName,
                    className = testCase.getAttribute("classname").ifBlank { suiteName },
                    methodName = testCase.getAttribute("name").ifBlank { "unnamed test" },
                    tests = 1,
                    failures = failures,
                    errors = errors,
                    skipped = skipped,
                    time = testCase.doubleAttribute("time"),
                    failureMessage = failureNode?.getAttribute("message")?.takeIf { it.isNotBlank() },
                    failureDetail = failureNode?.textContent?.trim()?.takeIf { it.isNotBlank() },
                )
            }
    }
}

fun testStatus(failures: Int, errors: Int, skipped: Int): String =
    when {
        errors > 0 -> "Error"
        failures > 0 -> "Failed"
        skipped > 0 -> "Skipped"
        else -> "Passed"
    }

fun statusClass(failures: Int, errors: Int, skipped: Int): String =
    when {
        errors > 0 || failures > 0 -> "bad"
        skipped > 0 -> "muted"
        else -> "ok"
    }



val consolidatedTestReport = tasks.register("consolidatedTestReport") {
    group = LifecycleBasePlugin.VERIFICATION_GROUP
    description = "Create a consolidated HTML report from all JVM and pytest JUnit XML results."

    val reportDirectory = layout.buildDirectory.dir("reports/tests/consolidated")
    val reportFile = reportDirectory.map { it.file("index.html") }

    inputs.files(provider {
        subprojects.flatMap { subproject ->
            listOf(
                subproject.layout.buildDirectory.dir("test-results/test").get().asFileTree.matching {
                    include("TEST-*.xml")
                },
                subproject.layout.buildDirectory.dir("test-results/pyTest").get().asFileTree.matching {
                    include("TEST-*.xml")
                },
                subproject.layout.buildDirectory.dir("test-results/vitest").get().asFileTree.matching {
                    include("TEST-*.xml")
                },
            )
        }
    })
    outputs.file(reportFile)

    doLast {
        val xmlResults = subprojects.flatMap { subproject ->
            listOf(
                subproject.layout.buildDirectory.dir("test-results/test").get().asFile,
                subproject.layout.buildDirectory.dir("test-results/pyTest").get().asFile,
                subproject.layout.buildDirectory.dir("test-results/vitest").get().asFile,
            ).flatMap { resultDirectory ->
                fileTree(resultDirectory) {
                    include("TEST-*.xml")
                }.files.map { subproject.name to it }
            }
        }.sortedWith(compareBy({ it.first }, { it.second.name }))

        val testCases = xmlResults.flatMap { (module, xmlFile) ->
            parseJUnitTestCases(module, xmlFile)
        }
        val classes = testCases
            .groupBy { it.module to it.className }
            .entries
            .sortedWith(compareBy({ it.key.first }, { it.key.second }))
            .mapIndexed { index, entry ->
                val methods = entry.value.sortedWith(compareBy({ it.suite }, { it.methodName }))
                TestClassSummary(
                    id = "class-$index",
                    module = entry.key.first,
                    className = entry.key.second,
                    tests = methods.sumOf { it.tests },
                    failures = methods.sumOf { it.failures },
                    errors = methods.sumOf { it.errors },
                    skipped = methods.sumOf { it.skipped },
                    time = methods.sumOf { it.time },
                    methods = methods,
                )
            }

        val totalTests = classes.sumOf { it.tests }
        val totalFailures = classes.sumOf { it.failures }
        val totalErrors = classes.sumOf { it.errors }
        val totalSkipped = classes.sumOf { it.skipped }
        val totalTime = classes.sumOf { it.time }

        val outputFile = reportFile.get().asFile
        outputFile.parentFile.mkdirs()
        outputFile.writeText(
            """
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <title>Consolidated Test Report</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 32px; color: #1f2933; }
                h1 { margin: 0 0 24px; font-size: 28px; }
                .summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
                .metric { border: 1px solid #d9e2ec; border-radius: 6px; padding: 12px 16px; min-width: 120px; }
                .metric strong { display: block; font-size: 22px; margin-bottom: 4px; }
                table { border-collapse: collapse; width: 100%; table-layout: fixed; }
                th, td { border-bottom: 1px solid #d9e2ec; padding: 8px 10px; text-align: left; }
                th { background: #f0f4f8; font-weight: 600; }
                td { overflow-wrap: anywhere; }
                .number { text-align: right; width: 72px; }
                .time { text-align: right; width: 92px; }
                .module { width: 180px; }
                .status { width: 96px; }
                .test-name { width: auto; }
                .class-row { background: #fbfcfd; font-weight: 600; }
                .method-row td { color: #334e68; }
                .method-name { padding-left: 38px; }
                .suite { color: #627d98; display: block; font-size: 12px; margin-top: 2px; }
                button.disclosure {
                  appearance: none;
                  background: transparent;
                  border: 0;
                  color: inherit;
                  cursor: pointer;
                  font: inherit;
                  font-weight: 600;
                  padding: 0;
                  text-align: left;
                }
                button.disclosure::before {
                  content: ">";
                  display: inline-block;
                  margin-right: 8px;
                  transition: transform 120ms ease;
                }
                button.disclosure[aria-expanded="true"]::before {
                  transform: rotate(90deg);
                }
                .bad { color: #b42318; font-weight: 600; }
                .ok { color: #1f7a4d; font-weight: 600; }
                .muted { color: #627d98; }
                .detail-row td { padding-left: 38px; padding-top: 4px; padding-bottom: 12px; }
                .failure-message { font-weight: 600; color: #b42318; margin-bottom: 6px; }
                .failure-detail {
                  background: #fff5f5;
                  border: 1px solid #f3d0d0;
                  border-radius: 4px;
                  padding: 10px 12px;
                  margin: 0;
                  font-family: "SFMono-Regular", Consolas, monospace;
                  font-size: 12px;
                  white-space: pre-wrap;
                  overflow-wrap: anywhere;
                  max-height: 320px;
                  overflow-y: auto;
                }
              </style>
              <script>
                function toggleClassRows(button) {
                  const expanded = button.getAttribute("aria-expanded") === "true";
                  button.setAttribute("aria-expanded", String(!expanded));
                  document.querySelectorAll('[data-parent="' + button.dataset.target + '"]').forEach(function(row) {
                    row.hidden = expanded;
                  });
                }
              </script>
            </head>
            <body>
              <h1>Consolidated Test Report</h1>
              <section class="summary">
                <div class="metric"><strong>$totalTests</strong><span>Tests</span></div>
                <div class="metric"><strong class="${if (totalFailures > 0) "bad" else ""}">$totalFailures</strong><span>Failures</span></div>
                <div class="metric"><strong class="${if (totalErrors > 0) "bad" else ""}">$totalErrors</strong><span>Errors</span></div>
                <div class="metric"><strong>$totalSkipped</strong><span>Skipped</span></div>
                <div class="metric"><strong>${String.format(Locale.US, "%.3f", totalTime)}s</strong><span>Time</span></div>
              </section>
              <table>
                <thead>
                  <tr>
                    <th class="module">Module</th>
                    <th class="test-name">Class / method</th>
                    <th class="status">Status</th>
                    <th class="number">Tests</th>
                    <th class="number">Failures</th>
                    <th class="number">Errors</th>
                    <th class="number">Skipped</th>
                    <th class="time">Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${classes.joinToString(separator = "\n") { testClass ->
                val classStatusClass = statusClass(testClass.failures, testClass.errors, testClass.skipped)
                """
                    <tr class="class-row">
                      <td>${testClass.module.htmlEscaped()}</td>
                      <td>
                        <button class="disclosure" type="button" data-target="${testClass.id}" aria-expanded="false" onclick="toggleClassRows(this)">
                          ${testClass.className.htmlEscaped()}
                        </button>
                      </td>
                      <td class="$classStatusClass">${testStatus(testClass.failures, testClass.errors, testClass.skipped)}</td>
                      <td class="number">${testClass.tests}</td>
                      <td class="number ${if (testClass.failures > 0) "bad" else ""}">${testClass.failures}</td>
                      <td class="number ${if (testClass.errors > 0) "bad" else ""}">${testClass.errors}</td>
                      <td class="number">${testClass.skipped}</td>
                      <td class="time">${String.format(Locale.US, "%.3f", testClass.time)}s</td>
                    </tr>
                    ${testClass.methods.joinToString(separator = "\n") { method ->
                    val methodStatusClass = statusClass(method.failures, method.errors, method.skipped)
                    """
                        <tr class="method-row" data-parent="${testClass.id}" hidden>
                          <td>${method.module.htmlEscaped()}</td>
                          <td class="method-name">
                            ${method.methodName.htmlEscaped()}
                            <span class="suite">${method.suite.htmlEscaped()}</span>
                          </td>
                          <td class="$methodStatusClass">${testStatus(method.failures, method.errors, method.skipped)}</td>
                          <td class="number">${method.tests}</td>
                          <td class="number ${if (method.failures > 0) "bad" else ""}">${method.failures}</td>
                          <td class="number ${if (method.errors > 0) "bad" else ""}">${method.errors}</td>
                          <td class="number">${method.skipped}</td>
                          <td class="time">${String.format(Locale.US, "%.3f", method.time)}s</td>
                        </tr>
                        ${if (method.failures > 0 || method.errors > 0) {
                        """
                            <tr class="detail-row" data-parent="${testClass.id}" hidden>
                              <td colspan="8">
                                ${method.failureMessage?.let {
                            """<div class="failure-message">${it.htmlEscaped()}</div>"""
                        } ?: ""}
                                <pre class="failure-detail">${(method.failureDetail ?: "No failure details available.").htmlEscaped()}</pre>
                              </td>
                            </tr>
                            """.trimIndent()
                    } else ""}
                        """.trimIndent()
                }}
                    """.trimIndent()
            }.ifBlank {
                """<tr><td colspan="8" class="muted">No JUnit XML results found.</td></tr>"""
            }}
                </tbody>
              </table>
            </body>
            </html>
            """.trimIndent(),
        )
    }
}

val cleanReport = tasks.register<Delete>("cleanReport") {
    group = LifecycleBasePlugin.BUILD_GROUP
    description = "Cleans consolidated reports."
    delete(layout.buildDirectory.dir("reports/tests/consolidated"))
}

val test = tasks.register("test") {
    group = LifecycleBasePlugin.VERIFICATION_GROUP
    description = "Run every subproject test and pyTest task, then create the consolidated HTML report."
    finalizedBy(consolidatedTestReport)
}

val dockerBuildImages = tasks.register("dockerBuildImages") {
    group = "docker"
    description = "Build all Docker images configured by application subprojects."
}

val cleanGlobal = tasks.register<Delete>("clean") {
    group = LifecycleBasePlugin.BUILD_GROUP
    description = "Cleans consolidated reports, global and all generated artifacts of subprojects."
    finalizedBy("cleanReport")
}

gradle.projectsEvaluated {
    val allTestTasks = subprojects.flatMap { subproject ->
        listOfNotNull(
            subproject.tasks.findByName("test"),
            subproject.tasks.findByName("pyTest"),
        )
    }

    test.configure {
        dependsOn(allTestTasks)
    }

    consolidatedTestReport.configure {
        mustRunAfter(allTestTasks)
    }

    dockerBuildImages.configure {
        dependsOn(subprojects.mapNotNull { it.tasks.findByName("dockerBuildImage") })
    }

    cleanGlobal.configure {
        dependsOn(subprojects.mapNotNull { it.tasks.findByName("clean") })
    }

    cleanReport.configure {
        mustRunAfter(cleanGlobal)
    }
}

subprojects {
    tasks.withType<Test>().configureEach {
        reports.junitXml.required.set(true)
    }
}
