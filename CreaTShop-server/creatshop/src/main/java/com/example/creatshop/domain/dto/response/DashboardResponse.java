package com.example.creatshop.domain.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(LocalDate fromDate, LocalDate toDate, String timezone,
        long ordersCreated, long paidOrders, BigDecimal paidOrderValue, BigDecimal averagePaidOrderValue,
        Backlog backlog, Catalog catalog, List<Day> days) {
    public record Day(LocalDate date, long ordersCreated, BigDecimal paidOrderValue) {}
    public record Backlog(long readyToShip, long shipped, long codUncollected, long refundRequired) {}
    public record Catalog(long customers, long activeCustomers, long products, long categories,
            long lowStockVariants, long outOfStockVariants, long totalStockUnits, long productsWithoutVariants) {}
}
