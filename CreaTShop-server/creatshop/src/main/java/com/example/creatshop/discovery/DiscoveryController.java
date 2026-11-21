package com.example.creatshop.discovery;

import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(Endpoint.V1.PREFIX)
public class DiscoveryController {
    public record View(@NotNull(message = "exception.discovery.invalid-product") @Min(value = 1, message = "exception.discovery.invalid-product") Integer productId) {}
    private final DiscoveryService discovery;

    public DiscoveryController(DiscoveryService discovery) { this.discovery = discovery; }

    private <T> GlobalResponse<Meta, T> ok(T data) {
        return GlobalResponse.<Meta, T>builder().meta(Meta.builder().status(Status.SUCCESS).build()).data(data).build();
    }

    @GetMapping("/products/search")
    public GlobalResponse<Meta, DiscoveryService.Result> search(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) List<Integer> categoryIds,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "") String color,
            @RequestParam(defaultValue = "") String sizeFilter,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(defaultValue = "relevance") String sort,
            @RequestParam(defaultValue = "hybrid") String mode,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ok(discovery.search(q.trim(), categoryIds, minPrice, maxPrice, color, sizeFilter, inStock, sort, mode, page, size));
    }

    @PostMapping("/interactions")
    public ResponseEntity<Void> view(@Valid @RequestBody View request, Principal principal) {
        discovery.view(principal.getName(), request.productId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/recommendations/me")
    public GlobalResponse<Meta, DiscoveryService.Result> mine(Principal principal, @RequestParam(defaultValue = "8") int limit) {
        return ok(discovery.recommendations(principal.getName(), null, limit));
    }

    @GetMapping("/recommendations/popular")
    public GlobalResponse<Meta, DiscoveryService.Result> popular(@RequestParam(defaultValue = "8") int limit) {
        return ok(discovery.recommendations(null, null, limit));
    }

    @GetMapping("/products/{id}/similar")
    public GlobalResponse<Meta, DiscoveryService.Result> similar(@PathVariable Integer id, @RequestParam(defaultValue = "4") int limit) {
        return ok(discovery.recommendations(null, id, limit));
    }

    @GetMapping("/admin/ai/status")
    public GlobalResponse<Meta, Map<String, Object>> status() { return ok(discovery.status()); }

    @PostMapping("/admin/ai/reindex")
    public ResponseEntity<GlobalResponse<Meta, Map<String, Object>>> reindex() {
        boolean started = discovery.startIndex();
        return ResponseEntity.status(started ? 202 : 409).body(ok(Map.of("started", started)));
    }
}
