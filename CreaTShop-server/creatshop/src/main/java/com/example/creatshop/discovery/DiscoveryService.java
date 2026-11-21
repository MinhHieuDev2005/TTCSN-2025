package com.example.creatshop.discovery;

import com.example.creatshop.domain.dto.response.ProductResponse;
import com.example.creatshop.domain.dto.response.ProductVariantResponse;
import com.example.creatshop.repository.CategoryRepository;
import com.example.creatshop.service.ProductService;
import com.example.creatshop.exception.BadRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
public class DiscoveryService {
    public record Result(List<ProductResponse> items, long totalItems, int page, int size,
                         String mode, String fallbackReason, Map<String, Object> appliedFilters) {}
    private record Document(ProductResponse product, String text, String hash) {}
    private record Vector(String hash, double[] values) {}
    private record Scored(ProductResponse product, double score) {}

    private static final Logger log = LoggerFactory.getLogger(DiscoveryService.class);
    private final ProductService products;
    private final CategoryRepository categories;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final EmbeddingClient embeddings;
    private final TransactionTemplate transactions;
    private final AtomicBoolean indexing = new AtomicBoolean();
    private final ExecutorService worker = Executors.newSingleThreadExecutor(task -> {
        Thread thread = new Thread(task, "product-embedding-index");
        thread.setDaemon(true);
        return thread;
    });
    private volatile String indexError;
    private volatile Instant lastIndexAt;
    private volatile Instant retryAiAt = Instant.EPOCH;

    public DiscoveryService(ProductService products, CategoryRepository categories, JdbcTemplate jdbc,
                            ObjectMapper json, EmbeddingClient embeddings, PlatformTransactionManager manager) {
        this.products = products;
        this.categories = categories;
        this.jdbc = jdbc;
        this.json = json;
        this.embeddings = embeddings;
        this.transactions = new TransactionTemplate(manager);
    }

    private List<Document> catalog() {
        // ponytail: scan a single-instance thesis catalog; add indexed retrieval when measured catalog latency exceeds the budget.
        return transactions.execute(status -> {
            var names = categories.findAll().stream().collect(Collectors.toMap(category -> category.getId(),
                    category -> String.join(" ", safe(category.getName()), safe(category.getDescription()), String.valueOf(category.getType()))));
            return products.getProducts().getData().stream().map(product -> {
                String colors = product.getVariants().stream().map(ProductVariantResponse::getColor).filter(Objects::nonNull)
                        .distinct().sorted().collect(Collectors.joining(" "));
                String text = String.join(". ", safe(product.getName()), names.getOrDefault(product.getCategoryId(), ""),
                        safe(product.getDescription()), safe(product.getMaterial()), safe(product.getStyle()), safe(product.getOccasion()), colors);
                return new Document(product, text, hash(text));
            }).toList();
        });
    }

    private static String safe(String value) { return value == null ? "" : value.trim(); }

    private static String hash(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private Map<Integer, Vector> vectors(List<Document> catalog) {
        Map<Integer, String> hashes = catalog.stream().collect(Collectors.toMap(item -> item.product().getId(), Document::hash));
        Map<Integer, Vector> result = new HashMap<>();
        jdbc.query("SELECT product_id, content_hash, embedding FROM product_embeddings WHERE model_version = ?",
                row -> {
                    int id = row.getInt("product_id");
                    if (Objects.equals(hashes.get(id), row.getString("content_hash"))) {
                        try {
                            double[] values = json.readValue(row.getString("embedding"), double[].class);
                            if (Ranking.valid(values, embeddings.dimensions())) result.put(id, new Vector(row.getString("content_hash"), values));
                        } catch (Exception ignored) {
                            log.warn("Invalid stored embedding for product {}", id);
                        }
                    }
                }, embeddings.version());
        return result;
    }

    @Scheduled(fixedDelayString = "${ai.index-interval-ms:60000}", initialDelayString = "${ai.index-initial-delay-ms:15000}")
    public void scheduleIndex() {
        if (embeddings.enabled()) startIndex();
    }

    public boolean startIndex() {
        if (!embeddings.enabled() || !indexing.compareAndSet(false, true)) return false;
        worker.submit(() -> {
            try {
                var documents = catalog();
                var existing = vectors(documents);
                var pending = documents.stream().filter(item -> !existing.containsKey(item.product().getId())).toList();
                for (int offset = 0; offset < pending.size(); offset += 16) {
                    var batch = pending.subList(offset, Math.min(offset + 16, pending.size()));
                    var encoded = embeddings.encode(batch.stream().map(Document::text).toList(), "passage");
                    var current = catalog().stream().collect(Collectors.toMap(item -> item.product().getId(), Document::hash));
                    for (int index = 0; index < batch.size(); index++) {
                        var document = batch.get(index);
                        if (!Objects.equals(current.get(document.product().getId()), document.hash())) continue;
                        String vector = json.writeValueAsString(encoded.get(index));
                        transactions.executeWithoutResult(status -> {
                            int updated = jdbc.update("UPDATE product_embeddings SET content_hash=?, embedding=?, model_version=?, updated_at=? WHERE product_id=?",
                                    document.hash(), vector, embeddings.version(), Timestamp.from(Instant.now()), document.product().getId());
                            if (updated == 0) jdbc.update("INSERT INTO product_embeddings (product_id, content_hash, embedding, model_version, updated_at) VALUES (?, ?, ?, ?, ?)",
                                    document.product().getId(), document.hash(), vector, embeddings.version(), Timestamp.from(Instant.now()));
                        });
                    }
                }
                indexError = null;
                lastIndexAt = Instant.now();
            } catch (Exception exception) {
                indexError = "INDEX_FAILED";
                log.warn("Product embedding indexing failed: {}", exception.getClass().getSimpleName());
            } finally {
                indexing.set(false);
            }
        });
        return true;
    }

    public Map<String, Object> status() {
        var documents = catalog();
        int indexed = vectors(documents).size();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("enabled", embeddings.enabled());
        result.put("modelVersion", embeddings.version());
        result.put("running", indexing.get());
        result.put("total", documents.size());
        result.put("indexed", indexed);
        result.put("pending", documents.size() - indexed);
        result.put("lastError", indexError);
        result.put("lastCompletedAt", lastIndexAt);
        return result;
    }

    public Result search(String query, List<Integer> categoryIds, BigDecimal minPrice, BigDecimal maxPrice,
                         String color, String sizeFilter, boolean inStock, String sort, String strategy, int page, int size) {
        var budget = SearchBudget.parse(query);
        var variantIntent = SearchVariant.parse(query);
        String effectiveColor = SearchVariant.canonicalColor(color.isBlank() ? variantIntent.color() : color);
        String effectiveSize = sizeFilter.isBlank() ? variantIntent.size() : sizeFilter;
        int minimumQuantity = Math.max(inStock ? 1 : 0, variantIntent.quantity());
        var audiences = SearchAudience.parse(query);
        Set<Integer> audienceCategories = audiences.isEmpty() ? Set.of() : categories.findAll().stream()
                .filter(category -> audiences.contains(category.getType())).map(category -> category.getId()).collect(Collectors.toSet());
        BigDecimal effectiveMin = minPrice != null ? minPrice : budget.minPrice();
        BigDecimal effectiveMax = maxPrice != null ? maxPrice : budget.maxPrice();
        if (query.length() > 500 || page < 1 || size < 1 || size > 60
                || color.length() > 100 || sizeFilter.length() > 50 || (categoryIds != null && categoryIds.size() > 100)
                || (effectiveMin != null && effectiveMin.signum() < 0) || (effectiveMax != null && effectiveMax.signum() < 0)
                || (effectiveMin != null && effectiveMax != null && effectiveMin.compareTo(effectiveMax) > 0)
                || !Set.of("relevance", "asc", "desc").contains(sort)
                || !Set.of("keyword", "semantic", "hybrid").contains(strategy)) throw new BadRequestException("exception.discovery.invalid-search");
        var documents = catalog().stream().filter(item -> {
            var product = item.product();
            if (!audiences.isEmpty() && !audienceCategories.contains(product.getCategoryId())) return false;
            if (categoryIds != null && !categoryIds.isEmpty() && !categoryIds.contains(product.getCategoryId())) return false;
            if (effectiveMin != null && product.getPrice().compareTo(effectiveMin) < 0) return false;
            if (effectiveMax != null && product.getPrice().compareTo(effectiveMax) > 0) return false;
            return (minimumQuantity == 0 && effectiveColor.isBlank() && effectiveSize.isBlank()) || product.getVariants().stream().anyMatch(variant ->
                    (minimumQuantity == 0 || (variant.getQuantity() != null && variant.getQuantity() >= minimumQuantity))
                    && (effectiveColor.isBlank() || effectiveColor.equals(SearchVariant.canonicalColor(variant.getColor())))
                    && (effectiveSize.isBlank() || effectiveSize.equalsIgnoreCase(variant.getSize())));
        }).toList();
        Map<Integer, Vector> available = Map.of();
        double[] queryVector = null;
        String reason = null;
        if (!query.isBlank() && !documents.isEmpty() && !strategy.equals("keyword")) {
            if (!embeddings.enabled()) reason = "AI_DISABLED";
            else {
                available = vectors(documents);
                if (available.size() != documents.size()) reason = "INDEX_NOT_READY";
                else if (Instant.now().isBefore(retryAiAt)) reason = "AI_UNAVAILABLE";
                else {
                    try { queryVector = embeddings.encode(List.of(query), "query").get(0); }
                    catch (Exception exception) {
                        retryAiAt = Instant.now().plusSeconds(30);
                        reason = "AI_UNAVAILABLE";
                    }
                }
            }
        }
        List<Scored> scored = new ArrayList<>();
        for (var document : documents) {
            double lexical = Ranking.lexical(query, document.text());
            double score = queryVector == null ? lexical
                    : strategy.equals("semantic") ? Ranking.cosine(queryVector, available.get(document.product().getId()).values())
                    : 0.8 * Ranking.cosine(queryVector, available.get(document.product().getId()).values()) + 0.2 * lexical;
            if (query.isBlank() || queryVector != null || lexical > 0) scored.add(new Scored(document.product(), score));
        }
        Comparator<Scored> comparator = Comparator.comparingDouble(Scored::score).reversed();
        if (query.isBlank() && sort.equals("relevance")) comparator = Comparator.<Scored, Boolean>comparing(item ->
                item.product().getVariants().stream().anyMatch(variant -> variant.getQuantity() != null && variant.getQuantity() > 0)).reversed();
        if (sort.equals("asc")) comparator = Comparator.comparing(item -> item.product().getPrice());
        if (sort.equals("desc")) comparator = Comparator.<Scored, BigDecimal>comparing(item -> item.product().getPrice()).reversed();
        scored.sort(comparator.thenComparing(item -> item.product().getId(), Comparator.reverseOrder()));
        var result = page(scored, page, size, query.isBlank() ? "catalog" : queryVector == null ? "keyword" : strategy, reason);
        Map<String, Object> filters = new LinkedHashMap<>();
        if (effectiveMin != null) filters.put("minPrice", effectiveMin);
        if (effectiveMax != null) filters.put("maxPrice", effectiveMax);
        filters.put("inStock", minimumQuantity > 0);
        filters.put("color", effectiveColor);
        filters.put("size", effectiveSize);
        filters.put("minQuantity", minimumQuantity);
        filters.put("categoryIds", categoryIds == null ? List.of() : categoryIds);
        filters.put("audiences", audiences.stream().map(Enum::name).sorted().toList());
        return new Result(result.items(), result.totalItems(), page, size, result.mode(), result.fallbackReason(), filters);
    }

    public void view(String username, int productId) {
        String userId = userId(username);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM products WHERE id=?", Integer.class, productId) == 0)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
        long bucket = Instant.now().getEpochSecond() / 1800;
        String eventId = hash(userId + ":" + productId + ":" + bucket);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM user_interactions WHERE event_id=?", Integer.class, eventId) > 0) return;
        if (jdbc.queryForObject("SELECT COUNT(*) FROM user_interactions WHERE user_id=? AND occurred_at>=?", Integer.class,
                userId, Timestamp.from(Instant.now().minusSeconds(60))) >= 60)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS);
        try {
            jdbc.update("INSERT INTO user_interactions (event_id, user_id, product_id, event_type, occurred_at) VALUES (?, ?, ?, 'VIEW', ?)",
                    eventId, userId, productId, Timestamp.from(Instant.now()));
        } catch (org.springframework.dao.DuplicateKeyException ignored) {
            return;
        }
    }

    private String userId(String username) {
        var ids = jdbc.queryForList("SELECT id FROM users WHERE username=?", String.class, username);
        if (ids.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
        return ids.get(0);
    }

    @Scheduled(fixedDelay = 86400000, initialDelay = 3600000)
    public void purgeViews() {
        jdbc.update("DELETE FROM user_interactions WHERE occurred_at<?", Timestamp.from(Instant.now().minusSeconds(90L * 86400)));
    }

    public Result recommendations(String username, Integer similarTo, int limit) {
        if (limit < 1 || limit > 24) throw new BadRequestException("exception.discovery.invalid-search");
        var documents = catalog();
        if (similarTo != null && documents.stream().noneMatch(item -> item.product().getId().equals(similarTo)))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
        Map<Integer, Double> signals = new HashMap<>();
        if (similarTo != null) signals.put(similarTo, 1.0);
        else if (username != null) {
            String userId = userId(username);
            jdbc.query("SELECT product_id, MAX(occurred_at) AS latest FROM user_interactions WHERE user_id=? AND occurred_at>=? GROUP BY product_id",
                    row -> {
                        double days = Math.max(0, (Instant.now().toEpochMilli() - row.getTimestamp("latest").getTime()) / 86400000.0);
                        signals.put(row.getInt("product_id"), Math.exp(-days / 30.0));
                    }, userId, Timestamp.from(Instant.now().minusSeconds(90L * 86400)));
            jdbc.query("SELECT ci.product_id FROM cart_items ci JOIN users u ON u.cart_id=ci.cart_id WHERE u.id=? GROUP BY ci.product_id",
                    row -> { signals.merge(row.getInt("product_id"), 3.0, Double::sum); }, userId);
            jdbc.query("SELECT oi.product_id FROM order_item oi JOIN order_details od ON od.id=oi.order_id WHERE od.user_id=? AND od.status='Delivered' AND od.created_at>=? GROUP BY oi.product_id",
                    row -> { signals.merge(row.getInt("product_id"), 5.0, Double::sum); }, userId,
                    Timestamp.from(Instant.now().minusSeconds(180L * 86400)));
        }
        var available = embeddings.enabled() ? vectors(documents) : Map.<Integer, Vector>of();
        double[] profile = new double[embeddings.dimensions()];
        boolean personalized = false;
        for (var signal : signals.entrySet()) {
            var vector = available.get(signal.getKey());
            if (vector == null) continue;
            personalized = true;
            for (int index = 0; index < profile.length; index++) profile[index] += vector.values()[index] * signal.getValue();
        }
        Map<Integer, Double> popular = new HashMap<>();
        personalized = personalized && Ranking.valid(profile, embeddings.dimensions());
        jdbc.query("SELECT oi.product_id, COUNT(DISTINCT od.id) AS orders_count FROM order_item oi JOIN order_details od ON od.id=oi.order_id WHERE od.status='Delivered' AND od.created_at>=? GROUP BY oi.product_id",
                row -> { popular.put(row.getInt("product_id"), row.getDouble("orders_count")); },
                Timestamp.from(Instant.now().minusSeconds(90L * 86400)));
        List<Scored> scored = new ArrayList<>();
        for (var document : documents) {
            var product = document.product();
            if (product.getId().equals(similarTo) || product.getVariants().stream().noneMatch(variant -> variant.getQuantity() != null && variant.getQuantity() > 0)) continue;
            var vector = available.get(product.getId());
            if (personalized && vector == null) continue;
            double score = personalized ? Ranking.cosine(profile, vector.values()) : popular.getOrDefault(product.getId(), 0.0);
            scored.add(new Scored(product, score));
        }
        scored.sort(Comparator.comparingDouble(Scored::score).reversed().thenComparing(item -> item.product().getId(), Comparator.reverseOrder()));
        return page(scored, 1, limit, personalized ? similarTo == null ? "personalized" : "similar" : "popular",
                personalized ? null : !embeddings.enabled() ? "AI_DISABLED" : signals.isEmpty() ? "NO_HISTORY" : "INDEX_NOT_READY");
    }

    private Result page(List<Scored> items, int page, int size, String mode, String reason) {
        long offset = (long) (page - 1) * size;
        return new Result(items.stream().skip(offset).limit(size).map(Scored::product).toList(), items.size(), page, size, mode, reason, Map.of());
    }

    @PreDestroy
    public void close() { worker.shutdownNow(); }
}
