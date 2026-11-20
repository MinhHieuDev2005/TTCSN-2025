package com.example.creatshop.discovery;

import com.example.creatshop.constant.CategoryType;

import java.text.Normalizer;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class SearchAudience {
    private static final Pattern TERMS = Pattern.compile("\\b(?:"
            + "(?<boy>be trai|(?:tre em|em be|tre|be) nam|boys?)"
            + "|(?<girl>be gai|(?:tre em|em be|tre|be) nu|girls?)"
            + "|(?<child>tre em|tre nho|em be|(?<=cho )be|kids?|children|bab(?:y|ies)|toddlers?)"
            + "|(?<adult>nguoi lon|adults?)"
            + "|(?<woman>nu|women|womens|woman|female)"
            + "|(?<man>nam|men|mens|man|male))\\b");
    private static final Pattern AMBIGUOUS = Pattern.compile("\\b(khong|ko|not|without|except|exclude|excluding|tru|unisex)\\b");

    private SearchAudience() {}

    public static Set<CategoryType> parse(String query) {
        String original = Normalizer.normalize(query, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
        String normalized = Ranking.normalize(original).replaceAll("\\bviet nam\\b", "vietnam");
        if (!Pattern.compile("(?U)\\bnam\\b").matcher(original).find()) normalized = normalized.replaceAll("\\bnam\\b", "");
        if (!Pattern.compile("(?U)\\b(?:nu|n\u1eef)\\b").matcher(original).find()) normalized = normalized.replaceAll("\\bnu\\b", "");
        String constraints = normalized.replaceAll("\\bkhong (?:qua|hon) (?=\\d)", "");
        if (AMBIGUOUS.matcher(constraints).find()) return Set.of();
        EnumSet<CategoryType> result = EnumSet.noneOf(CategoryType.class);
        var matcher = TERMS.matcher(normalized);
        while (matcher.find()) {
            if (matcher.group("boy") != null) result.add(CategoryType.BOY);
            else if (matcher.group("girl") != null) result.add(CategoryType.GIRL);
            else if (matcher.group("child") != null) result.addAll(EnumSet.of(CategoryType.BOY, CategoryType.GIRL));
            else if (matcher.group("adult") != null) result.addAll(EnumSet.of(CategoryType.MEN, CategoryType.WOMEN));
            else if (matcher.group("woman") != null) result.add(CategoryType.WOMEN);
            else result.add(CategoryType.MEN);
        }
        return result;
    }
}
