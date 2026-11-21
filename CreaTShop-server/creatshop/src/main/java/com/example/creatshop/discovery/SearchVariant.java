package com.example.creatshop.discovery;

import com.example.creatshop.exception.BadRequestException;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

public record SearchVariant(String color, String size, int quantity) {
    private static final Pattern COLOR = Pattern.compile("\\b(?:mau|color|colour)\\s+([a-z]+(?:\\s+(?:duong|la|cay|dam|nhat))?)\\b");
    private static final Pattern SIZE = Pattern.compile("\\b(?:size|kich co)\\s+([a-z0-9]+(?:[.,]\\d+)?)\\b");
    private static final Pattern QUANTITY = Pattern.compile("(?<![\\w.,+-])(-?\\d+(?:[.,]\\d+)?)\\s*(?:doi|cai|chiec|bo|san pham|pairs?|items?)\\b");
    private static final Map<String, String> COLORS = Map.ofEntries(
            Map.entry("den", "black"), Map.entry("trang", "white"), Map.entry("do", "red"),
            Map.entry("xanh duong", "blue"), Map.entry("xanh la", "green"), Map.entry("xanh la cay", "green"),
            Map.entry("vang", "yellow"), Map.entry("hong", "pink"), Map.entry("tim", "purple"),
            Map.entry("nau", "brown"), Map.entry("xam", "gray"), Map.entry("ghi", "gray"),
            Map.entry("grey", "gray"), Map.entry("be", "beige"), Map.entry("cam", "orange"));

    public static SearchVariant parse(String query) {
        String text = Ranking.normalize(query);
        if (Pattern.compile("\\b(?:khong|ngoai tru|not|except)\\s+(?:chon\\s+|lay\\s+)?(?:mau|size|kich co)\\b").matcher(text).find())
            throw new BadRequestException("exception.discovery.invalid-search");
        String normalized = java.text.Normalizer.normalize(query.toLowerCase(Locale.ROOT), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('\u0111', 'd');
        var color = COLOR.matcher(text);
        var size = SIZE.matcher(normalized);
        var quantity = QUANTITY.matcher(normalized);
        int minimum = 0;
        if (quantity.find()) {
            try { minimum = Integer.parseInt(quantity.group(1)); }
            catch (NumberFormatException exception) { throw new BadRequestException("exception.discovery.invalid-search"); }
            if (minimum < 1 || minimum > 1000000) throw new BadRequestException("exception.discovery.invalid-search");
        }
        return new SearchVariant(color.find() ? canonicalColor(color.group(1)) : "",
                size.find() ? size.group(1).replace(',', '.').toUpperCase(Locale.ROOT) : "", minimum);
    }

    public static String canonicalColor(String value) {
        String normalized = Ranking.normalize(value);
        return COLORS.getOrDefault(normalized, normalized);
    }
}
