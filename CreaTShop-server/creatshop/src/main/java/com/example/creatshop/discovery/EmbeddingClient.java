package com.example.creatshop.discovery;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class EmbeddingClient {
    public record Embeddings(String modelVersion, List<double[]> vectors) {}

    private final RestClient client;
    private final RestClient indexClient;
    private final boolean enabled;
    private final String modelVersion;
    private final int dimensions;

    public EmbeddingClient(@Value("${ai.enabled:false}") boolean enabled,
                           @Value("${ai.url:http://127.0.0.1:8001}") String url,
                           @Value("${ai.model-version:multilingual-e5-small-v1}") String modelVersion,
                           @Value("${ai.dimensions:384}") int dimensions,
                           @Value("${ai.timeout-ms:5000}") int timeout,
                           @Value("${ai.index-timeout-ms:60000}") int indexTimeout) {
        if (dimensions < 1 || dimensions > 4096 || modelVersion.isBlank() || modelVersion.length() > 120 || timeout < 1 || indexTimeout < 1)
            throw new IllegalArgumentException("Invalid embedding configuration");
        this.enabled = enabled;
        this.modelVersion = modelVersion;
        this.dimensions = dimensions;
        this.client = connection(url, timeout);
        this.indexClient = connection(url, indexTimeout);
    }

    private static RestClient connection(String url, int timeout) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Math.min(timeout, 2000));
        factory.setReadTimeout(timeout);
        return RestClient.builder().baseUrl(url).requestFactory(new BufferingClientHttpRequestFactory(factory)).build();
    }

    public boolean enabled() { return enabled; }
    public String version() { return modelVersion; }
    public int dimensions() { return dimensions; }

    public List<double[]> encode(List<String> texts, String kind) {
        if (!enabled) throw new IllegalStateException("AI_DISABLED");
        Embeddings response = (kind.equals("passage") ? indexClient : client).post().uri("/embed").body(Map.of("texts", texts, "kind", kind))
                .retrieve().body(Embeddings.class);
        if (response == null || !modelVersion.equals(response.modelVersion()) || response.vectors() == null
                || response.vectors().size() != texts.size()
                || response.vectors().stream().anyMatch(vector -> !Ranking.valid(vector, dimensions))) {
            throw new IllegalStateException("INVALID_EMBEDDINGS");
        }
        return response.vectors();
    }
}
