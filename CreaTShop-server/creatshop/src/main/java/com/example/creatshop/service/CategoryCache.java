package com.example.creatshop.service;

import com.example.creatshop.domain.dto.response.CategoryTypeResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Duration;
import java.util.List;
import java.util.function.Supplier;

@Component
@ConditionalOnProperty(name = "category.cache.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class CategoryCache {
    private static final String KEY = "creatshop:categories:v1";
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final TypeReference<List<CategoryTypeResponse>> TYPE = new TypeReference<>() {};

    private final StringRedisTemplate redis;
    private final ObjectMapper json;

    public List<CategoryTypeResponse> get(Supplier<List<CategoryTypeResponse>> load) {
        try {
            String cached = redis.opsForValue().get(KEY);
            if (cached != null) {
                List<CategoryTypeResponse> categories = json.readValue(cached, TYPE);
                if (categories != null) {
                    return categories;
                }
            }
        } catch (DataAccessException ex) {
            log.debug("Category cache unavailable", ex);
            return load.get();
        } catch (JsonProcessingException ex) {
            log.warn("Invalid category cache JSON");
        }

        // ponytail: TTL bounds stale entries after a concurrent fill or failed eviction.
        List<CategoryTypeResponse> categories = load.get();
        try {
            redis.opsForValue().set(KEY, json.writeValueAsString(categories), TTL);
        } catch (DataAccessException | JsonProcessingException ex) {
            log.warn("Could not save category cache: {}", ex.getClass().getSimpleName());
        }
        return categories;
    }

    @TransactionalEventListener
    public void evict(Changed event) {
        try {
            redis.delete(KEY);
        } catch (DataAccessException ex) {
            log.warn("Could not evict category cache: {}", ex.getClass().getSimpleName());
        }
    }

    public record Changed() {}
}
