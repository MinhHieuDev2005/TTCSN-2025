package com.example.creatshop.service;

import com.example.creatshop.domain.dto.response.DashboardResponse;
import com.example.creatshop.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(LocalDate fromDate, LocalDate toDate) {
        LocalDate end = toDate == null ? LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")) : toDate;
        LocalDate start = fromDate == null ? end.minusDays(29) : fromDate;
        if (start.getYear() < 1970 || end.getYear() > 9999 || end.isBefore(start) || ChronoUnit.DAYS.between(start, end) > 365) {
            throw new BadRequestException("exception.dashboard.date-range");
        }
        Timestamp lower = Timestamp.valueOf(start.atStartOfDay());
        Timestamp upper = Timestamp.valueOf(end.plusDays(1).atStartOfDay());
        String paid = "p.status = 'COMPLETED' AND COALESCE(o.status, 'Processing') <> 'Canceled'";
        String joins = " FROM order_details o LEFT JOIN payment_details p ON p.order_id = o.id ";
        long created = count("SELECT COUNT(*) FROM order_details WHERE created_at >= ? AND created_at < ?", lower, upper);
        long paidCount = count("SELECT COUNT(*)" + joins + "WHERE " + paid + " AND o.created_at >= ? AND o.created_at < ?", lower, upper);
        BigDecimal value = jdbc.queryForObject("SELECT COALESCE(SUM(o.total),0)" + joins + "WHERE " + paid
                + " AND o.created_at >= ? AND o.created_at < ?", BigDecimal.class, lower, upper);
        var grouped = jdbc.query("SELECT CAST(o.created_at AS DATE) AS order_day, COUNT(*) AS created, "
                + "COALESCE(SUM(CASE WHEN " + paid + " THEN o.total ELSE 0 END),0) AS paid_value" + joins
                + "WHERE o.created_at >= ? AND o.created_at < ? GROUP BY CAST(o.created_at AS DATE)",
                (row, index) -> {
                    String dayStr = row.getString("order_day");
                    LocalDate date = dayStr != null && dayStr.length() >= 10
                            ? LocalDate.parse(dayStr.substring(0, 10))
                            : row.getDate("order_day").toLocalDate();
                    return new DashboardResponse.Day(date, row.getLong("created"), row.getBigDecimal("paid_value"));
                }, lower, upper);
        var byDate = new java.util.HashMap<LocalDate, DashboardResponse.Day>();
        grouped.forEach(day -> byDate.put(day.date(), day));
        var days = new ArrayList<DashboardResponse.Day>();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            days.add(byDate.getOrDefault(date, new DashboardResponse.Day(date, 0, BigDecimal.ZERO)));
        }
        var backlog = new DashboardResponse.Backlog(
                count("SELECT COUNT(*)" + joins + "WHERE o.status = 'Processing' AND (p.status = 'COMPLETED' OR (p.provider = 'COD' AND p.status = 'PENDING'))"),
                count("SELECT COUNT(*) FROM order_details WHERE status = 'Shipped'"),
                count("SELECT COUNT(*)" + joins + "WHERE o.status = 'Delivered' AND p.provider = 'COD' AND p.status = 'PENDING'"),
                count("SELECT COUNT(*) FROM payment_details WHERE status = 'REFUND_REQUIRED'"));
        var catalog = new DashboardResponse.Catalog(
                count("SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_type = 'ROLE_USER'"),
                count("SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_type = 'ROLE_USER' AND u.status = 'ACTIVE'"),
                count("SELECT COUNT(*) FROM products"), count("SELECT COUNT(*) FROM categories"),
                count("SELECT COUNT(*) FROM product_info WHERE quantity BETWEEN 1 AND 5"),
                count("SELECT COUNT(*) FROM product_info WHERE quantity = 0"),
                count("SELECT COALESCE(SUM(quantity), 0) FROM product_info"),
                count("SELECT COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_info v WHERE v.product_id = p.id)"));
        return new DashboardResponse(start, end, "Asia/Ho_Chi_Minh", created, paidCount, value,
                paidCount == 0 ? BigDecimal.ZERO : value.divide(BigDecimal.valueOf(paidCount), 2, RoundingMode.HALF_UP), backlog, catalog, days);
    }

    private long count(String sql, Object... parameters) {
        return jdbc.queryForObject(sql, Long.class, parameters);
    }
}
