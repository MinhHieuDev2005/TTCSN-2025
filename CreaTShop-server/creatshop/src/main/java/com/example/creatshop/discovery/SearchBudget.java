package com.example.creatshop.discovery;

import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public record SearchBudget(BigDecimal minPrice, BigDecimal maxPrice) {
    private static final String AMOUNT = "(\\d+(?:[.,]\\d+)?)\\s*(trieu|nghin|ngan|k|vnd|dong)?\\b";
    private static final Pattern RANGE = Pattern.compile("\\btu\\s+" + AMOUNT + "\\s+den\\s+" + AMOUNT);
    private static final Pattern UPPER = Pattern.compile("\\b(?:duoi|toi da|khong qua)\\s+" + AMOUNT);
    private static final Pattern LOWER = Pattern.compile("\\b(?:tren|toi thieu)\\s+" + AMOUNT);

    public static SearchBudget parse(String query) {
        String text = java.text.Normalizer.normalize(query, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(java.util.Locale.ROOT).replace('\u0111', 'd')
                .replaceAll("(?<=\\d)[.,](?=\\d{3}(?:\\D|$))", "").replace(',', '.');
        Matcher range = RANGE.matcher(text);
        if (range.find()) return new SearchBudget(amount(range.group(1), range.group(2)), amount(range.group(3), range.group(4)));
        Matcher upper = UPPER.matcher(text);
        Matcher lower = LOWER.matcher(text);
        return new SearchBudget(lower.find() ? amount(lower.group(1), lower.group(2)) : null,
                upper.find() ? amount(upper.group(1), upper.group(2)) : null);
    }

    private static BigDecimal amount(String value, String unit) {
        BigDecimal multiplier = "trieu".equals(unit) ? BigDecimal.valueOf(1000000)
                : unit != null && java.util.Set.of("nghin", "ngan", "k").contains(unit) ? BigDecimal.valueOf(1000) : BigDecimal.ONE;
        return new BigDecimal(value).multiply(multiplier);
    }
}
