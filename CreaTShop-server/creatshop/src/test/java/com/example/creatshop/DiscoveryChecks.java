package com.example.creatshop;

import com.example.creatshop.constant.CategoryType;
import com.example.creatshop.discovery.DiscoveryService;
import com.example.creatshop.discovery.Ranking;
import com.example.creatshop.discovery.SearchBudget;
import com.example.creatshop.discovery.SearchAudience;
import com.example.creatshop.discovery.SearchVariant;
import com.example.creatshop.domain.entity.Category;
import com.example.creatshop.domain.entity.Product;
import com.example.creatshop.domain.entity.ProductVariant;
import com.example.creatshop.repository.CategoryRepository;
import com.example.creatshop.repository.ProductRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

public class DiscoveryChecks {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static String base;
    private static int assertions;

    public static void main(String[] args) throws Exception {
        require(Ranking.normalize("\u00c1o \u0111\u1ecf").equals("ao do"), "Vietnamese normalization");
        require(Ranking.cosine(new double[]{1, 0}, new double[]{1, 0}) == 1, "Cosine identity");
        require(Ranking.cosine(new double[]{1}, new double[]{1, 0}) == 0, "Dimension mismatch");
        require(!Ranking.valid(new double[]{Double.NaN}, 1), "NaN vector rejection");
        require(SearchBudget.parse("ao duoi 300 nghin").maxPrice().compareTo(new BigDecimal("300000")) == 0, "Vietnamese budget");
        require(SearchBudget.parse("tu 200k den 500k").minPrice().intValueExact() == 200000, "Budget range");
        require(SearchBudget.parse("toi da 1,5 trieu").maxPrice().intValueExact() == 1500000, "Decimal budget");
        require(SearchBudget.parse("duoi 300.000 dong").maxPrice().intValueExact() == 300000, "Thousands separator");
        var intent = SearchVariant.parse("giay mau \u0111en size 38, can mua 3 \u0111oi duoi 700 nghin");
        require(intent.color().equals("black") && intent.size().equals("38") && intent.quantity() == 3, "Combined variant intent");
        require(SearchVariant.parse("ao mau xanh duong kich co XL 2 cai").color().equals("blue"), "Compound color");
        require(SearchVariant.parse("giay co 3 mau tu 200k den 500k").size().isEmpty(), "Do not confuse co with size");
        require(SearchVariant.parse("giay duoi 700 nghin").quantity() == 0, "Price is not quantity");
        require(SearchAudience.parse("gi\u00e0y n\u1eef \u0111i l\u00e0m").equals(Set.of(CategoryType.WOMEN)), "Women's work shoes audience");
        require(SearchAudience.parse("giay nu di lam").equals(Set.of(CategoryType.WOMEN)), "Unaccented audience");
        require(SearchAudience.parse("GI\u00c0Y N\u1eee").equals(Set.of(CategoryType.WOMEN)), "Uppercase audience");
        require(SearchAudience.parse("giay be gai").equals(Set.of(CategoryType.GIRL)), "Girls are not adult women");
        require(SearchAudience.parse("giay tre em nu").equals(Set.of(CategoryType.GIRL)), "Child phrase takes precedence");
        require(SearchAudience.parse("giay cho be trai").equals(Set.of(CategoryType.BOY)), "Boys are not adult men");
        require(SearchAudience.parse("giay cho be").equals(Set.of(CategoryType.BOY, CategoryType.GIRL)), "Generic child audience");
        require(SearchAudience.parse("giay nguoi lon").equals(Set.of(CategoryType.MEN, CategoryType.WOMEN)), "Adult audience");
        require(SearchAudience.parse("sandal nam va nu").equals(Set.of(CategoryType.MEN, CategoryType.WOMEN)), "Multiple audiences use union");
        require(SearchAudience.parse("sandal be trai va be gai").equals(Set.of(CategoryType.BOY, CategoryType.GIRL)), "Multiple child audiences");
        require(SearchAudience.parse("women work shoes").equals(Set.of(CategoryType.WOMEN)), "English women boundary");
        require(SearchAudience.parse("boys sneakers").equals(Set.of(CategoryType.BOY)), "English boys boundary");
        require(SearchAudience.parse("giay nu khong qua 500k").equals(Set.of(CategoryType.WOMEN)), "Budget negation does not suppress audience");
        for (String ambiguous : List.of("giay khong danh cho nu", "giay unisex", "not women shoes", "giay nam ngoai tru tre em"))
            require(SearchAudience.parse(ambiguous).isEmpty(), "Ambiguous audience is not hard filtered: " + ambiguous);
        for (String neutral : List.of("sandal", "summer shirt", "giay Viet Nam", "giay mau n\u0103m 2026", "giay chong n\u1ea5m", "giay hoa tiet n\u1ee5 hoa"))
            require(SearchAudience.parse(neutral).isEmpty(), "Whole-word audience without accent collisions: " + neutral);
        AtomicBoolean failing = new AtomicBoolean();
        HttpServer encoder = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        encoder.createContext("/embed", exchange -> {
            if (exchange.getRequestHeaders().getFirst("Transfer-Encoding") != null
                    || exchange.getRequestHeaders().getFirst("Content-Length") == null) {
                exchange.sendResponseHeaders(413, -1); exchange.close(); return;
            }
            if (failing.get()) { exchange.sendResponseHeaders(503, -1); exchange.close(); return; }
            var request = JSON.readTree(exchange.getRequestBody());
            List<double[]> vectors = new ArrayList<>();
            for (var text : request.path("texts")) {
                double[] vector = new double[384];
                vector[text.asText().contains("winter") ? 1 : 0] = 1;
                vectors.add(vector);
            }
            byte[] body = JSON.writeValueAsBytes(Map.of("modelVersion", "multilingual-e5-small-v1", "vectors", vectors));
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        encoder.start();
        try (var context = new SpringApplicationBuilder(CreatshopApplication.class).run(
                "--spring.config.location=optional:classpath:/discovery-only.properties", "--server.address=127.0.0.1", "--server.port=0",
                "--spring.datasource.url=jdbc:h2:mem:discovery;MODE=MySQL;DB_CLOSE_DELAY=-1", "--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.datasource.username=sa", "--spring.datasource.password=", "--spring.jpa.hibernate.ddl-auto=create-drop",
                "--spring.main.banner-mode=off", "--debug=false", "--logging.level.root=ERROR", "--logging.level.org.hibernate.SQL=ERROR", "--cloudinary.cloud_name=isolated",
                "--cloudinary.api_key=isolated", "--cloudinary.api_secret=isolated", "--vnp.tmn-code=TEST", "--vnp.hash-secret=test",
                "--vnp.url=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html", "--vnp.return-url=http://localhost/payment-return",
                "--auth.token.jwtSecret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=", "--auth.token.expirationInMils=3600000",
                "--auth.token.refreshInMils=7200000", "--ai.enabled=true", "--ai.index-initial-delay-ms=3600000",
                "--ai.url=http://127.0.0.1:" + encoder.getAddress().getPort())) {
            base = "http://127.0.0.1:" + ((ServletWebServerApplicationContext) context).getWebServer().getPort() + "/api/v1";
            var jdbc = context.getBean(JdbcTemplate.class);
            String migration = Files.readString(Path.of("database/20261116-ai-discovery.sql"));
            for (String statement : migration.substring(migration.indexOf("CREATE TABLE product_embeddings")).split(";"))
                if (!statement.isBlank()) jdbc.execute(statement);
            var category = context.getBean(CategoryRepository.class).save(Category.builder().name("Clothes").type(CategoryType.MEN).build());
            var repository = context.getBean(ProductRepository.class);
            var summer = repository.save(product("linen shirt", "lightweight", category, 200000, "blue", "M"));
            var winter = repository.save(product("winter coat", "warm", category, 500000, "red", "L"));
            var mixed = product("mixed shirt", "lightweight", category, 250000, "blue", "M");
            mixed.getProductVariants().get(0).setQuantity(0);
            mixed.addVariant(ProductVariant.builder().color("red").size("L").quantity(5).build());
            repository.save(mixed);
            call("GET", "/recommendations/me", null, null, 401);
            call("POST", "/interactions", Map.of("productId", summer.getId()), null, 401);
            call("GET", "/admin/ai/status", null, null, 401);
            String first = signup("discoveryone", "one@example.test");
            String second = signup("discoverytwo", "two@example.test");
            call("GET", "/admin/ai/status", null, first, 403);
            call("POST", "/admin/ai/reindex", Map.of(), first, 403);
            var before = call("GET", "/products/search?q=shirt", null, null, 200).path("data");
            require(before.path("mode").asText().equals("keyword") && before.path("fallbackReason").asText().equals("INDEX_NOT_READY"), "Unindexed fallback");
            var service = context.getBean(DiscoveryService.class);
            require(service.startIndex(), "Index accepted");
            for (int count = 0; count < 100 && (boolean) service.status().get("running"); count++) Thread.sleep(100);
            require(service.status().get("indexed").equals(3), "All documents indexed");
            var semantic = call("GET", "/products/search?q=summer&maxPrice=220000", null, null, 200).path("data");
            require(semantic.path("mode").asText().equals("hybrid") && semantic.path("items").size() == 1
                    && semantic.path("items").get(0).path("id").asInt() == summer.getId(), "Semantic search with hard price filter");
            var natural = call("GET", "/products/search?q=shirt%20duoi%20300%20nghin", null, null, 200).path("data");
            require(natural.path("appliedFilters").path("maxPrice").asInt() == 300000 && natural.path("totalItems").asInt() == 2, "Natural budget is enforced");
            require(call("GET", "/products/search?color=blue&sizeFilter=L&inStock=true", null, null, 200).path("data").path("items").isEmpty(), "Same-variant filtering");
            var variantSearch = call("GET", "/products/search?q=shirt+mau+do+size+L+3+cai&mode=keyword", null, null, 200).path("data");
            require(variantSearch.path("items").size() == 1, "Natural variant filters return matching product");
            require(variantSearch.path("appliedFilters").path("minQuantity").asInt() == 3, "Quantity filter is reported");
            require(call("GET", "/products/search?q=shirt+mau+blue+size+L+3+cai", null, null, 200).path("data").path("items").isEmpty(), "Natural conditions must match the same variant");
            require(call("GET", "/products/search?q=shirt+mau+do+size+L+6+cai&maxPrice=300000", null, null, 200).path("data").path("items").isEmpty(), "Do not sum variant stock");
            call("GET", "/products/search?q=shirt+0+cai", null, null, 400);
            call("GET", "/products/search?q=shirt+-3+cai", null, null, 400);
            call("GET", "/products/search?q=shirt+1.5+cai", null, null, 400);
            call("GET", "/products/search?q=shirt+khong+mau+do", null, null, 400);
            var override = call("GET", "/products/search?q=shirt+mau+do+size+L+3+cai&color=blue&sizeFilter=M", null, null, 200).path("data");
            require(override.path("items").size() == 1 && override.path("appliedFilters").path("color").asText().equals("blue"), "Explicit filters override inferred ones");
            call("GET", "/products/search?q=shirt+999999999999999999+cai", null, null, 400);
            require(call("GET", "/products/search?page=2&size=2", null, null, 200).path("data").path("items").size() == 1, "Server pagination");
            var unavailable = product("unavailable shoes", "", category, 100000, "black", "M");
            unavailable.getProductVariants().get(0).setQuantity(0);
            repository.save(unavailable);
            var catalogPage = call("GET", "/products/search?size=2", null, null, 200).path("data");
            require(catalogPage.path("totalItems").asInt() == 4, "Default catalog retains unavailable products");
            for (var item : catalogPage.path("items")) require(item.path("id").asInt() != unavailable.getId(), "Availability sorted before pagination");
            require(call("GET", "/products/search?size=2&page=2", null, null, 200).path("data").path("items").get(1).path("id").asInt() == unavailable.getId(), "Unavailable items follow available items across pages");
            require(call("GET", "/products/search?inStock=true", null, null, 200).path("data").path("totalItems").asInt() == 3, "Explicit availability filter excludes unavailable items");
            require(call("GET", "/products/search?sort=asc", null, null, 200).path("data").path("items").get(0).path("id").asInt() == unavailable.getId(), "Explicit price order is preserved");
            require(call("GET", "/products/search?q=unavailable&mode=keyword", null, null, 200).path("data").path("items").get(0).path("id").asInt() == unavailable.getId(), "Search still returns matching unavailable items");
            repository.delete(unavailable);
            call("GET", "/products/search?minPrice=500&maxPrice=1", null, null, 400);
            call("GET", "/products/search?page=0", null, null, 400);
            call("POST", "/interactions", Map.of("productId", -1), first, 400);
            call("POST", "/interactions", Map.of("productId", 999999), first, 404);
            call("POST", "/interactions", Map.of("productId", summer.getId(), "userId", "spoof", "eventType", "PURCHASE"), first, 204);
            call("POST", "/interactions", Map.of("productId", summer.getId()), first, 204);
            require(jdbc.queryForObject("SELECT COUNT(*) FROM user_interactions", Integer.class) == 1, "View deduplication");
            var mine = call("GET", "/recommendations/me", null, first, 200).path("data");
            require(mine.path("mode").asText().equals("personalized") && mine.path("items").get(0).path("id").asInt() != winter.getId(), "Personalized profile");
            require(call("GET", "/recommendations/me", null, second, 200).path("data").path("mode").asText().equals("popular"), "New user isolation");
            call("POST", "/interactions", Map.of("productId", winter.getId()), second, 204);
            require(call("GET", "/recommendations/me", null, second, 200).path("data").path("items").get(0).path("id").asInt() == winter.getId(), "Different profile gives different ranking");
            var similar = call("GET", "/products/" + summer.getId() + "/similar", null, null, 200).path("data");
            require(similar.path("mode").asText().equals("similar") && similar.path("items").get(0).path("id").asInt() != summer.getId(), "Similar excludes source");
            require(call("GET", "/products/search?q=shirt&mode=keyword", null, null, 200).path("data").path("mode").asText().equals("keyword"), "Explicit keyword baseline");
            require(call("GET", "/products/search?q=summer&mode=semantic", null, null, 200).path("data").path("mode").asText().equals("semantic"), "Explicit semantic baseline");
            call("POST", "/carts", Map.of("productId", winter.getId(), "variantId", winter.getProductVariants().get(0).getId(), "quantity", 1), first, 201);
            require(call("GET", "/recommendations/me", null, first, 200).path("data").path("items").get(0).path("id").asInt() == winter.getId(), "Server cart signal changes profile");
            var buyer = context.getBean(com.example.creatshop.repository.UserRepository.class).findByUsername("discoverytwo").orElseThrow();
            var orders = context.getBean(com.example.creatshop.repository.OrderDetailRepository.class);
            var delivered = orders.save(com.example.creatshop.domain.entity.OrderDetail.builder().user(buyer)
                    .status(com.example.creatshop.constant.OrderStatus.Delivered).build());
            var orderItems = context.getBean(com.example.creatshop.repository.OrderItemRepository.class);
            var purchase = orderItems.save(com.example.creatshop.domain.entity.OrderItem.builder().orderDetail(delivered)
                    .product(summer).variant(summer.getProductVariants().get(0)).quantity(1).unitPrice(summer.getPrice()).build());
            require(call("GET", "/recommendations/popular", null, null, 200).path("data").path("items").get(0).path("id").asInt() == summer.getId(), "Delivered order popularity");
            require(call("GET", "/recommendations/me", null, second, 200).path("data").path("items").get(0).path("id").asInt() != winter.getId(), "Delivered order personalization");
            delivered.setStatus(com.example.creatshop.constant.OrderStatus.Canceled);
            orders.save(delivered);
            require(call("GET", "/recommendations/me", null, second, 200).path("data").path("items").get(0).path("id").asInt() == winter.getId(), "Canceled orders excluded from profile");
            orderItems.deleteById(purchase.getId());
            orders.deleteById(delivered.getId());
            failing.set(true);
            require(call("GET", "/products/search?q=shirt", null, null, 200).path("data").path("fallbackReason").asText().equals("AI_UNAVAILABLE"), "AI outage fallback");
            summer.setDescription("updated description");
            repository.save(summer);
            require(service.status().get("indexed").equals(2), "Stale embeddings are ignored");
            require(call("GET", "/products/search?q=shirt", null, null, 200).path("data").path("fallbackReason").asText().equals("INDEX_NOT_READY"), "Stale index fallback");
            jdbc.update("UPDATE product_embeddings SET embedding='[0]' WHERE product_id=?", winter.getId());
            require(service.status().get("indexed").equals(1), "Invalid vector is ignored");
            var women = context.getBean(CategoryRepository.class).save(Category.builder().name("Shoes").type(CategoryType.WOMEN).build());
            var girls = context.getBean(CategoryRepository.class).save(Category.builder().name("Shoes").type(CategoryType.GIRL).build());
            var womanShoes = repository.save(product("women work shoes nu", "office", women, 300000, "black", "M"));
            var girlShoes = repository.save(product("girls shoes be gai", "school", girls, 150000, "black", "M"));
            for (String mode : List.of("keyword", "semantic", "hybrid")) {
                var audienceSearch = call("GET", "/products/search?q=giay+nu+di+lam&mode=" + mode, null, null, 200).path("data");
                require(audienceSearch.path("items").size() == 1 && audienceSearch.path("items").get(0).path("id").asInt() == womanShoes.getId(), "Audience respected even in fallback: " + mode);
                require(audienceSearch.path("appliedFilters").path("audiences").get(0).asText().equals("WOMEN"), "Inferred audience exposed");
            }
            require(call("GET", "/products/search?q=giay+nu&categoryIds=" + girls.getId(), null, null, 200).path("data").path("items").isEmpty(), "Audience intersects explicit categories");
            require(call("GET", "/products/search?q=giay+nu+duoi+200k", null, null, 200).path("data").path("items").isEmpty(), "Audience intersects budget");
            var childSearch = call("GET", "/products/search?q=giay+be+gai", null, null, 200).path("data");
            require(childSearch.path("items").size() == 1 && childSearch.path("items").get(0).path("id").asInt() == girlShoes.getId(), "Child search excludes adult women");
            var priceSearch = call("GET", "/products/search?q=giay+nu+khong+qua+500k", null, null, 200).path("data");
            require(priceSearch.path("items").size() == 1 && priceSearch.path("appliedFilters").path("maxPrice").asInt() == 500000, "Audience and non-exceeding budget combine");
            require(call("GET", "/products/" + summer.getId(), null, null, 200).path("data").path("description").asText().equals("updated description"), "Metadata roundtrip");
            jdbc.update("DELETE FROM product_info WHERE product_id=?", summer.getId());
            repository.deleteById(summer.getId());
            require(jdbc.queryForObject("SELECT COUNT(*) FROM user_interactions WHERE product_id=?", Integer.class, summer.getId()) == 0, "Deleted product cascades interactions");
            System.out.println("PASS: " + assertions + " discovery assertions on isolated H2 and a fake encoder; no model-quality claims.");
        } finally {
            encoder.stop(0);
        }
    }

    private static Product product(String name, String description, Category category, int price, String color, String size) {
        var product = Product.builder().name(name).description(description).material("fabric").style("casual").occasion("daily")
                .price(BigDecimal.valueOf(price)).category(category).imageStaticUrl("static").imageDynamicUrl("dynamic").build();
        product.addVariant(ProductVariant.builder().color(color).size(size).quantity(10).build());
        return product;
    }

    private static String signup(String username, String email) throws Exception {
        call("POST", "/users", Map.of("username", username, "password", "Review9!Pass", "firstName", "Test", "lastName", "Buyer",
                "email", email, "phoneNumber", username.endsWith("one") ? "0900000001" : "0900000002"), null, 201);
        return call("POST", "/auths/login", Map.of("username", username, "password", "Review9!Pass"), null, 200).path("data").path("accessToken").asText();
    }

    private static JsonNode call(String method, String path, Object body, String token, int expected) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(base + path)).timeout(Duration.ofSeconds(15)).header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)));
        if (token != null) request.header("Authorization", "Bearer " + token);
        var response = HTTP.send(request.build(), HttpResponse.BodyHandlers.ofString());
        require(response.statusCode() == expected, method + " " + path + ": expected " + expected + ", got " + response.statusCode() + " " + response.body());
        return response.body().isBlank() ? JSON.nullNode() : JSON.readTree(response.body());
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
        assertions++;
    }
}
