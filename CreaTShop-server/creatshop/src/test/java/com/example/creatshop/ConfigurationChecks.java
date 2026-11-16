package com.example.creatshop;

import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Map;
import java.util.Properties;
import java.util.zip.ZipFile;

public class ConfigurationChecks {
    public static void main(String[] args) throws Exception {
        byte[] publicConfig;
        try (var stream = ConfigurationChecks.class.getResourceAsStream("/application.properties")) {
            if (stream == null) throw new AssertionError("Public configuration is missing");
            publicConfig = stream.readAllBytes();
        }
        var properties = new Properties();
        properties.load(new java.io.ByteArrayInputStream(publicConfig));
        var example = new Properties();
        try (var stream = Files.newInputStream(Path.of("src/main/resources/application.properties.example"))) { example.load(stream); }
        assert properties.equals(example) : "Public defaults and the example must stay in sync";
        for (String key : properties.stringPropertyNames()) {
            if (key.matches("(?i).*(password|secret|api_key|client-id|tmn-code).*")) {
                if (!properties.getProperty(key).matches("\\$\\{[A-Z_]+:?}")) {
                    throw new AssertionError("Sensitive configuration must use an environment placeholder: " + key);
                }
            }
        }
        var defaults = environment(Map.of("spring.config.location", "classpath:/application.properties"));
        assert "validate".equals(defaults.getProperty("spring.jpa.hibernate.ddl-auto"));
        for (String key : new String[]{"auth.token.jwtSecret", "spring.datasource.password"}) {
            boolean rejected = false;
            try { defaults.getRequiredProperty(key); }
            catch (IllegalArgumentException expected) { rejected = true; }
            assert rejected : "Missing private configuration must not use a shared default: " + key;
        }
        var injected = environment(Map.of("spring.config.location", "classpath:/application.properties",
                "JWT_SECRET", "configuration-check-key", "SPRING_DATASOURCE_PASSWORD", "configuration-check-password"));
        assert "configuration-check-key".equals(injected.getProperty("auth.token.jwtSecret"));
        assert "configuration-check-password".equals(injected.getProperty("spring.datasource.password"));

        Path directory = Files.createTempDirectory("creatshop-config-check-");
        Path external = directory.resolve("application.properties");
        try {
            Files.writeString(external, "spring.datasource.password=external-check-password\nauth.token.jwtSecret=external-check-key\n", StandardCharsets.UTF_8);
            var local = environment(Map.of("spring.config.location", "classpath:/application.properties",
                    "spring.config.additional-location", directory.toUri().toString()));
            assert "external-check-password".equals(local.getProperty("spring.datasource.password"));
            assert "external-check-key".equals(local.getProperty("auth.token.jwtSecret"));
            assert "validate".equals(local.getProperty("spring.jpa.hibernate.ddl-auto"));
        } finally {
            Files.deleteIfExists(external);
            Files.deleteIfExists(directory);
        }
        if (args.length > 0) {
            try (var archive = new ZipFile(args[0])) {
                var entry = archive.getEntry("BOOT-INF/classes/application.properties");
                if (entry == null) throw new AssertionError("Packaged defaults missing");
                try (var stream = archive.getInputStream(entry)) {
                    assert Arrays.equals(publicConfig, stream.readAllBytes()) : "JAR configuration differs from public defaults";
                }
                assert archive.stream().noneMatch(item -> item.getName().contains("/config/application")
                        || item.getName().endsWith("/.env") || item.getName().contains("client_secret_")) : "Private config artifact found in JAR";
            }
        }
        System.out.println("PASS: public defaults, required secrets, environment injection and external configuration; no application database used.");
    }

    private static StandardEnvironment environment(Map<String, Object> configuration) {
        var environment = new StandardEnvironment();
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().addFirst(new MapPropertySource("configuration-check", configuration));
        ConfigDataEnvironmentPostProcessor.applyTo(environment);
        return environment;
    }
}
